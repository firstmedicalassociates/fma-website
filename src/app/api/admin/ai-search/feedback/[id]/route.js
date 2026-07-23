import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../../lib/admin-auth";
import { getPhiRisk } from "../../../../../lib/no-phi-guard";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_STATUSES = new Set(["pending", "in_review", "resolved", "dismissed"]);

function normalizeReviewNotes(value = "") {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function PATCH(request, { params }) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(String(id || ""))) {
    return NextResponse.json({ ok: false, error: "Invalid feedback event." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reviewStatus = String(body?.reviewStatus || "").trim();
  const reviewNotes = normalizeReviewNotes(body?.reviewNotes);

  if (!REVIEW_STATUSES.has(reviewStatus)) {
    return NextResponse.json({ ok: false, error: "Choose a valid review status." }, { status: 400 });
  }
  if (reviewNotes.length > 3000) {
    return NextResponse.json(
      { ok: false, error: "Review notes must be 3,000 characters or fewer." },
      { status: 400 }
    );
  }
  if (reviewNotes && getPhiRisk(reviewNotes).hasPotentialPhi) {
    return NextResponse.json(
      {
        ok: false,
        error: "Remove patient-specific or identifying information from the review notes.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.aiSearchEvent.updateMany({
      where: {
        id,
        feedbackRating: { not: null },
      },
      data: {
        feedbackReviewStatus: reviewStatus,
        feedbackReviewNotes: reviewNotes || null,
        feedbackReviewedAt: new Date(),
        feedbackReviewedBy: auth.session.email || auth.session.sub || "admin",
      },
    });

    if (result.count !== 1) {
      return NextResponse.json({ ok: false, error: "Feedback event not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, reviewStatus });
  } catch (error) {
    console.error("Failed to update AI search feedback review", error);
    return NextResponse.json(
      { ok: false, error: "The feedback review could not be saved." },
      { status: 500 }
    );
  }
}
