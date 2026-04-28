import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAdminRequest } from "../../../lib/admin-auth";
import { normalizeServicePayload } from "../../../lib/services";

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

  const payload = normalizeServicePayload(body);
  if (!payload.title || !payload.description || !payload.slug) {
    return NextResponse.json(
      { ok: false, error: "Service title, slug, and description are required." },
      { status: 400 }
    );
  }

  try {
    const service = await prisma.service.create({
      data: payload,
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: service.id });
  } catch (error) {
    const errorCode = String(error?.code || "");
    if (errorCode === "P2002") {
      return NextResponse.json(
        { ok: false, error: "That service slug is already in use." },
        { status: 409 }
      );
    }

    console.error("Failed to create service", error);
    return NextResponse.json({ ok: false, error: "Failed to create service." }, { status: 500 });
  }
}
