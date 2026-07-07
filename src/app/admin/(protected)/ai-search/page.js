import { prisma } from "../../../lib/prisma";
import { getAthenaProviderMappingCoverage } from "../../../lib/athena-availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function getCountValue(row) {
  return Number(row?._count?._all || row?._count || 0);
}

function formatMappingStatus(value = "") {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function loadAiSearchAnalytics() {
  if (!prisma?.aiSearchEvent?.count) {
    return { available: false };
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  try {
    const [
      total,
      answered,
      blocked,
      noResults,
      clarifications,
      failed,
      clarificationChoices,
      providerResolutionMisses,
      feedbackCount,
      helpful,
      notHelpful,
      topIntents,
      topCodes,
      recentFeedback,
    ] = await Promise.all([
      prisma.aiSearchEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.aiSearchEvent.count({ where: { createdAt: { gte: since }, status: "answered" } }),
      prisma.aiSearchEvent.count({ where: { createdAt: { gte: since }, status: "blocked" } }),
      prisma.aiSearchEvent.count({ where: { createdAt: { gte: since }, status: "no_results" } }),
      prisma.aiSearchEvent.count({ where: { createdAt: { gte: since }, status: "clarification" } }),
      prisma.aiSearchEvent.count({ where: { createdAt: { gte: since }, status: "failed" } }),
      prisma.aiSearchEvent.count({
        where: {
          createdAt: { gte: since },
          surface: { in: ["api_search_clarification", "api_ai_search_clarification"] },
        },
      }),
      prisma.aiSearchEvent.count({
        where: { createdAt: { gte: since }, code: "provider_like_unresolved" },
      }),
      prisma.aiSearchEvent.count({
        where: { createdAt: { gte: since }, feedbackRating: { not: null } },
      }),
      prisma.aiSearchEvent.count({
        where: { createdAt: { gte: since }, feedbackRating: "helpful" },
      }),
      prisma.aiSearchEvent.count({
        where: { createdAt: { gte: since }, feedbackRating: "not_helpful" },
      }),
      prisma.aiSearchEvent.groupBy({
        by: ["intent"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { intent: "desc" } },
        take: 8,
      }),
      prisma.aiSearchEvent.groupBy({
        by: ["code"],
        where: { createdAt: { gte: since }, code: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { code: "desc" } },
        take: 8,
      }),
      prisma.aiSearchEvent.findMany({
        where: { feedbackRating: { not: null } },
        orderBy: { feedbackCreatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          createdAt: true,
          feedbackCreatedAt: true,
          feedbackRating: true,
          feedbackTags: true,
          intent: true,
          code: true,
          aiConfidence: true,
          resultCount: true,
          sourceCount: true,
          appointmentOptionCount: true,
          latencyMs: true,
        },
      }),
    ]);

    return {
      available: true,
      total,
      answered,
      blocked,
      noResults,
      clarifications,
      failed,
      clarificationChoices,
      providerResolutionMisses,
      feedbackCount,
      helpful,
      notHelpful,
      topIntents,
      topCodes,
      recentFeedback,
    };
  } catch {
    return { available: false };
  }
}

async function loadProviderDataQuality() {
  try {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        linkUrl: true,
        locations: true,
        languages: true,
        athenaProviderId: true,
        athenaDepartmentId: true,
        athenaSchedulingName: true,
      },
    });

    const rows = providers
      .map((provider) => {
        const gaps = [
          !provider.linkUrl ? "missing booking URL" : "",
          !Array.isArray(provider.locations) || provider.locations.length === 0 ? "missing locations" : "",
          !Array.isArray(provider.languages) || provider.languages.length === 0 ? "missing languages" : "",
          !provider.athenaProviderId && !provider.athenaSchedulingName ? "missing scheduling match" : "",
          !provider.athenaDepartmentId ? "missing scheduling department" : "",
        ].filter(Boolean);

        return {
          name: provider.name,
          slug: provider.slug,
          gaps,
        };
      })
      .filter((row) => row.gaps.length > 0);

    return {
      available: true,
      total: providers.length,
      rows,
      complete: providers.length - rows.length,
    };
  } catch {
    return {
      available: false,
      total: 0,
      rows: [],
      complete: 0,
    };
  }
}

export default async function AdminAiSearchPage() {
  const [analytics, athenaCoverage, providerDataQuality] = await Promise.all([
    loadAiSearchAnalytics(),
    getAthenaProviderMappingCoverage(),
    loadProviderDataQuality(),
  ]);
  const coverageRows = athenaCoverage.rows || [];
  const reviewRows = coverageRows.filter(
    (row) =>
      row.warnings.length > 0 ||
      (row.status !== "explicit_match" && row.status !== "name_match")
  );

  const statCards = analytics.available
    ? [
        { label: "AI searches", value: analytics.total, detail: "Last 30 days" },
        { label: "Answered", value: analytics.answered, detail: "AI or appointment responses" },
        { label: "No results", value: analytics.noResults, detail: "No online slots or source gaps" },
        { label: "Clarified", value: analytics.clarifications, detail: `${formatNumber(analytics.clarificationChoices)} choices clicked` },
        { label: "Provider misses", value: analytics.providerResolutionMisses, detail: "Provider-like searches needing clarification" },
        { label: "Blocked", value: analytics.blocked, detail: "Privacy, length, or safety blocks" },
        { label: "Failed", value: analytics.failed, detail: "Errors needing review" },
        { label: "Feedback", value: analytics.feedbackCount, detail: `${formatNumber(analytics.notHelpful)} need review` },
      ]
    : [];

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Privacy-safe analytics</span>
          <h1 className="admin-title">AI Search</h1>
          <p className="admin-subtitle">
            Review AI search performance without storing or displaying raw patient questions.
          </p>
        </div>
        <span className={`admin-pill ${analytics.available ? "admin-live-pill" : ""}`}>
          {analytics.available ? "Tracking" : "Not ready"}
        </span>
      </header>

      {!analytics.available ? (
        <section className="admin-panel">
          <div className="admin-empty">
            AI search analytics are not available yet. Apply the AiSearchEvent migration and run
            Prisma generate to enable this review page.
          </div>
        </section>
      ) : (
        <section className="ai-search-admin-grid">
          <div className="admin-stat-stack ai-search-stat-grid">
            {statCards.map((card) => (
              <article className="admin-stat-card" key={card.label}>
                <div>
                  <h2 className="admin-stat-label">{card.label}</h2>
                  <p className="admin-stat-value">{formatNumber(card.value)}</p>
                </div>
                <p className="admin-stat-copy">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="admin-dashboard-column">
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Top intents</h2>
                  <p>Intent labels are inferred from safe query metadata, not raw query text.</p>
                </div>
              </div>
              <div className="admin-record-list">
                {analytics.topIntents.map((row) => (
                  <article className="admin-record" key={row.intent || "unknown"}>
                    <div className="admin-record-identity">
                      <p className="admin-record-title">{row.intent || "unknown"}</p>
                      <p className="admin-record-secondary">{formatNumber(getCountValue(row))} searches</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Athena provider mapping</h2>
                  <p>Coverage for public provider profiles against live Athena scheduling records.</p>
                </div>
                <span className={`admin-pill ${athenaCoverage.available ? "admin-live-pill" : ""}`}>
                  {athenaCoverage.available ? "Live check" : "Unavailable"}
                </span>
              </div>

              {!athenaCoverage.available ? (
                <div className="admin-empty">
                  Athena mapping coverage is unavailable. Confirm Athena environment variables and try again.
                </div>
              ) : (
                <>
                  <div className="admin-stat-stack ai-search-stat-grid">
                    <article className="admin-stat-card">
                      <h2 className="admin-stat-label">Mapped</h2>
                      <p className="admin-stat-value">
                        {formatNumber(
                          (athenaCoverage.summary.explicit_match || 0) +
                            (athenaCoverage.summary.name_match || 0)
                        )}
                      </p>
                      <p className="admin-stat-copy">Explicit or safe name matches</p>
                    </article>
                    <article className="admin-stat-card">
                      <h2 className="admin-stat-label">Needs review</h2>
                      <p className="admin-stat-value">{formatNumber(reviewRows.length)}</p>
                      <p className="admin-stat-copy">Missing, ambiguous, or warning rows</p>
                    </article>
                    <article className="admin-stat-card">
                      <h2 className="admin-stat-label">Slots found</h2>
                      <p className="admin-stat-value">{formatNumber(athenaCoverage.summary.slots_found || 0)}</p>
                      <p className="admin-stat-copy">Mapped providers returning online slots</p>
                    </article>
                    <article className="admin-stat-card">
                      <h2 className="admin-stat-label">No slots</h2>
                      <p className="admin-stat-value">{formatNumber(athenaCoverage.summary.no_slots_found || 0)}</p>
                      <p className="admin-stat-copy">Mapped providers without returned slots</p>
                    </article>
                  </div>

                  {reviewRows.length === 0 ? (
                    <div className="admin-empty">All active providers have usable Athena mappings.</div>
                  ) : (
                    <div className="admin-record-list">
                      {reviewRows.slice(0, 18).map((row) => (
                        <article className="admin-record" key={row.slug}>
                          <div className="admin-record-identity">
                            <p className="admin-record-title">
                              {row.name} - {formatMappingStatus(row.status)}
                            </p>
                            <p className="admin-record-secondary">
                              {[
                                row.athenaProviderId ? `configured ID ${row.athenaProviderId}` : "no configured ID",
                                row.matchedAthenaProviderId
                                  ? `matched ${row.matchedAthenaName} (${row.matchedAthenaProviderId})`
                                  : "",
                                row.matchedDepartmentName
                                  ? `department ${row.matchedDepartmentName}`
                                  : "",
                                row.slotStatus ? `slot check ${formatMappingStatus(row.slotStatus)}` : "",
                                ...row.warnings,
                              ]
                                .filter(Boolean)
                                .join(" | ")}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Block and error codes</h2>
                  <p>Use these counts to tune privacy, rate-limit, and retrieval behavior.</p>
                </div>
              </div>
              {analytics.topCodes.length === 0 ? (
                <div className="admin-empty">No block or error codes in the last 30 days.</div>
              ) : (
                <div className="admin-record-list">
                  {analytics.topCodes.map((row) => (
                    <article className="admin-record" key={row.code || "unknown"}>
                      <div className="admin-record-identity">
                        <p className="admin-record-title">{row.code || "unknown"}</p>
                        <p className="admin-record-secondary">{formatNumber(getCountValue(row))} events</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Provider data quality</h2>
                  <p>Public profile fields that affect search ranking, cards, and appointment routing.</p>
                </div>
              </div>
              {!providerDataQuality.available ? (
                <div className="admin-empty">Provider data quality could not be loaded.</div>
              ) : (
                <>
                  <div className="admin-stat-stack ai-search-stat-grid">
                    <article className="admin-stat-card">
                      <h2 className="admin-stat-label">Complete</h2>
                      <p className="admin-stat-value">{formatNumber(providerDataQuality.complete)}</p>
                      <p className="admin-stat-copy">No public data gaps detected</p>
                    </article>
                    <article className="admin-stat-card">
                      <h2 className="admin-stat-label">Needs data</h2>
                      <p className="admin-stat-value">{formatNumber(providerDataQuality.rows.length)}</p>
                      <p className="admin-stat-copy">Missing fields to review</p>
                    </article>
                  </div>
                  {providerDataQuality.rows.length === 0 ? (
                    <div className="admin-empty">All active provider profiles have the key AI-search fields.</div>
                  ) : (
                    <div className="admin-record-list">
                      {providerDataQuality.rows.slice(0, 18).map((row) => (
                        <article className="admin-record" key={row.slug}>
                          <div className="admin-record-identity">
                            <p className="admin-record-title">{row.name}</p>
                            <p className="admin-record-secondary">{row.gaps.join(" | ")}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Recent feedback</h2>
                  <p>Only ratings, tags, and response metadata are shown here.</p>
                </div>
              </div>
              {analytics.recentFeedback.length === 0 ? (
                <div className="admin-empty">No feedback has been submitted yet.</div>
              ) : (
                <div className="admin-record-list">
                  {analytics.recentFeedback.map((event) => (
                    <article className="admin-record" key={event.id}>
                      <div className="admin-record-identity">
                        <p className="admin-record-title">
                          {event.feedbackRating === "helpful" ? "Helpful" : "Needs review"} - {event.intent || "general"}
                        </p>
                        <p className="admin-record-secondary">
                          {[
                            event.feedbackTags.join(", "),
                            event.aiConfidence ? `confidence: ${event.aiConfidence}` : "",
                            event.code ? `code: ${event.code}` : "",
                            `${event.sourceCount} sources`,
                            `${event.resultCount} results`,
                            event.appointmentOptionCount ? `${event.appointmentOptionCount} appointments` : "",
                            event.latencyMs ? `${event.latencyMs} ms` : "",
                            formatDate(event.feedbackCreatedAt || event.createdAt),
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </>
  );
}
