import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { requireAdminRequest } from '../../../lib/admin-auth';
import {
  AI_SEARCH_KNOWLEDGE_VERSION,
  getActivePolicyDocuments,
  getPolicyDocumentContent,
  getPolicyEmbeddingId,
} from '../../../lib/ai-search-policy-documents.mjs';
import { VISIBLE_LOCATION_WHERE } from '../../../lib/locations';
import { getPublicContentPhiRisk } from '../../../lib/no-phi-guard';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let openai;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MANAGED_EMBEDDING_TYPES = new Set(['location', 'provider', 'service', 'post', 'policy']);

function cleanPath(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  const withLeadingSlash = text.startsWith('/') ? text : `/${text}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/');
}

function buildLocationUrl(slug = '') {
  const path = cleanPath(slug);
  if (!path) return '/locations';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.includes('/location/')) {
    return cleanPath(path.slice(path.indexOf('/location/')));
  }
  if (path.includes('/locations/')) {
    return cleanPath(path.slice(path.indexOf('/locations/')));
  }
  return cleanPath(`/location/${path.replace(/^\/+/, '')}`);
}

function buildProviderUrl(slug = '') {
  const path = cleanPath(slug).replace(/^\/+/, '');
  if (!path) return '/providers';
  if (path.startsWith('providers/')) return `/${path}`;
  if (path.startsWith('provider/')) return `/${path.replace(/^provider\//, 'providers/')}`;
  return `/providers/${path}`;
}

function buildServiceUrl(slug = '') {
  const path = cleanPath(slug).replace(/^\/+/, '');
  if (!path) return '/services';
  if (path.startsWith('service/')) return `/${path}`;
  if (path.startsWith('services/')) return `/${path.replace(/^services\//, 'service/')}`;
  return `/service/${path}`;
}

function buildPostUrl(slug = '') {
  const path = cleanPath(slug).replace(/^\/+/, '');
  if (!path) return '/blog';
  if (path.startsWith('blog/')) return `/${path}`;
  return `/blog/${path}`;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateEmbedding(text) {
  if (!text || !text.trim()) return null;

  try {
    const client = getOpenAI();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    return null;
  }
}

function getEmbeddingPhiRisk(content) {
  const risk = getPublicContentPhiRisk(content);
  return risk.hasPotentialPhi ? risk : null;
}

async function reuseEmbeddingIfUnchanged(db, id, content, metadata) {
  const rows = await db.$queryRawUnsafe(
    `UPDATE "SearchEmbedding"
     SET metadata = $3::jsonb, "updatedAt" = NOW()
     WHERE id = $1
       AND content = $2
       AND COALESCE(metadata->>'embeddingModel', 'text-embedding-3-small') = $4
       AND embedding IS NOT NULL
     RETURNING id`,
    id,
    content,
    JSON.stringify(metadata),
    EMBEDDING_MODEL
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indexLocations(db) {
  const locations = await db.location.findMany({ where: VISIBLE_LOCATION_WHERE });
  let count = 0;
  const errors = [];
  const expectedIds = [];
  let reused = 0;

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

    if (!content.trim()) {
      continue;
    }

    try {
      const phiRisk = getEmbeddingPhiRisk(content);
      if (phiRisk) {
        errors.push(`${location.title}: skipped potential PHI in public content (${phiRisk.categories.join(', ')})`);
        continue;
      }

      const embeddingId = `location-${location.id}`;
      expectedIds.push(embeddingId);
      const metadata = {
        type: 'location',
        embeddingModel: EMBEDDING_MODEL,
        sourceId: location.id,
        slug: buildLocationUrl(location.slug),
        url: buildLocationUrl(location.slug),
        title: location.title,
      };
      if (await reuseEmbeddingIfUnchanged(db, embeddingId, content, metadata)) {
        count++;
        reused++;
        continue;
      }
      const embedding = await generateEmbedding(content);
      if (!embedding) {
        errors.push(`${location.title}: no embedding generated`);
        continue;
      }

      await db.$executeRawUnsafe(
        `INSERT INTO "SearchEmbedding" (id, content, embedding, metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::vector, $4::jsonb, NOW(), NOW())
         ON CONFLICT(id) DO UPDATE SET
         content = $2, embedding = $3::vector, metadata = $4::jsonb, "updatedAt" = NOW()`,
        embeddingId,
        content,
        `[${embedding.join(',')}]`,
        JSON.stringify(metadata)
      );

      count++;
      await sleep(200);
    } catch (error) {
      errors.push(`${location.title}: ${error.message}`);
    }
  }

  return { count, errors, expectedIds, reused, total: locations.length };
}

async function indexProviders(db) {
  const providers = await db.provider.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  let count = 0;
  const errors = [];
  const expectedIds = [];
  let reused = 0;

  for (const provider of providers) {
    const content = [provider.name, provider.title, provider.bio]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      const phiRisk = getEmbeddingPhiRisk(content);
      if (phiRisk) {
        errors.push(`${provider.name}: skipped potential PHI in public content (${phiRisk.categories.join(', ')})`);
        continue;
      }

      const embeddingId = `provider-${provider.id}`;
      expectedIds.push(embeddingId);
      const metadata = {
        type: 'provider',
        embeddingModel: EMBEDDING_MODEL,
        sourceId: provider.id,
        slug: provider.slug,
        url: buildProviderUrl(provider.slug),
        title: provider.name,
        locations: provider.locations,
      };
      if (await reuseEmbeddingIfUnchanged(db, embeddingId, content, metadata)) {
        count++;
        reused++;
        continue;
      }
      const embedding = await generateEmbedding(content);
      if (!embedding) {
        errors.push(`${provider.name}: no embedding generated`);
        continue;
      }

      await db.$executeRawUnsafe(
        `INSERT INTO "SearchEmbedding" (id, content, embedding, metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::vector, $4::jsonb, NOW(), NOW())
         ON CONFLICT(id) DO UPDATE SET
         content = $2, embedding = $3::vector, metadata = $4::jsonb, "updatedAt" = NOW()`,
        embeddingId,
        content,
        `[${embedding.join(',')}]`,
        JSON.stringify(metadata)
      );

      count++;
      await sleep(200);
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  return { count, errors, expectedIds, reused, total: providers.length };
}

async function indexServices(db) {
  const services = await db.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
  let count = 0;
  const errors = [];
  const expectedIds = [];
  let reused = 0;

  for (const service of services) {
    let content = [service.title, service.description, service.category]
      .filter(Boolean)
      .join(' ');

    if (service.pageContent) {
      const pageContent = service.pageContent;
      if (pageContent.heroDescription)
        content += ' ' + pageContent.heroDescription;
      if (pageContent.infoParagraphs)
        content += ' ' + pageContent.infoParagraphs.join(' ');
      if (pageContent.features)
        content += ' ' + pageContent.features.map((f) => f.title).join(' ');
    }

    if (!content.trim()) continue;
    content = content.substring(0, 2000);

    try {
      const phiRisk = getEmbeddingPhiRisk(content);
      if (phiRisk) {
        errors.push(`${service.title}: skipped potential PHI in public content (${phiRisk.categories.join(', ')})`);
        continue;
      }

      const embeddingId = `service-${service.id}`;
      expectedIds.push(embeddingId);
      const metadata = {
        type: 'service',
        embeddingModel: EMBEDDING_MODEL,
        sourceId: service.id,
        slug: service.slug,
        url: buildServiceUrl(service.slug),
        title: service.title,
        category: service.category,
      };
      if (await reuseEmbeddingIfUnchanged(db, embeddingId, content, metadata)) {
        count++;
        reused++;
        continue;
      }
      const embedding = await generateEmbedding(content);
      if (!embedding) {
        errors.push(`${service.title}: no embedding generated`);
        continue;
      }

      await db.$executeRawUnsafe(
        `INSERT INTO "SearchEmbedding" (id, content, embedding, metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::vector, $4::jsonb, NOW(), NOW())
         ON CONFLICT(id) DO UPDATE SET
         content = $2, embedding = $3::vector, metadata = $4::jsonb, "updatedAt" = NOW()`,
        embeddingId,
        content,
        `[${embedding.join(',')}]`,
        JSON.stringify(metadata)
      );

      count++;
      await sleep(200);
    } catch (error) {
      errors.push(`${service.title}: ${error.message}`);
    }
  }

  return { count, errors, expectedIds, reused, total: services.length };
}

async function indexBlogPosts(db) {
  const posts = await db.blogPost.findMany({
    where: { status: 'PUBLISHED' },
  });
  let count = 0;
  const errors = [];
  const expectedIds = [];
  let reused = 0;

  for (const post of posts) {
    const content = [post.title, post.excerpt, post.metaDescription]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      const phiRisk = getEmbeddingPhiRisk(content);
      if (phiRisk) {
        errors.push(`${post.title}: skipped potential PHI in public content (${phiRisk.categories.join(', ')})`);
        continue;
      }

      const embeddingId = `post-${post.id}`;
      expectedIds.push(embeddingId);
      const metadata = {
        type: 'post',
        embeddingModel: EMBEDDING_MODEL,
        sourceId: post.id,
        slug: post.slug,
        url: buildPostUrl(post.slug),
        title: post.title,
      };
      if (await reuseEmbeddingIfUnchanged(db, embeddingId, content, metadata)) {
        count++;
        reused++;
        continue;
      }
      const embedding = await generateEmbedding(content);
      if (!embedding) {
        errors.push(`${post.title}: no embedding generated`);
        continue;
      }

      await db.$executeRawUnsafe(
        `INSERT INTO "SearchEmbedding" (id, content, embedding, metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::vector, $4::jsonb, NOW(), NOW())
         ON CONFLICT(id) DO UPDATE SET
         content = $2, embedding = $3::vector, metadata = $4::jsonb, "updatedAt" = NOW()`,
        embeddingId,
        content,
        `[${embedding.join(',')}]`,
        JSON.stringify(metadata)
      );

      count++;
      await sleep(200);
    } catch (error) {
      errors.push(`${post.title}: ${error.message}`);
    }
  }

  return { count, errors, expectedIds, reused, total: posts.length };
}

async function indexPolicyDocuments(db) {
  const documents = getActivePolicyDocuments();
  let count = 0;
  const errors = [];
  const expectedIds = [];
  let reused = 0;

  for (const document of documents) {
    const content = getPolicyDocumentContent(document);
    const embeddingId = getPolicyEmbeddingId(document);

    try {
      const phiRisk = getEmbeddingPhiRisk(content);
      if (phiRisk) {
        errors.push(
          `${document.title}: skipped potential PHI in public content (${phiRisk.categories.join(', ')})`
        );
        continue;
      }

      expectedIds.push(embeddingId);
      const metadata = {
        type: 'policy',
        embeddingModel: EMBEDDING_MODEL,
        sourceId: document.id,
        slug: document.sourceUrl,
        url: document.sourceUrl,
        title: document.title,
        category: document.category,
        sourceVersion: document.sourceVersion,
        knowledgeVersion: AI_SEARCH_KNOWLEDGE_VERSION,
      };
      if (await reuseEmbeddingIfUnchanged(db, embeddingId, content, metadata)) {
        count++;
        reused++;
        continue;
      }
      const embedding = await generateEmbedding(content);
      if (!embedding) {
        errors.push(`${document.title}: no embedding generated`);
        continue;
      }

      await db.$executeRawUnsafe(
        `INSERT INTO "SearchEmbedding" (id, content, embedding, metadata, "createdAt", "updatedAt")
         VALUES ($1, $2, $3::vector, $4::jsonb, NOW(), NOW())
         ON CONFLICT(id) DO UPDATE SET
         content = $2, embedding = $3::vector, metadata = $4::jsonb, "updatedAt" = NOW()`,
        embeddingId,
        content,
        `[${embedding.join(',')}]`,
        JSON.stringify(metadata)
      );

      count++;
      await sleep(200);
    } catch (error) {
      errors.push(`${document.title}: ${error.message}`);
    }
  }

  return { count, errors, expectedIds, reused, total: documents.length };
}

async function deleteStaleManagedEmbeddings(db, expectedIds) {
  const expected = new Set(expectedIds);
  const rows = await db.searchEmbedding.findMany({
    select: { id: true, metadata: true },
  });
  const staleIds = rows
    .filter((row) => MANAGED_EMBEDDING_TYPES.has(row.metadata?.type) && !expected.has(row.id))
    .map((row) => row.id);

  if (staleIds.length === 0) return 0;

  const result = await db.searchEmbedding.deleteMany({
    where: { id: { in: staleIds } },
  });
  return result.count;
}

export async function POST(request) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const logs = [];
  const errors = { locations: [], providers: [], services: [], posts: [], policies: [] };

  try {
    logs.push('Starting indexing...');

    const locationResult = await indexLocations(prisma);
    logs.push(`Indexed ${locationResult.count}/${locationResult.total} locations`);
    if (locationResult.errors.length) errors.locations = locationResult.errors;

    const providerResult = await indexProviders(prisma);
    logs.push(`Indexed ${providerResult.count}/${providerResult.total} providers`);
    if (providerResult.errors.length) errors.providers = providerResult.errors;

    const serviceResult = await indexServices(prisma);
    logs.push(`Indexed ${serviceResult.count}/${serviceResult.total} services`);
    if (serviceResult.errors.length) errors.services = serviceResult.errors;

    const postResult = await indexBlogPosts(prisma);
    logs.push(`Indexed ${postResult.count}/${postResult.total} posts`);
    if (postResult.errors.length) errors.posts = postResult.errors;

    const policyResult = await indexPolicyDocuments(prisma);
    logs.push(`Indexed ${policyResult.count}/${policyResult.total} policy documents`);
    if (policyResult.errors.length) errors.policies = policyResult.errors;

    const expectedIds = [
      ...locationResult.expectedIds,
      ...providerResult.expectedIds,
      ...serviceResult.expectedIds,
      ...postResult.expectedIds,
      ...policyResult.expectedIds,
    ];
    const removed = await deleteStaleManagedEmbeddings(prisma, expectedIds);
    logs.push(`Removed ${removed} stale managed embeddings`);

    const totalCount =
      locationResult.count +
      providerResult.count +
      serviceResult.count +
      postResult.count +
      policyResult.count;
    const totalReused =
      locationResult.reused +
      providerResult.reused +
      serviceResult.reused +
      postResult.reused +
      policyResult.reused;

    return NextResponse.json(
      {
        ok: true,
        message: 'Indexing complete',
        indexed: {
          locations: locationResult.count,
          providers: providerResult.count,
          services: serviceResult.count,
          posts: postResult.count,
          policies: policyResult.count,
          total: totalCount,
        },
        removed,
        reused: totalReused,
        logs,
        errors: Object.values(errors).flat().length > 0 ? errors : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Indexing error:', error);
    logs.push(`Error: ${error.message}`);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Failed to index embeddings',
        logs,
      },
      { status: 500 }
    );
  }
}
