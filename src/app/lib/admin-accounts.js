import bcrypt from "bcryptjs";
import {
  normalizeAdminEmail,
  normalizePermissions,
  validateAdminPassword,
  hasPermission,
} from "./admin-permissions.mjs";

export class AccountError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const ACCOUNT_SELECT = {
  id: true,
  email: true,
  role: true,
  permissions: true,
  isActive: true,
  mustChangePassword: true,
  sessionVersion: true,
  createdAt: true,
};

export async function withAccountLock(db, actor, action) {
  return db.$transaction(
    async (tx) => {
      // All account changes share this transaction lock, including last-admin checks.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(76410239)`;
      const current = await tx.adminUser.findUnique({
        where: { id: actor.id },
      });
      if (
        !current ||
        !current.isActive ||
        current.sessionVersion !== actor.sessionVersion
      )
        throw new AccountError("Please sign in again.", 401);
      return action(tx, current);
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
function requireFullAdmin(actor) {
  if (!hasPermission(actor, "admin"))
    throw new AccountError("Full administrator access is required.", 403);
}
function roleAndPermissions(body) {
  if (!["ADMIN", "SUB_ADMIN"].includes(body.role))
    throw new AccountError("Choose Full admin or Sub-admin.");
  const permissions = normalizePermissions(body.permissions ?? []);
  return {
    role: body.role,
    permissions: body.role === "ADMIN" ? [] : permissions,
  };
}
export async function createAdminAccount(db, actor, body) {
  const email = normalizeAdminEmail(body.email);
  const password = await bcrypt.hash(validateAdminPassword(body.password), 12);
  const access = roleAndPermissions(body);
  return withAccountLock(db, actor, async (tx, current) => {
    requireFullAdmin(current);
    if (
      await tx.adminUser.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      })
    )
      throw new AccountError("An account with that email already exists.", 409);
    return tx.adminUser.create({
      data: { email, password, ...access, mustChangePassword: true },
      select: ACCOUNT_SELECT,
    });
  });
}
export async function updateAdminAccount(db, actor, id, body) {
  const access = roleAndPermissions(body);
  if (typeof body.isActive !== "boolean")
    throw new AccountError("Choose an account status.");
  return withAccountLock(db, actor, async (tx, current) => {
    requireFullAdmin(current);
    const target = await tx.adminUser.findUnique({ where: { id } });
    if (!target) throw new AccountError("Account not found.", 404);
    if (current.id === id && !body.isActive)
      throw new AccountError("You cannot deactivate your own account.");
    if (
      target.role === "ADMIN" &&
      target.isActive &&
      (access.role !== "ADMIN" || !body.isActive)
    ) {
      if (
        (await tx.adminUser.count({
          where: { role: "ADMIN", isActive: true },
        })) <= 1
      )
        throw new AccountError("Keep at least one active full administrator.");
    }
    return tx.adminUser.update({
      where: { id },
      data: {
        ...access,
        isActive: body.isActive,
        sessionVersion: { increment: 1 },
      },
      select: ACCOUNT_SELECT,
    });
  });
}
export async function resetAdminPassword(db, actor, id, passwordValue) {
  const password = await bcrypt.hash(validateAdminPassword(passwordValue), 12);
  return withAccountLock(db, actor, async (tx, current) => {
    requireFullAdmin(current);
    if (id === current.id)
      throw new AccountError("Use My Account to change your own password.");
    if (
      !(await tx.adminUser.findUnique({ where: { id }, select: { id: true } }))
    )
      throw new AccountError("Account not found.", 404);
    return tx.adminUser.update({
      where: { id },
      data: {
        password,
        mustChangePassword: true,
        sessionVersion: { increment: 1 },
      },
      select: ACCOUNT_SELECT,
    });
  });
}
export async function changeOwnPassword(db, actor, body) {
  const nextPassword = validateAdminPassword(body.newPassword);
  if (body.confirmPassword !== nextPassword)
    throw new AccountError("The new passwords do not match.");
  if (
    typeof body.currentPassword !== "string" ||
    Buffer.byteLength(body.currentPassword) > 72
  )
    throw new AccountError("Enter your current password.");
  const password = await bcrypt.hash(nextPassword, 12);
  return withAccountLock(db, actor, async (tx, current) => {
    if (!(await bcrypt.compare(body.currentPassword, current.password)))
      throw new AccountError("Your current password is incorrect.");
    if (await bcrypt.compare(nextPassword, current.password))
      throw new AccountError("Choose a different password.");
    return tx.adminUser.update({
      where: { id: current.id },
      data: {
        password,
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
      select: ACCOUNT_SELECT,
    });
  });
}
