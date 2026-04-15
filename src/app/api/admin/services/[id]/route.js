import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { normalizeServicePayload } from "../../../../lib/services";

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
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const payload = normalizeServicePayload(body);
  if (!payload.title || !payload.description) {
    return NextResponse.json(
      { ok: false, error: "Service title and description are required." },
      { status: 400 }
    );
  }

  try {
    const service = await prisma.service.update({
      where: { id },
      data: payload,
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: service.id });
  } catch (error) {
    const errorMessage = String(error?.message || "");

    if (errorMessage.toLowerCase().includes("record to update not found")) {
      return NextResponse.json({ ok: false, error: "Service not found." }, { status: 404 });
    }

    console.error("Failed to update service", error);
    return NextResponse.json({ ok: false, error: "Failed to update service." }, { status: 500 });
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
    const locations = await prisma.location.findMany({
      where: {
        serviceIds: {
          has: id,
        },
      },
      select: {
        id: true,
        serviceIds: true,
      },
    });

    await prisma.$transaction([
      ...locations.map((location) =>
        prisma.location.update({
          where: { id: location.id },
          data: {
            serviceIds: location.serviceIds.filter((serviceId) => serviceId !== id),
          },
        })
      ),
      prisma.service.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete service", error);
    return NextResponse.json({ ok: false, error: "Failed to delete service." }, { status: 500 });
  }
}
