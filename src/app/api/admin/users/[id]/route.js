import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  requireAdminRequest,
  setAdminSessionCookie,
} from "../../../../lib/admin-auth";
import { updateAdminAccount } from "../../../../lib/admin-accounts";
import { accountErrorResponse } from "../../../../lib/admin-credentials";
export const runtime = "nodejs";
export async function PATCH(request, { params }) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const user = await updateAdminAccount(
      prisma,
      auth.session,
      (await params).id,
      await request.json(),
    );
    const response = NextResponse.json({ ok: true, user });
    return user.id === auth.session.id
      ? setAdminSessionCookie(response, user)
      : response;
  } catch (error) {
    return accountErrorResponse(error);
  }
}
