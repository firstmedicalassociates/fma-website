import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { buildContentHtml, normalizeSlug } from "../../../../lib/post-builder";

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

  const existingPost = await prisma.blogPost.findUnique({
    where: { id },
    select: {
      status: true,
      publishedAt: true,
    },
  });

  if (!existingPost) {
    return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
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
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: {
        title,
        metaTitle: metaTitle ? String(metaTitle).trim() : null,
        metaDescription: metaDescription ? String(metaDescription).trim() : null,
        slug: normalizedSlug,
        contentHtml,
        coverImageUrl: featuredImageUrl,
        coverImageAlt: featuredImageAlt ? String(featuredImageAlt).trim() : null,
        publishedAt:
          existingPost.status === "PUBLISHED"
            ? existingPost.publishedAt || new Date()
            : null,
      },
    });

    return NextResponse.json({ ok: true, slug: updatedPost.slug });
  } catch (error) {
    if (String(error?.message || "").includes("Unique constraint failed")) {
      return NextResponse.json(
        { ok: false, error: "Slug already exists. Choose another." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Failed to update post." }, { status: 500 });
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
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete post." }, { status: 500 });
  }
}
