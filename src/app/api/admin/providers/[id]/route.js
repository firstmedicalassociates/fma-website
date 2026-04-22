import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { normalizeProviderPayload } from "../../../../lib/providers";

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

  const payload = normalizeProviderPayload(body);

  if (!payload.name || !payload.title || !payload.bio || !payload.slug || !payload.imageUrl) {
    return NextResponse.json(
      { ok: false, error: "Name, title, bio, slug, and image are required." },
      { status: 400 }
    );
  }

  if (payload.locations.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Assign the provider to at least one location." },
      { status: 400 }
    );
  }

  if (payload.languages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Add at least one language." },
      { status: 400 }
    );
  }

  try {
    const provider = await prisma.provider.update({
      where: { id },
      data: payload,
      select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, id: provider.id, slug: provider.slug });
  } catch (error) {
    const errorMessage = String(error?.message || "");

    if (errorMessage.includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }

    if (errorMessage.toLowerCase().includes("record to update not found")) {
      return NextResponse.json({ ok: false, error: "Provider not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: "Failed to update provider." }, { status: 500 });
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
    await prisma.provider.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete provider." }, { status: 500 });
  }
}
