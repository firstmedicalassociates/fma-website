import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import FeedbackReviewClient from "./feedback-review-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminAiSearchFeedbackPage({ params }) {
  const { id } = await params;
  const event = await prisma.aiSearchEvent.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      feedbackCreatedAt: true,
      feedbackRating: true,
      feedbackTags: true,
      feedbackQuerySnapshot: true,
      feedbackAnswerSnapshot: true,
      feedbackSnapshotStatus: true,
      feedbackReviewStatus: true,
      feedbackReviewNotes: true,
      feedbackReviewedAt: true,
      feedbackReviewedBy: true,
      intent: true,
      status: true,
      code: true,
      aiConfidence: true,
      grounded: true,
      disclaimer: true,
      resultCount: true,
      sourceCount: true,
      appointmentOptionCount: true,
      latencyMs: true,
      searchRoute: true,
      promptVersion: true,
      modelVersion: true,
      knowledgeVersion: true,
      sourceRefs: true,
      retrievalScore: true,
      evalCase: {
        select: {
          id: true,
          query: true,
          expectedBehavior: true,
          expectedIntent: true,
          appointmentAvailability: true,
          expectedCode: true,
          expectedSourceUrl: true,
          requiredAnswerPhrases: true,
          forbiddenAnswerPhrases: true,
          isActive: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!event || !event.feedbackRating) notFound();

  const serializableEvent = {
    ...event,
    createdAt: event.createdAt.toISOString(),
    feedbackCreatedAt: event.feedbackCreatedAt?.toISOString() || "",
    feedbackReviewedAt: event.feedbackReviewedAt?.toISOString() || "",
    evalCase: event.evalCase
      ? {
          ...event.evalCase,
          createdAt: event.evalCase.createdAt.toISOString(),
          updatedAt: event.evalCase.updatedAt.toISOString(),
        }
      : null,
  };

  return (
    <>
      <header className="admin-top feedback-review-top">
        <div>
          <span className="admin-kicker">AI quality review</span>
          <h1 className="admin-title">Feedback case</h1>
          <p className="admin-subtitle">
            Review the privacy-screened evidence, record the resolution, and turn confirmed
            failures into repeatable evals.
          </p>
        </div>
        <Link className="builder-button secondary" href="/admin/ai-search">
          Back to AI Search
        </Link>
      </header>

      <FeedbackReviewClient event={serializableEvent} />
    </>
  );
}
