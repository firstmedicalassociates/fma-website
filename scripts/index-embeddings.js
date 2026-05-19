#!/usr/bin/env node

/**
 * Indexing Script: Generate and store embeddings for all searchable content
 * Run with: node scripts/index-embeddings.js
 */

require('dotenv').config({ path: '.env' });

const { OpenAI } = require('openai');
const { PrismaClient } = require('@prisma/client');

// Create Prisma client
const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';

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
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

async function indexLocations() {
  console.log('\n📍 Indexing Locations...');
  const locations = await prisma.location.findMany();

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
      const embedding = await generateEmbedding(content);

      await prisma.searchEmbedding.upsert({
        where: { id: `location-${location.id}` },
        create: {
          id: `location-${location.id}`,
          content,
          embedding,
          metadata: {
            type: 'location',
            sourceId: location.id,
            slug: buildLocationUrl(location.slug),
            url: buildLocationUrl(location.slug),
            title: location.title,
          },
        },
        update: {
          content,
          embedding,
          metadata: {
            type: 'location',
            sourceId: location.id,
            slug: buildLocationUrl(location.slug),
            url: buildLocationUrl(location.slug),
            title: location.title,
          },
        },
      });

      console.log(`  ✓ ${location.title}`);
      await sleep(100);
    } catch (error) {
      console.error(`  ✗ Failed to index ${location.title}:`, error.message);
    }
  }
}

async function indexProviders() {
  console.log('\n👨‍⚕️  Indexing Providers...');
  const providers = await prisma.provider.findMany();

  for (const provider of providers) {
    const content = [provider.name, provider.title, provider.bio]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      const embedding = await generateEmbedding(content);

      await prisma.searchEmbedding.upsert({
        where: { id: `provider-${provider.id}` },
        create: {
          id: `provider-${provider.id}`,
          content,
          embedding,
          metadata: {
            type: 'provider',
            sourceId: provider.id,
            slug: provider.slug,
            url: buildProviderUrl(provider.slug),
            title: provider.name,
            locations: provider.locations,
          },
        },
        update: {
          content,
          embedding,
          metadata: {
            type: 'provider',
            sourceId: provider.id,
            slug: provider.slug,
            url: buildProviderUrl(provider.slug),
            title: provider.name,
            locations: provider.locations,
          },
        },
      });

      console.log(`  ✓ ${provider.name}`);
      await sleep(100);
    } catch (error) {
      console.error(`  ✗ Failed to index ${provider.name}:`, error.message);
    }
  }
}

async function indexServices() {
  console.log('\n💊 Indexing Services...');
  const services = await prisma.service.findMany();

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
      const embedding = await generateEmbedding(content);

      await prisma.searchEmbedding.upsert({
        where: { id: `service-${service.id}` },
        create: {
          id: `service-${service.id}`,
          content,
          embedding,
          metadata: {
            type: 'service',
            sourceId: service.id,
            slug: service.slug,
            url: buildServiceUrl(service.slug),
            title: service.title,
            category: service.category,
          },
        },
        update: {
          content,
          embedding,
          metadata: {
            type: 'service',
            sourceId: service.id,
            slug: service.slug,
            url: buildServiceUrl(service.slug),
            title: service.title,
            category: service.category,
          },
        },
      });

      console.log(`  ✓ ${service.title}`);
      await sleep(100);
    } catch (error) {
      console.error(`  ✗ Failed to index ${service.title}:`, error.message);
    }
  }
}

async function indexBlogPosts() {
  console.log('\n📝 Indexing Blog Posts...');
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
  });

  for (const post of posts) {
    const content = [post.title, post.excerpt, post.metaDescription]
      .filter(Boolean)
      .join(' ');

    if (!content.trim()) continue;

    try {
      const embedding = await generateEmbedding(content);

      await prisma.searchEmbedding.upsert({
        where: { id: `post-${post.id}` },
        create: {
          id: `post-${post.id}`,
          content,
          embedding,
          metadata: {
            type: 'post',
            sourceId: post.id,
            slug: post.slug,
            url: buildPostUrl(post.slug),
            title: post.title,
          },
        },
        update: {
          content,
          embedding,
          metadata: {
            type: 'post',
            sourceId: post.id,
            slug: post.slug,
            url: buildPostUrl(post.slug),
            title: post.title,
          },
        },
      });

      console.log(`  ✓ ${post.title}`);
      await sleep(100);
    } catch (error) {
      console.error(`  ✗ Failed to index ${post.title}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting AI Search Indexing...\n');

    await indexLocations();
    await indexProviders();
    await indexServices();
    await indexBlogPosts();

    const count = await prisma.searchEmbedding.count();
    console.log(`\n✅ Indexing complete! ${count} items indexed.\n`);
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
