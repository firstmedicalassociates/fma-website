import { NextResponse } from "next/server";
import { prisma } from "./prisma.js";
import {
  hasPermission,
  isSameOrigin,
  permissionForRequest,
} from "./admin-permissions.mjs";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signAdminSession,
  verifyAdminSession,
  sessionMatchesUser,
} from "./admin-session.mjs";
export { SESSION_COOKIE, signAdminSession, verifyAdminSession };
export const ADMIN_PUBLIC_SELECT = {
  id: true,
  email: true,
  role: true,
  permissions: true,
  isActive: true,
  mustChangePassword: true,
  sessionVersion: true,
  createdAt: true,
};
export async function resolveAdminSession(token, db = prisma) {
  const payload = verifyAdminSession(token);
  if (!payload) return null;
  const user = await db.adminUser.findUnique({
    where: { id: payload.sub },
    select: ADMIN_PUBLIC_SELECT,
  });
  return sessionMatchesUser(payload, user) ? { ...user, sub: user.id } : null;
}
export function getAdminSessionFromRequest(request) {
  return resolveAdminSession(request?.cookies?.get(SESSION_COOKIE)?.value);
}
export function adminError(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}
export async function requireAdminRequest(request, permission) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !isSameOrigin(request)
  )
    return {
      ok: false,
      response: adminError("Cross-origin request rejected.", 403),
    };
  const session = await getAdminSessionFromRequest(request);
  if (!session)
    return { ok: false, response: adminError("Please sign in again.", 401) };
  const required =
    permission ||
    permissionForRequest(new URL(request.url).pathname, request.method);
  if (!hasPermission(session, required))
    return {
      ok: false,
      response: adminError(
        session.mustChangePassword
          ? "Change your temporary password first."
          : "You do not have permission to do this.",
        403,
      ),
    };
  return { ok: true, session };
}
export function setAdminSessionCookie(response, user) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: signAdminSession(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
