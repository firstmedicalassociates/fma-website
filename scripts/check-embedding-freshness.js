#!/usr/bin/env node

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

const MAX_AGE_DAYS = Math.max(Number(process.env.AI_SEARCH_EMBEDDING_MAX_AGE_DAYS) || 14, 1);

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
  const total = await prisma.searchEmbedding.count();
  const newest = await prisma.searchEmbedding.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  if (total === 0 || !newest?.updatedAt) {
    throw new Error('SearchEmbedding is empty. Run npm run index:embeddings.');
  }

  const ageMs = Date.now() - newest.updatedAt.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  console.log(
    JSON.stringify(
      {
        ok: ageDays <= MAX_AGE_DAYS,
        total,
        newestUpdatedAt: newest.updatedAt.toISOString(),
        ageDays: Number(ageDays.toFixed(2)),
        maxAgeDays: MAX_AGE_DAYS,
      },
      null,
      2
    )
  );

  if (ageDays > MAX_AGE_DAYS) {
    throw new Error(`Search embeddings are stale. Run npm run index:embeddings.`);
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
