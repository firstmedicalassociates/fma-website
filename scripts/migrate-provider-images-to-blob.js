require("dotenv/config");

const fs = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const sharp = require("sharp");
const { put } = require("@vercel/blob");

const PROVIDER_SEED_PATH = path.join(__dirname, "..", "prisma", "provider-seed-data.js");
const WORDPRESS_UPLOAD_RE = /\/wp-content\/uploads\//i;
const BLOB_URL_RE = /(?:^https?:\/\/).+\.blob\.vercel-storage\.com\//i;
const CONCURRENCY = 4;

function hasFlag(name) {
  return process.argv.includes(name);
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function isWordPressUploadUrl(value = "") {
  return WORDPRESS_UPLOAD_RE.test(cleanText(value));
}

function isBlobUrl(value = "") {
  return BLOB_URL_RE.test(cleanText(value));
}

function createPrismaClient() {
  const databaseUrl = cleanText(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to read and update provider image records.");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: databaseUrl }),
  });
}

async function downloadImage(provider) {
  const response = await fetch(provider.imageUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Codex Provider Image Blob Migration/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function buildProviderImageWebp(provider) {
  const imageBuffer = await downloadImage(provider);

  return sharp(imageBuffer)
    .rotate()
    .resize({
      width: 600,
      height: 600,
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 90 })
    .toBuffer();
}

async function uploadProviderImage(provider, token) {
  const webpBuffer = await buildProviderImageWebp(provider);
  const blob = await put(`providers/${provider.slug}.webp`, webpBuffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/webp",
    token,
  });

  return blob.url;
}

async function mapWithConcurrency(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function replaceAllLiteral(source, searchValue, replaceValue) {
  return source.split(searchValue).join(replaceValue);
}

async function updateProviderSeedData(migrations) {
  if (migrations.length === 0) return 0;

  let source = await fs.readFile(PROVIDER_SEED_PATH, "utf8");
  let replacementCount = 0;

  for (const migration of migrations) {
    if (!migration.oldUrl || !migration.newUrl || migration.oldUrl === migration.newUrl) continue;

    const before = source;
    source = replaceAllLiteral(source, migration.oldUrl, migration.newUrl);
    if (source !== before) replacementCount += 1;
  }

  if (replacementCount > 0) {
    await fs.writeFile(PROVIDER_SEED_PATH, source, "utf8");
  }

  return replacementCount;
}

async function auditProviders(prisma, includeInactive) {
  const providers = await prisma.provider.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      imageUrl: true,
      isActive: true,
    },
  });

  const counts = providers.reduce(
    (summary, provider) => {
      const imageUrl = cleanText(provider.imageUrl);
      summary.total += 1;
      if (!imageUrl) summary.missing += 1;
      else if (isWordPressUploadUrl(imageUrl)) summary.wordpress += 1;
      else if (isBlobUrl(imageUrl)) summary.blob += 1;
      else if (/^https?:\/\//i.test(imageUrl)) summary.otherRemote += 1;
      else summary.local += 1;
      return summary;
    },
    {
      total: 0,
      wordpress: 0,
      blob: 0,
      local: 0,
      otherRemote: 0,
      missing: 0,
    }
  );

  return { providers, counts };
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const includeInactive = hasFlag("--all");
  const skipSeedUpdate = hasFlag("--skip-seed-update");
  const token = cleanText(process.env.BLOB_READ_WRITE_TOKEN);
  const prisma = createPrismaClient();

  try {
    const { providers, counts } = await auditProviders(prisma, includeInactive);
    const targets = providers.filter((provider) => isWordPressUploadUrl(provider.imageUrl));

    console.log(`Providers checked: ${counts.total}`);
    console.log(`Blob URLs: ${counts.blob}`);
    console.log(`WordPress URLs: ${counts.wordpress}`);
    console.log(`Other remote URLs: ${counts.otherRemote}`);
    console.log(`Local URLs: ${counts.local}`);
    console.log(`Missing URLs: ${counts.missing}`);

    if (targets.length === 0) {
      console.log("No WordPress provider images found.");
      return;
    }

    if (dryRun) {
      console.log("\nProviders that would be migrated:");
      for (const provider of targets) {
        console.log(`- ${provider.name} (${provider.slug})`);
      }
      return;
    }

    if (!token) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN is required for upload. Add it to .env, then run this script again."
      );
    }

    const migrations = [];
    const failures = [];

    await mapWithConcurrency(targets, async (provider, index) => {
      const label = `[${index + 1}/${targets.length}] ${provider.name} (${provider.slug})`;

      try {
        console.log(`${label}: uploading`);
        const oldUrl = provider.imageUrl;
        const newUrl = await uploadProviderImage(provider, token);

        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            imageUrl: newUrl,
          },
        });

        migrations.push({
          slug: provider.slug,
          name: provider.name,
          oldUrl,
          newUrl,
        });
        console.log(`${label}: updated`);
      } catch (error) {
        failures.push({
          slug: provider.slug,
          name: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`${label}: failed - ${failures[failures.length - 1].error}`);
      }
    });

    if (!skipSeedUpdate) {
      const seedReplacements = await updateProviderSeedData(migrations);
      console.log(`Provider seed URL replacements: ${seedReplacements}`);
    }

    const after = await auditProviders(prisma, includeInactive);
    console.log(`Remaining WordPress provider image URLs: ${after.counts.wordpress}`);

    if (failures.length > 0 || after.counts.wordpress > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
