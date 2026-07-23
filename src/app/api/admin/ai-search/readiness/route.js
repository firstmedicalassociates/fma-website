import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import {
  getActivePolicyDocuments,
  getPolicyEmbeddingId,
} from "../../../../lib/ai-search-policy-documents.mjs";
import { VISIBLE_LOCATION_WHERE } from "../../../../lib/locations";
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
const MANAGED_EMBEDDING_TYPES = new Set(["location", "provider", "service", "post", "policy"]);
const EXPECTED_EMBEDDING_MODEL = "text-embedding-3-small";

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

  const [embeddingRows, indexes, locations, providers, services, posts] = await Promise.all([
    prisma.searchEmbedding.findMany({
      select: { id: true, metadata: true, updatedAt: true },
    }),
    prisma.$queryRawUnsafe(
      `SELECT indexname::text AS indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'SearchEmbedding'
       ORDER BY indexname`
    ),
    prisma.location.findMany({
      where: VISIBLE_LOCATION_WHERE,
      select: { id: true },
    }),
    prisma.provider.findMany({
      where: { isActive: true },
      select: { id: true },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      select: { id: true },
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true },
    }),
  ]);

  const expectedIds = new Set([
    ...locations.map((location) => `location-${location.id}`),
    ...providers.map((provider) => `provider-${provider.id}`),
    ...services.map((service) => `service-${service.id}`),
    ...posts.map((post) => `post-${post.id}`),
    ...getActivePolicyDocuments().map(getPolicyEmbeddingId),
  ]);
  const managedRows = embeddingRows.filter((row) =>
    MANAGED_EMBEDDING_TYPES.has(row.metadata?.type)
  );
  const managedIds = new Set(managedRows.map((row) => row.id));
  const missingIds = [...expectedIds].filter((id) => !managedIds.has(id));
  const orphanIds = managedRows.filter((row) => !expectedIds.has(row.id)).map((row) => row.id);
  const expectedRows = managedRows.filter((row) => expectedIds.has(row.id));
  const staleRows = expectedRows.filter(
    (row) =>
      (Date.now() - row.updatedAt.getTime()) / (24 * 60 * 60 * 1000) >
      EMBEDDING_MAX_AGE_DAYS
  );
  const modelMismatchRows = expectedRows.filter(
    (row) =>
      String(row.metadata?.embeddingModel || EXPECTED_EMBEDDING_MODEL) !==
      EXPECTED_EMBEDDING_MODEL
  );
  const oldestUpdatedAt =
    expectedRows.length > 0
      ? expectedRows.reduce(
          (oldest, row) => (row.updatedAt < oldest ? row.updatedAt : oldest),
          expectedRows[0].updatedAt
        )
      : null;
  const indexNames = indexes.map((row) => row.indexname).filter(Boolean);
  const hasHnswIndex = indexNames.includes("SearchEmbedding_embedding_hnsw_idx");
  const hasMetadataTypeIndex = indexNames.includes("SearchEmbedding_metadata_type_idx");
  const ageDays = oldestUpdatedAt
    ? (Date.now() - oldestUpdatedAt.getTime()) / (24 * 60 * 60 * 1000)
    : null;
  const parity =
    expectedIds.size > 0 && missingIds.length === 0 && orphanIds.length === 0;
  const fresh =
    expectedRows.length === expectedIds.size &&
    staleRows.length === 0 &&
    modelMismatchRows.length === 0;

  return {
    ok: parity && hasHnswIndex && hasMetadataTypeIndex && fresh,
    totalEmbeddings: embeddingRows.length,
    expectedEmbeddings: expectedIds.size,
    managedEmbeddings: managedRows.length,
    missingEmbeddings: missingIds.length,
    orphanEmbeddings: orphanIds.length,
    staleEmbeddings: staleRows.length,
    embeddingModelMismatches: modelMismatchRows.length,
    embeddingModel: EXPECTED_EMBEDDING_MODEL,
    parity,
    oldestUpdatedAt: oldestUpdatedAt ? oldestUpdatedAt.toISOString() : null,
    oldestAgeDays: Number.isFinite(ageDays) ? Number(ageDays.toFixed(2)) : null,
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
