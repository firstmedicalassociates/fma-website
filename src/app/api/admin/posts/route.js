import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderElements(elements) {
  return elements
    .map((element) => {
      const content = escapeHtml(element.content || "");
      if (element.type === "h2") return `<h2>${content}</h2>`;
      if (element.type === "p") return `<p>${content}</p>`;
      if (element.type === "ul") {
        const items = content
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => `<li>${item}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return "";
    })
    .join("");
}

function buildContentHtml({
  title,
  header,
  featuredImageUrl,
  featuredImageAlt,
  footer,
  sections,
}) {
  const imageHtml = featuredImageUrl
    ? `<img src="${escapeHtml(featuredImageUrl)}" alt="${escapeHtml(featuredImageAlt || title)}" />`
    : "";
  const headerHtml = `<header><h1>${escapeHtml(header)}</h1></header>`;
  const body = sections
    .map((section) => `<section>${renderElements(section.elements || [])}</section>`)
    .join("");
  const footerHtml = `<footer><p>${escapeHtml(footer)}</p></footer>`;
  return `<article>${imageHtml}${headerHtml}${body}${footerHtml}</article>`;
}

export async function POST(request) {
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

  const normalizedSlug = String(slug)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
