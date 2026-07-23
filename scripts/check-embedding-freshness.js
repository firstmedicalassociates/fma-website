#!/usr/bin/env node

const path = require('path');
const { pathToFileURL } = require('url');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

const MAX_AGE_DAYS = Math.max(Number(process.env.AI_SEARCH_EMBEDDING_MAX_AGE_DAYS) || 14, 1);
const HIDDEN_LOCATION_SLUGS = ['/location/laurel'];
const MANAGED_EMBEDDING_TYPES = new Set(['location', 'provider', 'service', 'post', 'policy']);
const EXPECTED_EMBEDDING_MODEL = 'text-embedding-3-small';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: requireEnv('DATABASE_URL'),
  }),
});

async function main() {
  const policyModuleUrl = pathToFileURL(
    path.resolve(__dirname, '../src/app/lib/ai-search-policy-documents.mjs')
  ).href;
  const { getActivePolicyDocuments, getPolicyEmbeddingId } = await import(policyModuleUrl);
  const [embeddingRows, locations, providers, services, posts] = await Promise.all([
    prisma.searchEmbedding.findMany({
      select: { id: true, metadata: true, updatedAt: true },
    }),
    prisma.location.findMany({
      where: { slug: { notIn: HIDDEN_LOCATION_SLUGS } },
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
      where: { status: 'PUBLISHED' },
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
    (row) => (Date.now() - row.updatedAt.getTime()) / (24 * 60 * 60 * 1000) > MAX_AGE_DAYS
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
  const oldestAgeDays = oldestUpdatedAt
    ? (Date.now() - oldestUpdatedAt.getTime()) / (24 * 60 * 60 * 1000)
    : null;
  const parity = expectedIds.size > 0 && missingIds.length === 0 && orphanIds.length === 0;
  const fresh =
    expectedRows.length === expectedIds.size &&
    staleRows.length === 0 &&
    modelMismatchRows.length === 0;

  console.log(
    JSON.stringify(
      {
        ok: parity && fresh,
        total: embeddingRows.length,
        expected: expectedIds.size,
        managed: managedRows.length,
        missing: missingIds.length,
        orphaned: orphanIds.length,
        stale: staleRows.length,
        embeddingModelMismatches: modelMismatchRows.length,
        embeddingModel: EXPECTED_EMBEDDING_MODEL,
        parity,
        oldestUpdatedAt: oldestUpdatedAt?.toISOString() || null,
        oldestAgeDays: Number.isFinite(oldestAgeDays)
          ? Number(oldestAgeDays.toFixed(2))
          : null,
        maxAgeDays: MAX_AGE_DAYS,
      },
      null,
      2
    )
  );

  if (!parity || !fresh) {
    throw new Error(
      `Search embeddings are out of sync (missing: ${missingIds.length}, orphaned: ${orphanIds.length}, stale: ${staleRows.length}, model mismatches: ${modelMismatchRows.length}). Run npm run index:embeddings.`
    );
  }
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
