import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  requireAdminRequest,
  setAdminSessionCookie,
} from "../../../../lib/admin-auth";
import { changeOwnPassword } from "../../../../lib/admin-accounts";
import {
  accountErrorResponse,
  limitCredentials,
} from "../../../../lib/admin-credentials";
export const runtime = "nodejs";
export async function POST(request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const limited = await limitCredentials(
    request,
    "admin-password",
    auth.session.id,
  );
  if (limited) return limited;
  try {
    const user = await changeOwnPassword(
      prisma,
      auth.session,
      await request.json(),
    );
    return setAdminSessionCookie(NextResponse.json({ ok: true }), user);
  } catch (error) {
    return accountErrorResponse(error);
  }
}
