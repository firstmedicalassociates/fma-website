"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const REVIEW_STATUSES = [
  { value: "pending", label: "Pending review" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const INTENT_OPTIONS = [
  ["", "No intent assertion"],
  ["appointment_availability", "Appointment availability"],
  ["booking_help", "Booking help"],
  ["provider_search", "Provider search"],
  ["service_question", "Service question"],
  ["location_question", "Location question"],
  ["insurance_question", "Insurance question"],
  ["billing_question", "Billing question"],
  ["policy_question", "Policy question"],
  ["patient_resources", "Patient resources"],
  ["contact_question", "Contact question"],
  ["privacy_blocked", "Privacy blocked"],
  ["unknown", "Unknown"],
];

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value = "") {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAvailabilityValue(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}

export default function FeedbackReviewClient({ event }) {
  const router = useRouter();
  const existingEval = event.evalCase;
  const isNegative = event.feedbackRating === "not_helpful";
  const hasVerifiedSnapshot =
    event.feedbackSnapshotStatus === "stored" && Boolean(event.feedbackQuerySnapshot);

  const [reviewStatus, setReviewStatus] = useState(
    event.feedbackReviewStatus || (isNegative ? "pending" : "not_required")
  );
  const [reviewNotes, setReviewNotes] = useState(event.feedbackReviewNotes || "");
  const [reviewSubmitState, setReviewSubmitState] = useState({
    status: "idle",
    message: "",
  });

  const [expectedBehavior, setExpectedBehavior] = useState(
    existingEval?.expectedBehavior || ""
  );
  const [expectedIntent, setExpectedIntent] = useState(existingEval?.expectedIntent || "");
  const [appointmentAvailability, setAppointmentAvailability] = useState(
    getAvailabilityValue(existingEval?.appointmentAvailability)
  );
  const [expectedCode, setExpectedCode] = useState(existingEval?.expectedCode || "");
  const [expectedSourceUrl, setExpectedSourceUrl] = useState(
    existingEval?.expectedSourceUrl || ""
  );
  const [requiredAnswerPhrases, setRequiredAnswerPhrases] = useState(
    existingEval?.requiredAnswerPhrases?.join("\n") || ""
  );
  const [forbiddenAnswerPhrases, setForbiddenAnswerPhrases] = useState(
    existingEval?.forbiddenAnswerPhrases?.join("\n") || ""
  );
  const [isActive, setIsActive] = useState(existingEval?.isActive !== false);
  const [evalSubmitState, setEvalSubmitState] = useState({
    status: "idle",
    message: "",
  });

  async function saveReview(submitEvent) {
    submitEvent.preventDefault();
    setReviewSubmitState({ status: "submitting", message: "" });

    try {
      const response = await fetch(`/api/admin/ai-search/feedback/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus,
          reviewNotes,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setReviewSubmitState({
          status: "error",
          message: result?.error || "The review could not be saved.",
        });
        return;
      }

      setReviewSubmitState({ status: "success", message: "Review saved." });
      router.refresh();
    } catch {
      setReviewSubmitState({
        status: "error",
        message: "The review could not be saved. Check your connection and try again.",
      });
    }
  }

  async function saveEvalCase(submitEvent) {
    submitEvent.preventDefault();
    setEvalSubmitState({ status: "submitting", message: "" });

    try {
      const response = await fetch(
        `/api/admin/ai-search/feedback/${event.id}/eval-case`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedBehavior,
            expectedIntent,
            appointmentAvailability,
            expectedCode,
            expectedSourceUrl,
            requiredAnswerPhrases,
            forbiddenAnswerPhrases,
            isActive,
          }),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setEvalSubmitState({
          status: "error",
          message: result?.error || "The eval case could not be saved.",
        });
        return;
      }

      setReviewStatus("in_review");
      setEvalSubmitState({
        status: "success",
        message: result.isActive
          ? "Active regression case saved."
          : "Eval draft saved but excluded from runs.",
      });
      router.refresh();
    } catch {
      setEvalSubmitState({
        status: "error",
        message: "The eval case could not be saved. Check your connection and try again.",
      });
    }
  }

  return (
    <div className="feedback-review-layout">
      <div className="feedback-review-main">
        <section className="admin-panel feedback-review-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Review evidence</h2>
              <p>
                Snapshots are saved only for negative feedback after hash verification and PHI
                screening.
              </p>
            </div>
            <span
              className={`feedback-review-status feedback-review-status-${event.feedbackSnapshotStatus || "unavailable"}`}
            >
              {formatLabel(event.feedbackSnapshotStatus || "unavailable")}
            </span>
          </div>

          <div className="feedback-review-evidence">
            <article className="feedback-review-snapshot">
              <span>Question</span>
              <p>
                {event.feedbackQuerySnapshot ||
                  "No readable question was retained for this feedback event."}
              </p>
            </article>
            <article className="feedback-review-snapshot">
              <span>AI answer</span>
              <p>
                {event.feedbackAnswerSnapshot ||
                  "No readable answer was retained for this feedback event."}
              </p>
            </article>
          </div>
        </section>

        {isNegative ? (
          <section className="admin-panel feedback-review-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Review decision</h2>
                <p>Track ownership and resolution without including patient information.</p>
              </div>
            </div>
            <form className="feedback-review-form" onSubmit={saveReview}>
              <div className="builder-field">
                <label htmlFor="feedback-review-status">Review status</label>
                <select
                  className="builder-select"
                  id="feedback-review-status"
                  onChange={(changeEvent) => setReviewStatus(changeEvent.target.value)}
                  value={reviewStatus}
                >
                  {REVIEW_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="builder-field">
                <label htmlFor="feedback-review-notes">Reviewer notes</label>
                <textarea
                  className="builder-textarea"
                  id="feedback-review-notes"
                  maxLength={3000}
                  onChange={(changeEvent) => setReviewNotes(changeEvent.target.value)}
                  placeholder="Example: No-show language routed to the forms policy. Corrected the attendance-policy matcher."
                  value={reviewNotes}
                />
                <p className="feedback-review-helper">
                  Do not paste names, dates of birth, symptoms, account numbers, or other patient
                  information.
                </p>
              </div>
              <div className="feedback-review-form-actions">
                <button
                  className="builder-button"
                  disabled={reviewSubmitState.status === "submitting"}
                  type="submit"
                >
                  {reviewSubmitState.status === "submitting" ? "Saving..." : "Save review"}
                </button>
                <p
                  aria-live="polite"
                  className={`feedback-review-message is-${reviewSubmitState.status}`}
                >
                  {reviewSubmitState.message}
                </p>
              </div>
            </form>
          </section>
        ) : null}

        {isNegative ? (
          <section className="admin-panel feedback-review-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Regression eval</h2>
                <p>
                  Define the correct behavior and at least one assertion the evaluator can check.
                </p>
              </div>
              {existingEval ? (
                <span className="feedback-review-status feedback-review-status-stored">
                  {existingEval.isActive ? "Active eval" : "Eval draft"}
                </span>
              ) : null}
            </div>

            {!hasVerifiedSnapshot ? (
              <div className="feedback-review-unavailable" role="status">
                This case cannot be promoted because no verified privacy-screened question was
                retained.
              </div>
            ) : (
              <form className="feedback-review-form" onSubmit={saveEvalCase}>
                <div className="builder-field">
                  <label htmlFor="eval-expected-behavior">Correct expected behavior</label>
                  <textarea
                    className="builder-textarea"
                    id="eval-expected-behavior"
                    maxLength={3000}
                    onChange={(changeEvent) => setExpectedBehavior(changeEvent.target.value)}
                    placeholder="Explain what the answer should do and why."
                    required
                    value={expectedBehavior}
                  />
                </div>

                <div className="feedback-review-field-grid">
                  <div className="builder-field">
                    <label htmlFor="eval-expected-intent">Expected intent</label>
                    <select
                      className="builder-select"
                      id="eval-expected-intent"
                      onChange={(changeEvent) => setExpectedIntent(changeEvent.target.value)}
                      value={expectedIntent}
                    >
                      {INTENT_OPTIONS.map(([value, label]) => (
                        <option key={value || "none"} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="builder-field">
                    <label htmlFor="eval-appointment-routing">Appointment routing</label>
                    <select
                      className="builder-select"
                      id="eval-appointment-routing"
                      onChange={(changeEvent) =>
                        setAppointmentAvailability(changeEvent.target.value)
                      }
                      value={appointmentAvailability}
                    >
                      <option value="">No routing assertion</option>
                      <option value="true">Must check availability</option>
                      <option value="false">Must not check availability</option>
                    </select>
                  </div>
                  <div className="builder-field">
                    <label htmlFor="eval-expected-code">Expected response code</label>
                    <input
                      className="builder-input"
                      id="eval-expected-code"
                      maxLength={80}
                      onChange={(changeEvent) => setExpectedCode(changeEvent.target.value)}
                      placeholder="policy_exact_match"
                      value={expectedCode}
                    />
                  </div>
                  <div className="builder-field">
                    <label htmlFor="eval-expected-source">Expected source URL</label>
                    <input
                      className="builder-input"
                      id="eval-expected-source"
                      maxLength={1000}
                      onChange={(changeEvent) => setExpectedSourceUrl(changeEvent.target.value)}
                      placeholder="/patient-resources/patients"
                      value={expectedSourceUrl}
                    />
                  </div>
                </div>

                <div className="feedback-review-field-grid">
                  <div className="builder-field">
                    <label htmlFor="eval-required-phrases">Required answer phrases</label>
                    <textarea
                      className="builder-textarea feedback-review-phrase-input"
                      id="eval-required-phrases"
                      onChange={(changeEvent) => setRequiredAnswerPhrases(changeEvent.target.value)}
                      placeholder={"One phrase per line\n$50 missed-appointment fee"}
                      value={requiredAnswerPhrases}
                    />
                  </div>
                  <div className="builder-field">
                    <label htmlFor="eval-forbidden-phrases">Forbidden answer phrases</label>
                    <textarea
                      className="builder-textarea feedback-review-phrase-input"
                      id="eval-forbidden-phrases"
                      onChange={(changeEvent) => setForbiddenAnswerPhrases(changeEvent.target.value)}
                      placeholder={"One phrase per line\nFMLA paperwork"}
                      value={forbiddenAnswerPhrases}
                    />
                  </div>
                </div>

                <label className="feedback-review-checkbox">
                  <input
                    checked={isActive}
                    onChange={(changeEvent) => setIsActive(changeEvent.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    <strong>Include in automated eval runs</strong>
                    <small>Turn this off to save the case as a draft.</small>
                  </span>
                </label>

                <div className="feedback-review-form-actions">
                  <button
                    className="builder-button"
                    disabled={evalSubmitState.status === "submitting"}
                    type="submit"
                  >
                    {evalSubmitState.status === "submitting"
                      ? "Saving eval..."
                      : existingEval
                        ? "Update eval case"
                        : "Promote to eval"}
                  </button>
                  <p
                    aria-live="polite"
                    className={`feedback-review-message is-${evalSubmitState.status}`}
                  >
                    {evalSubmitState.message}
                  </p>
                </div>
              </form>
            )}
          </section>
        ) : null}
      </div>

      <aside className="feedback-review-sidebar">
        <section className="admin-panel feedback-review-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Case metadata</h2>
              <p>Trusted response diagnostics from the original search.</p>
            </div>
          </div>
          <dl className="feedback-review-meta">
            <div>
              <dt>Feedback</dt>
              <dd>{event.feedbackRating === "helpful" ? "Helpful" : "Needs work"}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{event.feedbackTags.join(", ") || "Not specified"}</dd>
            </div>
            <div>
              <dt>Intent</dt>
              <dd>{formatLabel(event.intent)}</dd>
            </div>
            <div>
              <dt>Response code</dt>
              <dd>{event.code || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{event.searchRoute || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>
                {event.aiConfidence || "Unknown"}
                {Number.isFinite(event.retrievalScore)
                  ? ` / ${event.retrievalScore.toFixed(2)} retrieval`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{event.sourceCount}</dd>
            </div>
            <div>
              <dt>Appointments</dt>
              <dd>{event.appointmentOptionCount}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{event.modelVersion || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Prompt</dt>
              <dd>{event.promptVersion || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Knowledge</dt>
              <dd>{event.knowledgeVersion || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Latency</dt>
              <dd>{event.latencyMs ? `${event.latencyMs} ms` : "Not recorded"}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{formatDate(event.feedbackCreatedAt || event.createdAt)}</dd>
            </div>
            <div>
              <dt>Last reviewed</dt>
              <dd>{formatDate(event.feedbackReviewedAt)}</dd>
            </div>
            <div>
              <dt>Reviewer</dt>
              <dd>{event.feedbackReviewedBy || "Not assigned"}</dd>
            </div>
          </dl>
        </section>

        {event.sourceRefs.length > 0 ? (
          <section className="admin-panel feedback-review-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Source references</h2>
                <p>Sources selected for the original response.</p>
              </div>
            </div>
            <ul className="feedback-review-sources">
              {event.sourceRefs.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
