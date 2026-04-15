import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdminRequest } from "../../../lib/admin-auth";
import { normalizeProviderPayload } from "../../../lib/providers";

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
    const provider = await prisma.provider.create({
      data: payload,
      select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, id: provider.id, slug: provider.slug });
  } catch (error) {
    if (String(error?.message || "").includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: false, error: "Failed to create provider." }, { status: 500 });
  }
}
