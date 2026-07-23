import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../../../lib/admin-auth";
import { AI_SEARCH_INTENTS } from "../../../../../../lib/ai-search-intent";
import { getPhiRisk } from "../../../../../../lib/no-phi-guard";
import { prisma } from "../../../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_INTENTS = new Set(Object.values(AI_SEARCH_INTENTS));

function normalizeText(value = "", maxLength = 0) {
  const normalized = String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized;
}

function normalizePhrases(value) {
  const entries = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
  return [
    ...new Set(entries.map((entry) => normalizeText(entry, 180)).filter(Boolean)),
  ].slice(0, 20);
}

function normalizeAvailability(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export async function PUT(request, { params }) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(String(id || ""))) {
    return NextResponse.json({ ok: false, error: "Invalid feedback event." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const expectedBehavior = normalizeText(body?.expectedBehavior, 3000);
  const expectedIntent = normalizeText(body?.expectedIntent, 80);
  const expectedCode = normalizeText(body?.expectedCode, 80);
  const expectedSourceUrl = normalizeText(body?.expectedSourceUrl, 1000);
  const requiredAnswerPhrases = normalizePhrases(body?.requiredAnswerPhrases);
  const forbiddenAnswerPhrases = normalizePhrases(body?.forbiddenAnswerPhrases);
  const appointmentAvailability = normalizeAvailability(body?.appointmentAvailability);
  const isActive = body?.isActive !== false;

  if (!expectedBehavior) {
    return NextResponse.json(
      { ok: false, error: "Describe the correct expected behavior." },
      { status: 400 }
    );
  }
  if (expectedIntent && !ALLOWED_INTENTS.has(expectedIntent)) {
    return NextResponse.json({ ok: false, error: "Choose a valid expected intent." }, { status: 400 });
  }
  if (expectedCode && !/^[a-z0-9_-]{2,80}$/i.test(expectedCode)) {
    return NextResponse.json(
      { ok: false, error: "Expected code may contain letters, numbers, underscores, and dashes." },
      { status: 400 }
    );
  }
  if (
    expectedSourceUrl &&
    !expectedSourceUrl.startsWith("/") &&
    !/^https?:\/\/\S+$/i.test(expectedSourceUrl)
  ) {
    return NextResponse.json(
      { ok: false, error: "Expected source must be a site path or an HTTP(S) URL." },
      { status: 400 }
    );
  }
  if (
    !expectedIntent &&
    appointmentAvailability === null &&
    !expectedCode &&
    !expectedSourceUrl &&
    requiredAnswerPhrases.length === 0 &&
    forbiddenAnswerPhrases.length === 0
  ) {
    return NextResponse.json(
      { ok: false, error: "Add at least one machine-checkable expectation." },
      { status: 400 }
    );
  }

  const reviewText = [
    expectedBehavior,
    ...requiredAnswerPhrases,
    ...forbiddenAnswerPhrases,
  ].join("\n");
  if (getPhiRisk(reviewText).hasPotentialPhi) {
    return NextResponse.json(
      {
        ok: false,
        error: "Remove patient-specific or identifying information from the eval expectations.",
      },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.aiSearchEvent.findUnique({
      where: { id },
      select: {
        id: true,
        feedbackRating: true,
        feedbackQuerySnapshot: true,
        feedbackSnapshotStatus: true,
      },
    });

    if (!event || event.feedbackRating !== "not_helpful") {
      return NextResponse.json(
        { ok: false, error: "Only negative feedback can be promoted to an eval case." },
        { status: 400 }
      );
    }
    if (event.feedbackSnapshotStatus !== "stored" || !event.feedbackQuerySnapshot) {
      return NextResponse.json(
        {
          ok: false,
          error: "This feedback has no verified privacy-screened query to promote.",
        },
        { status: 400 }
      );
    }
    if (getPhiRisk(event.feedbackQuerySnapshot).hasPotentialPhi) {
      return NextResponse.json(
        { ok: false, error: "The stored query did not pass the privacy check." },
        { status: 400 }
      );
    }

    const evalCase = await prisma.aiSearchEvalCase.upsert({
      where: { sourceEventId: id },
      create: {
        sourceEventId: id,
        query: event.feedbackQuerySnapshot,
        expectedBehavior,
        expectedIntent: expectedIntent || null,
        appointmentAvailability,
        expectedCode: expectedCode || null,
        expectedSourceUrl: expectedSourceUrl || null,
        requiredAnswerPhrases,
        forbiddenAnswerPhrases,
        isActive,
        createdBy: auth.session.email || auth.session.sub || "admin",
      },
      update: {
        query: event.feedbackQuerySnapshot,
        expectedBehavior,
        expectedIntent: expectedIntent || null,
        appointmentAvailability,
        expectedCode: expectedCode || null,
        expectedSourceUrl: expectedSourceUrl || null,
        requiredAnswerPhrases,
        forbiddenAnswerPhrases,
        isActive,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    await prisma.aiSearchEvent.update({
      where: { id },
      data: {
        feedbackReviewStatus: "in_review",
        feedbackReviewedAt: new Date(),
        feedbackReviewedBy: auth.session.email || auth.session.sub || "admin",
      },
    });

    return NextResponse.json({
      ok: true,
      evalCaseId: evalCase.id,
      isActive: evalCase.isActive,
    });
  } catch (error) {
    console.error("Failed to promote AI search feedback to an eval case", error);
    return NextResponse.json(
      { ok: false, error: "The eval case could not be saved." },
      { status: 500 }
    );
  }
}
