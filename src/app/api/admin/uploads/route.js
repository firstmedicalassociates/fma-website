import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { imageSize } from "image-size";

export const runtime = "nodejs";

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const kind = String(formData.get("kind") || "").trim().toLowerCase();
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "File is required." }, { status: 400 });
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ ok: false, error: "Unsupported file type." }, { status: 415 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (kind === "provider") {
    let dimensions;
    try {
      dimensions = imageSize(buffer);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid image file." }, { status: 400 });
    }

    if (dimensions.width !== 600 || dimensions.height !== 600) {
      return NextResponse.json(
        { ok: false, error: "Provider images must be exactly 600x600 pixels." },
        { status: 400 }
      );
    }
  }

  const safeName = String(file.name || "upload")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const uploadDir = path.join(process.cwd(), "public", "uploads");

  await fs.mkdir(uploadDir, { recursive: true });

  const parsed = path.parse(safeName);
  const baseName = parsed.name || "upload";
  const ext = parsed.ext || ".jpg";
  let fileName = `${baseName}${ext}`;
  let filePath = path.join(uploadDir, fileName);
  let counter = 1;

  while (await fileExists(filePath)) {
    fileName = `${baseName}-${counter}${ext}`;
    filePath = path.join(uploadDir, fileName);
    counter += 1;
  }

  await fs.writeFile(filePath, buffer);

  return NextResponse.json({
    ok: true,
    url: `/uploads/${fileName}`,
  });
}
