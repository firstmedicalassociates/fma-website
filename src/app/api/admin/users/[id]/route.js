import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  requireAdminRequest,
  setAdminSessionCookie,
} from "../../../../lib/admin-auth";
import {
  deleteAdminAccount,
  updateAdminAccount,
} from "../../../../lib/admin-accounts";
import {
  accountErrorResponse,
  limitCredentials,
} from "../../../../lib/admin-credentials";
export const runtime = "nodejs";
export async function DELETE(request, { params }) {
  const auth = await requireAdminRequest(request, "admin");
  if (!auth.ok) return auth.response;
  const limited = await limitCredentials(
    request,
    "admin-delete",
    auth.session.id,
  );
  if (limited) return limited;
  try {
    const user = await deleteAdminAccount(
      prisma,
      auth.session,
      (await params).id,
    );
    return NextResponse.json({ ok: true, id: user.id });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
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
