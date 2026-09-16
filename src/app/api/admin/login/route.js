import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { adminError, setAdminSessionCookie } from "../../../lib/admin-auth";
import {
  isSameOrigin,
  normalizeAdminEmail,
} from "../../../lib/admin-permissions.mjs";
import { limitCredentials } from "../../../lib/admin-credentials";
export const runtime = "nodejs";
export async function POST(request) {
  if (!isSameOrigin(request))
    return adminError("Cross-origin request rejected.", 403);
  const limited = await limitCredentials(request, "admin-login");
  if (limited) return limited;
  let email, password;
  try {
    const body = await request.json();
    email = normalizeAdminEmail(body.email);
    password = body.password;
    if (
      typeof password !== "string" ||
      !password ||
      Buffer.byteLength(password) > 72
    )
      return adminError("Invalid credentials.", 401);
  } catch {
    return adminError("Invalid credentials.", 401);
  }
  const user = await prisma.adminUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  // A fixed hash keeps missing-account checks on the same password-verification path.
  const valid = await bcrypt.compare(
    password,
    user?.password ||
      "$2a$12$KIX5xGFmZgJhPjBuOgRxhOe6NDPCKLXnHKKdWDdJBR87CVnrYuRTm",
  );
  if (!valid || !user?.isActive || !["ADMIN", "SUB_ADMIN"].includes(user.role))
    return adminError("Invalid credentials.", 401);
  return setAdminSessionCookie(
    NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
      redirect: user.mustChangePassword ? "/admin/account" : "/admin",
    }),
    user,
  );
}
