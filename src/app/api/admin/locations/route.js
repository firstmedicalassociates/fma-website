import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdminRequest } from "../../../lib/admin-auth";
import { validateLocationPayload } from "../../../lib/location-cms";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const validation = validateLocationPayload(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  try {
    const location = await prisma.location.create({
      data: validation.data,
      select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, id: location.id, slug: location.slug });
  } catch (error) {
    if (String(error?.message || "").includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: false, error: "Failed to create location." }, { status: 500 });
  }
}
