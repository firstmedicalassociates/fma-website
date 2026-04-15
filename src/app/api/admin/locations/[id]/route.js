import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { validateLocationPayload } from "../../../../lib/location-cms";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  }

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
    const location = await prisma.location.update({
      where: { id },
      data: validation.data,
      select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, id: location.id, slug: location.slug });
  } catch (error) {
    const errorMessage = String(error?.message || "");

    if (errorMessage.includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }

    if (errorMessage.toLowerCase().includes("record to update not found")) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    console.error("Failed to update location", error);
    return NextResponse.json({ ok: false, error: "Failed to update location." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  }

  try {
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("record to delete does not exist")) {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: "Failed to delete location." }, { status: 500 });
  }
}
