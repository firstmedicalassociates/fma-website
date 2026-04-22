import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdminRequest } from "../../../lib/admin-auth";
import { buildContentHtml, normalizeSlug } from "../../../lib/post-builder";

export const runtime = "nodejs";

export async function POST(request) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    title,
    metaTitle,
    metaDescription,
    header,
    slug,
    featuredImageUrl,
    featuredImageAlt,
    footer,
    sections,
  } = body || {};
  if (!title || !header || !slug || !featuredImageUrl || !footer) {
    return NextResponse.json(
      { ok: false, error: "Title, header, slug, featured image, and footer are required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(sections)) {
    return NextResponse.json({ ok: false, error: "Sections are required." }, { status: 400 });
  }

  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return NextResponse.json({ ok: false, error: "Invalid slug." }, { status: 400 });
  }

  const contentHtml = buildContentHtml({
    title,
    header,
    featuredImageUrl,
    featuredImageAlt,
    footer,
    sections,
  });

  try {
    const post = await prisma.blogPost.create({
      data: {
        title,
        metaTitle: metaTitle ? String(metaTitle).trim() : null,
        metaDescription: metaDescription ? String(metaDescription).trim() : null,
        slug: normalizedSlug,
        contentHtml,
        coverImageUrl: featuredImageUrl,
        coverImageAlt: featuredImageAlt ? String(featuredImageAlt).trim() : null,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, slug: post.slug });
  } catch (error) {
    if (String(error?.message || "").includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Failed to create post." }, { status: 500 });
  }
}
