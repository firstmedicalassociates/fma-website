import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { isPrivateBlobUrl } from "../../../lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildRedirectUrl(request, imageUrl = "") {
  try {
    return new URL(imageUrl);
  } catch {
    return new URL(imageUrl, request.url);
  }
}

export async function GET(request, { params }) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing provider slug." }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: {
      imageUrl: true,
      isActive: true,
    },
  });

  if (!provider || !provider.isActive || !provider.imageUrl) {
    return NextResponse.json({ error: "Provider image not found." }, { status: 404 });
  }

  if (!isPrivateBlobUrl(provider.imageUrl)) {
    return NextResponse.redirect(buildRedirectUrl(request, provider.imageUrl), 307);
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Blob image access is not configured." }, { status: 500 });
  }

  const blob = await get(provider.imageUrl, {
    access: "private",
    token,
    ifNoneMatch: request.headers.get("if-none-match") || undefined,
  });

  if (!blob) {
    return NextResponse.json({ error: "Provider image not found." }, { status: 404 });
  }

  if (blob.statusCode === 304) {
    return new Response(null, {
      status: 304,
      headers: {
        etag: blob.blob.etag,
      },
    });
  }

  return new Response(blob.stream, {
    status: 200,
    headers: {
      "content-type": blob.blob.contentType || "image/webp",
      "content-length": String(blob.blob.size || ""),
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      etag: blob.blob.etag,
    },
  });
}
