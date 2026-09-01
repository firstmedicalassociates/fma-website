import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_DIRECTORIES = new Set(["blog-images", "location-images"]);

export async function GET(request, { params }) {
  const { pathname } = await params;
  const segments = Array.isArray(pathname) ? pathname : [];

  if (
    segments.length < 2 ||
    !ALLOWED_DIRECTORIES.has(segments[0]) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Blob image access is not configured." }, { status: 500 });
  }

  try {
    const blob = await get(segments.join("/"), {
      access: "private",
      token,
      ifNoneMatch: request.headers.get("if-none-match") || undefined,
    });

    if (!blob) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    if (blob.statusCode === 304) {
      return new Response(null, {
        status: 304,
        headers: { etag: blob.blob.etag },
      });
    }

    return new Response(blob.stream, {
      status: 200,
      headers: {
        "content-type": blob.blob.contentType || "application/octet-stream",
        "content-length": String(blob.blob.size),
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        etag: blob.blob.etag,
      },
    });
  } catch (error) {
    console.error("Failed to read an uploaded image from Vercel Blob.", {
      pathname: segments.join("/"),
      name: error?.name,
      message: error?.message,
    });
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
