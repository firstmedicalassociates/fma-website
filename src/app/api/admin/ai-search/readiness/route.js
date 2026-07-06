import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { isDatabaseConfigured, prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_ENV_KEYS = ["OPENAI_API_KEY"];
const ANALYTICS_ENV_KEYS = ["AI_SEARCH_EVENT_SECRET"];
const RATE_LIMIT_ENV_KEYS = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
const ATHENA_ENV_KEYS = [
  "ATHENA_CLIENT_ID",
  "ATHENA_CLIENT_SECRET",
  "ATHENA_BASE_URL",
  "ATHENA_DEFAULT_SCOPE",
  "ATHENA_DEFAULT_PRACTICE_ID",
];
const EMBEDDING_MAX_AGE_DAYS = Math.max(
  Number(process.env.AI_SEARCH_EMBEDDING_MAX_AGE_DAYS) || 14,
  1
);

function hasEnvValue(key) {
  return Boolean(process.env[key]?.trim());
}

function buildEnvCheck(keys) {
  const missing = keys.filter((key) => !hasEnvValue(key));
  return {
    ok: missing.length === 0,
    required: keys.length,
    configured: keys.length - missing.length,
    missing,
  };
}

function getErrorCode(error) {
  return error?.code || error?.name || "check_failed";
}

async function safeCheck(check) {
  try {
    return await check();
  } catch (error) {
    return {
      ok: false,
      error: getErrorCode(error),
    };
  }
}

async function checkDatabase() {
  if (!isDatabaseConfigured) {
    return { ok: false, error: "database_url_missing" };
  }

  const rows = await prisma.$queryRaw`SELECT 1::int AS ok`;
  return {
    ok: Number(rows?.[0]?.ok) === 1,
  };
}

async function checkAnalyticsTable() {
  if (!prisma?.aiSearchEvent?.count) {
    return { ok: false, error: "model_missing" };
  }

  const total = await prisma.aiSearchEvent.count();
  return {
    ok: true,
    totalEvents: total,
  };
}

async function checkVectorExtension() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT extversion::text AS extversion
     FROM pg_extension
     WHERE extname = 'vector'`
  );
  const version = rows?.[0]?.extversion || null;

  return {
    ok: Boolean(version),
    version,
  };
}

async function checkSearchEmbeddings() {
  if (!prisma?.searchEmbedding?.count) {
    return { ok: false, error: "model_missing" };
  }

  const [totalEmbeddings, newestEmbedding, indexes] = await Promise.all([
    prisma.searchEmbedding.count(),
    prisma.searchEmbedding.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.$queryRawUnsafe(
      `SELECT indexname::text AS indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'SearchEmbedding'
       ORDER BY indexname`
    ),
  ]);

  const indexNames = indexes.map((row) => row.indexname).filter(Boolean);
  const hasHnswIndex = indexNames.includes("SearchEmbedding_embedding_hnsw_idx");
  const hasMetadataTypeIndex = indexNames.includes("SearchEmbedding_metadata_type_idx");
  const newestUpdatedAt = newestEmbedding?.updatedAt || null;
  const ageDays = newestUpdatedAt
    ? (Date.now() - newestUpdatedAt.getTime()) / (24 * 60 * 60 * 1000)
    : null;
  const fresh = Number.isFinite(ageDays) && ageDays <= EMBEDDING_MAX_AGE_DAYS;

  return {
    ok: totalEmbeddings > 0 && hasHnswIndex && hasMetadataTypeIndex && fresh,
    totalEmbeddings,
    newestUpdatedAt: newestUpdatedAt ? newestUpdatedAt.toISOString() : null,
    ageDays: Number.isFinite(ageDays) ? Number(ageDays.toFixed(2)) : null,
    maxAgeDays: EMBEDDING_MAX_AGE_DAYS,
    fresh,
    hasHnswIndex,
    hasMetadataTypeIndex,
    indexes: indexNames,
  };
}

function everyCheckReady(checks) {
  return Object.values(checks).every((check) => {
    if (!check || typeof check !== "object") return false;
    if ("ok" in check) return check.ok === true;
    return everyCheckReady(check);
  });
}

export async function GET(request) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const checks = {
    configuration: {
      openai: buildEnvCheck(OPENAI_ENV_KEYS),
      analytics: buildEnvCheck(ANALYTICS_ENV_KEYS),
      rateLimit: buildEnvCheck(RATE_LIMIT_ENV_KEYS),
      athena: buildEnvCheck(ATHENA_ENV_KEYS),
    },
    database: await safeCheck(checkDatabase),
    analytics: await safeCheck(checkAnalyticsTable),
    pgvector: await safeCheck(checkVectorExtension),
    embeddings: await safeCheck(checkSearchEmbeddings),
  };

  const ok = everyCheckReady(checks);

  return NextResponse.json(
    {
      ok,
      status: ok ? "ready" : "degraded",
      generatedAt: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
