import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verifyInteractionTarget } from "../../../lib/ai-interactions.mjs";
import { isSameOrigin } from "../../../lib/admin-permissions.mjs";
import { checkRateLimit, getRateLimitIdentity } from "../../../lib/rate-limit";
export const runtime = "nodejs";
export async function POST(request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ ok: false }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 4096)
    return NextResponse.json({ ok: false }, { status: 413 });
  const rate = await checkRateLimit(getRateLimitIdentity(request, "ai-click"), {
    max: 90,
    windowMs: 60000,
    requireShared: process.env.NODE_ENV === "production",
  });
  if (!rate.ok)
    return NextResponse.json(
      { ok: false },
      { status: rate.unavailable ? 503 : 429 },
    );
  const body = await request.json().catch(() => ({}));
  const target = verifyInteractionTarget(body.token);
  if (
    !target ||
    typeof body.id !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(body.id)
  )
    return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const event = await prisma.aiSearchEvent.findUnique({
      where: { id: target.eventId },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ ok: false }, { status: 404 });
    await prisma.aiSearchInteraction.createMany({
      data: [
        {
          id: body.id,
          eventId: target.eventId,
          type: target.type,
          targetRef: target.targetRef,
        },
      ],
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("Search interaction skipped:", error.code || error.name);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
