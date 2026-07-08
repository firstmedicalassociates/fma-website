#!/usr/bin/env node

/**
 * Generate and store embeddings for public AI search content.
 *
 * This script intentionally writes vector values with raw SQL because Prisma
 * exposes pgvector columns as Unsupported("vector(1536)").
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { OpenAI } = require('openai');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const WRITE_DELAY_MS = 200;
const HIDDEN_LOCATION_SLUGS = ['/location/laurel'];
const QUARANTINE_OUTPUT_PATH = path.resolve(
  __dirname,
  '../artifacts/ai-search/embedding-phi-quarantine.json'
);
const embeddingPhiQuarantine = [];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: requireEnv('DATABASE_URL'),
  }),
});

const openai = new OpenAI({
  apiKey: requireEnv('OPENAI_API_KEY'),
});

function cleanPath(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  const withLeadingSlash = text.startsWith('/') ? text : `/${text}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/');
}

function buildLocationUrl(slug = '') {
  const pathValue = cleanPath(slug);
  if (!pathValue) return '/locations';
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  if (pathValue.includes('/location/')) {
    return cleanPath(pathValue.slice(pathValue.indexOf('/location/')));
  }
  if (pathValue.includes('/locations/')) {
    return cleanPath(pathValue.slice(pathValue.indexOf('/locations/')));
  }
  return cleanPath(`/location/${pathValue.replace(/^\/+/, '')}`);
}

function buildProviderUrl(slug = '') {
  const pathValue = cleanPath(slug).replace(/^\/+/, '');
  if (!pathValue) return '/providers';
  if (pathValue.startsWith('providers/')) return `/${pathValue}`;
  if (pathValue.startsWith('provider/')) return `/${pathValue.replace(/^provider\//, 'providers/')}`;
  return `/providers/${pathValue}`;
}

function buildServiceUrl(slug = '') {
  const pathValue = cleanPath(slug).replace(/^\/+/, '');
  if (!pathValue) return '/services';
  if (pathValue.startsWith('service/')) return `/${pathValue}`;
  if (pathValue.startsWith('services/')) return `/${pathValue.replace(/^services\//, 'service/')}`;
  return `/service/${pathValue}`;
}

function buildPostUrl(slug = '') {
  const pathValue = cleanPath(slug).replace(/^\/+/, '');
  if (!pathValue) return '/blog';
  if (pathValue.startsWith('blog/')) return `/${pathValue}`;
  return `/blog/${pathValue}`;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

function getPublicContentPhiRisk(content) {
  const text = String(content || '');
  const patterns = [
    { category: 'date_of_birth', pattern: /\b(date of birth|dob|birthdate|birthday)\b/i },
    {
      category: 'date_of_birth',
      pattern:
        /\b(?:born|birth(?:day|date)?|dob)\b.{0,40}\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
    },
    { category: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/i },
    { category: 'ssn', pattern: /\b(ssn|social security)\b/i },
    {
      category: 'insurance_or_record_id',
      pattern: /\b(member id|insurance id|policy number|claim number|medical record number|mrn)\b/i,
    },
    { category: 'account_number', pattern: /\b(account number|account #|acct number|acct #)\b/i },
    { category: 'device_identifier', pattern: /\b(device id|device serial|serial number)\b/i },
    { category: 'device_identifier', pattern: /\b(?:sn|serial)\s*[:#-]?\s*[a-z0-9-]{6,}\b/i },
    { category: 'email_address', pattern: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
    {
      category: 'age_89_or_older',
      pattern:
        /\b(?:patient|my mother|my father|my parent|my wife|my husband|resident)\s+(?:is|age)?\s*(?:89|9\d|1\d{2})\b/i,
    },
    {
      category: 'patient_specific_medical_detail',
      pattern:
        /\b(?:patient|my son|my daughter|my child|my wife|my husband|my mother|my father)\b.{0,80}\b(?:diagnosed|diagnosis|takes|medication|test result|lab result|symptoms?|strep throat|diabetes|insulin)\b/i,
    },
  ];
  const categories = patterns
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.category);
  const uniqueCategories = [...new Set(categories)];

  return {
    hasPotentialPhi: uniqueCategories.length > 0,
    categories: uniqueCategories,
    severity: uniqueCategories.length > 0 ? 'high' : 'none',
  };
}

async function hasPotentialEmbeddingPhi({ type, id, title, content }) {
  const risk = getPublicContentPhiRisk(content);
  if (!risk.hasPotentialPhi) return false;

  embeddingPhiQuarantine.push({
    type,
    id,
    title,
    categories: risk.categories,
    severity: risk.severity,
  });

  return true;
}

function writePhiQuarantineReport() {
  if (embeddingPhiQuarantine.length === 0) return;

  fs.mkdirSync(path.dirname(QUARANTINE_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    QUARANTINE_OUTPUT_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        items: embeddingPhiQuarantine,
      },
      null,
      2
    )}\n`
  );
  console.error(`Potential PHI quarantine report written: ${QUARANTINE_OUTPUT_PATH}`);
}

async function upsertEmbedding(id, content, metadata, embedding) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "SearchEmbedding" (id, content, embedding, metadata, "createdAt", "updatedAt")
     VALUES ($1, $2, $3::vector, $4::jsonb, NOW(), NOW())
     ON CONFLICT(id) DO UPDATE SET
     content = $2, embedding = $3::vector, metadata = $4::jsonb, "updatedAt" = NOW()`,
    id,
    content,
    `[${embedding.join(',')}]`,
    JSON.stringify(metadata)
  );
}

function createResult(total) {
  return {
    count: 0,
    errors: [],
    total,
  };
}

async function indexLocations() {
  const locations = await prisma.location.findMany({
    where: {
      slug: {
        notIn: HIDDEN_LOCATION_SLUGS,
      },
    },
    orderBy: { title: 'asc' },
  });
  const result = createResult(locations.length);

  console.log(`Indexing ${locations.length} locations...`);

  for (const location of locations) {
    const content = [
      location.title,
      location.accent,
      location.intro,
      location.address,
      location.parkingDescription,
    ]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      if (
        await hasPotentialEmbeddingPhi({
          type: 'location',
          id: location.id,
          title: location.title,
          content,
        })
      ) {
        result.errors.push(`${location.title}: skipped potential PHI in public content`);
        console.error(`  Skipped location ${location.title}: potential PHI in public content`);
        continue;
      }

      const embedding = await generateEmbedding(content);
      const url = buildLocationUrl(location.slug);

      await upsertEmbedding(
        `location-${location.id}`,
        content,
        {
          type: 'location',
          sourceId: location.id,
          slug: url,
          url,
          title: location.title,
        },
        embedding
      );

      result.count += 1;
      console.log(`  Indexed location: ${location.title}`);
      await sleep(WRITE_DELAY_MS);
    } catch (error) {
      result.errors.push(`${location.title}: ${error.message}`);
      console.error(`  Failed location ${location.title}: ${error.message}`);
    }
  }

  return result;
}

async function indexProviders() {
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const result = createResult(providers.length);

  console.log(`Indexing ${providers.length} active providers...`);

  for (const provider of providers) {
    const content = [provider.name, provider.title, provider.bio]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      if (
        await hasPotentialEmbeddingPhi({
          type: 'provider',
          id: provider.id,
          title: provider.name,
          content,
        })
      ) {
        result.errors.push(`${provider.name}: skipped potential PHI in public content`);
        console.error(`  Skipped provider ${provider.name}: potential PHI in public content`);
        continue;
      }

      const embedding = await generateEmbedding(content);

      await upsertEmbedding(
        `provider-${provider.id}`,
        content,
        {
          type: 'provider',
          sourceId: provider.id,
          slug: provider.slug,
          url: buildProviderUrl(provider.slug),
          title: provider.name,
          locations: provider.locations,
        },
        embedding
      );

      result.count += 1;
      console.log(`  Indexed provider: ${provider.name}`);
      await sleep(WRITE_DELAY_MS);
    } catch (error) {
      result.errors.push(`${provider.name}: ${error.message}`);
      console.error(`  Failed provider ${provider.name}: ${error.message}`);
    }
  }

  return result;
}

async function indexServices() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
  const result = createResult(services.length);

  console.log(`Indexing ${services.length} active services...`);

  for (const service of services) {
    let content = [service.title, service.description, service.category]
      .filter(Boolean)
      .join(' ');

    if (service.pageContent) {
      const pageContent = service.pageContent;
      if (pageContent.heroDescription) content += ` ${pageContent.heroDescription}`;
      if (Array.isArray(pageContent.infoParagraphs)) {
        content += ` ${pageContent.infoParagraphs.join(' ')}`;
      }
      if (Array.isArray(pageContent.features)) {
        content += ` ${pageContent.features.map((feature) => feature.title).filter(Boolean).join(' ')}`;
      }
    }

    if (!content.trim()) continue;
    content = content.substring(0, 2000);

    try {
      if (
        await hasPotentialEmbeddingPhi({
          type: 'service',
          id: service.id,
          title: service.title,
          content,
        })
      ) {
        result.errors.push(`${service.title}: skipped potential PHI in public content`);
        console.error(`  Skipped service ${service.title}: potential PHI in public content`);
        continue;
      }

      const embedding = await generateEmbedding(content);

      await upsertEmbedding(
        `service-${service.id}`,
        content,
        {
          type: 'service',
          sourceId: service.id,
          slug: service.slug,
          url: buildServiceUrl(service.slug),
          title: service.title,
          category: service.category,
        },
        embedding
      );

      result.count += 1;
      console.log(`  Indexed service: ${service.title}`);
      await sleep(WRITE_DELAY_MS);
    } catch (error) {
      result.errors.push(`${service.title}: ${error.message}`);
      console.error(`  Failed service ${service.title}: ${error.message}`);
    }
  }

  return result;
}

async function indexBlogPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }, { title: 'asc' }],
  });
  const result = createResult(posts.length);

  console.log(`Indexing ${posts.length} published posts...`);

  for (const post of posts) {
    const content = [post.title, post.excerpt, post.metaDescription]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      if (
        await hasPotentialEmbeddingPhi({
          type: 'post',
          id: post.id,
          title: post.title,
          content,
        })
      ) {
        result.errors.push(`${post.title}: skipped potential PHI in public content`);
        console.error(`  Skipped post ${post.title}: potential PHI in public content`);
        continue;
      }

      const embedding = await generateEmbedding(content);

      await upsertEmbedding(
        `post-${post.id}`,
        content,
        {
          type: 'post',
          sourceId: post.id,
          slug: post.slug,
          url: buildPostUrl(post.slug),
          title: post.title,
        },
        embedding
      );

      result.count += 1;
      console.log(`  Indexed post: ${post.title}`);
      await sleep(WRITE_DELAY_MS);
    } catch (error) {
      result.errors.push(`${post.title}: ${error.message}`);
      console.error(`  Failed post ${post.title}: ${error.message}`);
    }
  }

  return result;
}

async function main() {
  const results = {};

  try {
    console.log('Starting AI search embedding indexing...');

    results.locations = await indexLocations();
    results.providers = await indexProviders();
    results.services = await indexServices();
    results.posts = await indexBlogPosts();

    const totalIndexed =
      results.locations.count +
      results.providers.count +
      results.services.count +
      results.posts.count;
    const totalRows = await prisma.searchEmbedding.count();
    const totalErrors = Object.values(results).reduce(
      (sum, result) => sum + result.errors.length,
      0
    );

    console.log(`Indexing complete. Indexed ${totalIndexed} items. SearchEmbedding rows: ${totalRows}.`);

    if (totalErrors > 0) {
      console.error(`Completed with ${totalErrors} item errors.`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Indexing failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    writePhiQuarantineReport();
    await prisma.$disconnect();
  }
}

main();
