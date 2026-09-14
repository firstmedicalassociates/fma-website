import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { resetAdminPassword } from "../../../../../lib/admin-accounts";
import {
  accountErrorResponse,
  limitCredentials,
} from "../../../../../lib/admin-credentials";
export const runtime = "nodejs";
export async function POST(request, { params }) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const limited = await limitCredentials(
    request,
    "admin-reset",
    auth.session.id,
  );
  if (limited) return limited;
  try {
    return NextResponse.json({
      ok: true,
      user: await resetAdminPassword(
        prisma,
        auth.session,
        (await params).id,
        (await request.json()).password,
      ),
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
