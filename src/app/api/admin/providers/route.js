import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { normalizeProviderPayload } from "../../../lib/providers";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const {
    name: normalizedName,
    title: normalizedTitle,
    bio: normalizedBio,
    slug: normalizedSlug,
    imageUrl: normalizedImageUrl,
    linkUrl: normalizedLinkUrl,
    locations: normalizedLocations,
    languages: normalizedLanguages,
  } = normalizeProviderPayload(body);

  if (
    !normalizedName ||
    !normalizedTitle ||
    !normalizedBio ||
    !normalizedSlug ||
    !normalizedImageUrl
  ) {
    return NextResponse.json(
      { ok: false, error: "Name, title, bio, slug, and image are required." },
      { status: 400 }
    );
  }

  if (normalizedLocations.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Select at least one location." },
      { status: 400 }
    );
  }

  if (normalizedLanguages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Add at least one language." },
      { status: 400 }
    );
  }

  try {
    const provider = await prisma.provider.create({
      data: {
        name: normalizedName,
        title: normalizedTitle,
        bio: normalizedBio,
        slug: normalizedSlug,
        imageUrl: normalizedImageUrl,
        linkUrl: normalizedLinkUrl,
        locations: normalizedLocations,
        languages: normalizedLanguages,
      },
      select: { slug: true },
    });

    return NextResponse.json({ ok: true, slug: provider.slug });
  } catch (error) {
    if (String(error?.message || "").includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create provider." },
      { status: 500 }
    );
  }
}
