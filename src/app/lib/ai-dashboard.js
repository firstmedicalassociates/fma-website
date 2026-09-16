import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { eventWhere, PAGE_SIZE } from "./ai-dashboard-query.mjs";
import { fillDailyDates } from "./ai-spending-summary.mjs";
const safeNumber = (value) =>
  JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? Number(item) : item,
    ),
  );
const EVENT_SELECT = {
  id: true,
  createdAt: true,
  status: true,
  code: true,
  surface: true,
  intent: true,
  latencyMs: true,
  resultCount: true,
  sourceCount: true,
  appointmentOptionCount: true,
  availabilityStatus: true,
  aiConfidence: true,
  grounded: true,
  searchRoute: true,
  modelVersion: true,
  promptVersion: true,
  knowledgeVersion: true,
  sourceRefs: true,
  retrievalScore: true,
  feedbackRating: true,
  feedbackTags: true,
  feedbackReviewStatus: true,
  feedbackCreatedAt: true,
  feedbackQuerySnapshot: true,
  feedbackSnapshotStatus: true,
  telemetryVersion: true,
  bookingTargetCount: true,
};
function sqlFilter(query) {
  const conditions = [
    Prisma.sql`"createdAt" >= ${new Date(query.from)} AND "createdAt" < ${new Date(query.to)}`,
  ];
  // Column names come exclusively from the fixed mapping, never from client SQL.
  const columns = {
    status: '"status"',
    intent: '"intent"',
    surface: '"surface"',
    searchRoute: '"searchRoute"',
    modelVersion: '"modelVersion"',
    code: '"code"',
    feedbackRating: '"feedbackRating"',
    feedbackReviewStatus: '"feedbackReviewStatus"',
  };
  for (const [key, value] of Object.entries(query.filters))
    if (columns[key])
      conditions.push(Prisma.sql`${Prisma.raw(columns[key])} = ${value}`);
  return Prisma.join(conditions, " AND ");
}
async function overview(query) {
  const [data] = await prisma.$queryRaw(Prisma.sql`
    WITH filtered AS (SELECT id, "createdAt", status, intent, code, surface, "searchRoute", "modelVersion", "aiConfidence", grounded, "latencyMs", "feedbackRating", "availabilityStatus", "sourceRefs", "telemetryVersion", "bookingTargetCount" FROM "AiSearchEvent" WHERE ${sqlFilter(query)}),
    events AS (SELECT f.*, EXISTS(SELECT 1 FROM "AiSearchInteraction" i WHERE i."eventId" = f.id) AS clicked, EXISTS(SELECT 1 FROM "AiSearchInteraction" i WHERE i."eventId" = f.id AND i.type = 'booking') AS booked FROM filtered f)
    SELECT jsonb_build_object(
      'summary', (SELECT jsonb_build_object('total', count(*), 'answered', count(*) FILTER (WHERE status = 'answered'), 'degraded', count(*) FILTER (WHERE status = 'degraded'), 'blocked', count(*) FILTER (WHERE status = 'blocked'), 'failed', count(*) FILTER (WHERE status = 'failed'), 'noResults', count(*) FILTER (WHERE status = 'no_results'), 'providerMisses', count(*) FILTER (WHERE code = 'provider_like_unresolved'), 'grounded', count(*) FILTER (WHERE grounded AND status = 'answered'), 'helpful', count(*) FILTER (WHERE "feedbackRating" = 'helpful'), 'notHelpful', count(*) FILTER (WHERE "feedbackRating" = 'not_helpful'), 'avgLatencyMs', round(avg("latencyMs")), 'p95LatencyMs', percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs"), 'tracked', count(*) FILTER (WHERE "telemetryVersion" IS NOT NULL), 'clicked', count(*) FILTER (WHERE clicked), 'bookingEligible', count(*) FILTER (WHERE "bookingTargetCount" > 0), 'bookingClicked', count(*) FILTER (WHERE booked)) FROM events),
      'daily', (SELECT coalesce(jsonb_agg(d ORDER BY d.date), '[]'::jsonb) FROM (SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') date, count(*) total, count(*) FILTER (WHERE status = 'answered') answered, count(*) FILTER (WHERE status = 'failed') failed, count(*) FILTER (WHERE clicked) clicked FROM events GROUP BY 1) d),
      'intents', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT coalesce(intent, 'unknown') label, count(*) count FROM events GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 12) d),
      'surfaces', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT surface label, count(*) count FROM events GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 12) d),
      'routes', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT coalesce("searchRoute", 'unknown') label, count(*) count FROM events GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 12) d),
      'models', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT coalesce("modelVersion", 'unknown') label, count(*) count FROM events GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 12) d),
      'codes', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT code label, count(*) count FROM events WHERE code IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 12) d),
      'confidence', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT coalesce("aiConfidence", 'unknown') label, count(*) count FROM events GROUP BY 1 ORDER BY count(*) DESC, 1) d),
      'availability', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT "availabilityStatus" label, count(*) count FROM events WHERE "availabilityStatus" IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC, 1) d),
      'sources', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT unnest("sourceRefs") label, count(*) count FROM events GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 12) d),
      'clicks', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT i."targetRef" label, i.type, count(*) count FROM "AiSearchInteraction" i JOIN filtered f ON f.id = i."eventId" GROUP BY 1, 2 ORDER BY count(*) DESC, 1 LIMIT 12) d)
    ) AS data`);
  return {
    ...data.data,
    daily: fillDailyDates(data.data.daily, query.from, query.to),
    generatedAt: new Date().toISOString(),
  };
}
export const loadOverview = unstable_cache(overview, ["ai-overview-v2"], {
  revalidate: 60,
});
export async function loadActivity(query, feedback = false) {
  const where = eventWhere(query);
  if (feedback && !where.feedbackRating) where.feedbackRating = { not: null };
  const [total, rows] = await Promise.all([
    prisma.aiSearchEvent.count({ where }),
    prisma.aiSearchEvent.findMany({
      where,
      select: {
        ...EVENT_SELECT,
        evalCase: { select: { id: true, isActive: true } },
      },
      orderBy: feedback
        ? [{ feedbackCreatedAt: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      skip: (query.page - 1) * PAGE_SIZE,
    }),
  ]);
  return safeNumber({ total, page: query.page, pageSize: PAGE_SIZE, rows });
}
export async function loadEventDetail(id, showSpending = false) {
  return safeNumber(
    await prisma.aiSearchEvent.findUnique({
      where: { id },
      select: {
        ...EVENT_SELECT,
        feedbackAnswerSnapshot: true,
        feedbackReviewNotes: true,
        feedbackReviewedAt: true,
        feedbackReviewedBy: true,
        interactions: {
          select: { type: true, targetRef: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        ...(showSpending
          ? {
              apiUsage: {
                select: {
                  operation: true,
                  purpose: true,
                  model: true,
                  inputTokens: true,
                  cachedInputTokens: true,
                  outputTokens: true,
                  estimatedCostUsd: true,
                  status: true,
                  pricingVersion: true,
                },
              },
            }
          : {}),
      },
    }),
  );
}
async function estimatedSpending(query) {
  const [data] = await prisma.$queryRaw(Prisma.sql`
    WITH usage AS (SELECT * FROM "AiApiUsage" WHERE "createdAt" >= ${new Date(query.from)} AND "createdAt" < ${new Date(query.to)})
    SELECT jsonb_build_object(
      'summary', (SELECT jsonb_build_object('calls', count(*), 'knownCost', coalesce(sum("estimatedCostUsd"), 0), 'unknownCalls', count(*) FILTER (WHERE "estimatedCostUsd" IS NULL), 'inputTokens', sum("inputTokens"), 'cachedInputTokens', sum("cachedInputTokens"), 'outputTokens', sum("outputTokens"), 'searchCost', coalesce(sum("estimatedCostUsd") FILTER (WHERE purpose = 'search'), 0)) FROM usage),
      'daily', (SELECT coalesce(jsonb_agg(d ORDER BY d.date), '[]'::jsonb) FROM (SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') date, sum("estimatedCostUsd") cost, count(*) FILTER (WHERE "estimatedCostUsd" IS NULL) unknown FROM usage GROUP BY 1) d),
      'breakdown', (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM (SELECT purpose, operation, model, status, count(*) calls, sum("estimatedCostUsd") cost, count(*) FILTER (WHERE "estimatedCostUsd" IS NULL) unknown FROM usage GROUP BY 1, 2, 3, 4 ORDER BY sum("estimatedCostUsd") DESC NULLS LAST) d)
    ) AS data`);
  const coverage = await prisma.aiSearchEvent.groupBy({
    by: ["telemetryVersion"],
    where: { createdAt: { gte: new Date(query.from), lt: new Date(query.to) } },
    _count: { _all: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });
  const trackedSearches = coverage
    .filter((row) => row.telemetryVersion != null)
    .reduce((total, row) => total + row._count._all, 0);
  const historicalSearches = coverage
    .filter((row) => row.telemetryVersion == null)
    .reduce((total, row) => total + row._count._all, 0);
  const trackedGroups = coverage.filter((row) => row.telemetryVersion != null);
  return {
    ...data.data,
    trackedSearches,
    historicalSearches,
    firstTrackedAt: trackedGroups.length
      ? new Date(
          Math.min(...trackedGroups.map((row) => +row._min.createdAt)),
        ).toISOString()
      : null,
    latestTrackedAt: trackedGroups.length
      ? new Date(
          Math.max(...trackedGroups.map((row) => +row._max.createdAt)),
        ).toISOString()
      : null,
    generatedAt: new Date().toISOString(),
  };
}

export const loadEstimatedSpending = unstable_cache(
  estimatedSpending,
  ["ai-estimated-spending-v2"],
  { revalidate: 60 },
);
