import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdminRequest } from "../../../lib/admin-auth";
import {
  ACCOUNT_SELECT,
  createAdminAccount,
} from "../../../lib/admin-accounts";
import {
  accountErrorResponse,
  limitCredentials,
} from "../../../lib/admin-credentials";
export const runtime = "nodejs";
export async function GET(request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({
    ok: true,
    users: await prisma.adminUser.findMany({
      select: ACCOUNT_SELECT,
      orderBy: { createdAt: "asc" },
    }),
  });
}
export async function POST(request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const limited = await limitCredentials(
    request,
    "admin-create",
    auth.session.id,
  );
  if (limited) return limited;
  try {
    return NextResponse.json(
      {
        ok: true,
        user: await createAdminAccount(
          prisma,
          auth.session,
          await request.json(),
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return accountErrorResponse(error);
  }
}
