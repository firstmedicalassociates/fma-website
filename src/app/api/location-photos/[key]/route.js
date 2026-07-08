import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getLocationPhotoBlobUrl } from "../../../lib/location-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { key } = await params;
  const blobUrl = getLocationPhotoBlobUrl(key);

  if (!blobUrl) {
    return NextResponse.json({ error: "Location photo not found." }, { status: 404 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Blob image access is not configured." }, { status: 500 });
  }

  const blob = await get(blobUrl, {
    access: "private",
    token,
    ifNoneMatch: request.headers.get("if-none-match") || undefined,
  });

  if (!blob) {
    return NextResponse.json({ error: "Location photo not found." }, { status: 404 });
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
