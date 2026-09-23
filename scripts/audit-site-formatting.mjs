import fs from 'node:fs/promises';
import { parse } from 'node-html-parser';
import { prisma } from '../src/app/lib/prisma.js';
import { formatLocationAddress, VISIBLE_LOCATION_WHERE } from '../src/app/lib/locations.js';

const origin = process.env.AUDIT_ORIGIN || 'https://drsfirst.com';
const output = process.env.AUDIT_OUTPUT || 'artifacts/site-audit/formatting-2026-09-23/live-pages.json';
const issues = [];
const results = [];
const hiddenPath = /\/(?:about\/careers|jobs)(?:\/|$)/;
const headers = { 'user-agent': 'FMA-Formatting-Audit/1.0' };
const request = (path, options = {}) => fetch(new URL(path, origin), { headers, signal: AbortSignal.timeout(30000), ...options });
try {
  const locations = await prisma.location.findMany({ where: VISIBLE_LOCATION_WHERE });
  const providers = await prisma.provider.findMany({ where: { isActive: true }, select: { slug: true, title: true, locations: true } });
  const addressSet = new Set(locations.map(formatLocationAddress));
  for (const location of locations) {
    if (location.displayAddress !== formatLocationAddress(location) || location.displayAddress.split('\n').length !== 2) issues.push({ kind: 'cms_address', slug: location.slug });
  }
  const sitemapResponse = await request('/sitemap.xml');
  if (!sitemapResponse.ok) throw new Error(`Sitemap status: ${sitemapResponse.status}`);
  const urls = [...(await sitemapResponse.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  if (urls.some((url) => hiddenPath.test(url))) issues.push({ kind: 'careers_in_sitemap' });
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < urls.length) {
      const path = urls[cursor++];
      const response = await request(path);
      const root = parse(await response.text());
      root.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
      const text = root.structuredText;
      if (response.status !== 200) issues.push({ kind: 'page_status', path, status: response.status });
      if (/\bM\.\s*D\./.test(text)) issues.push({ kind: 'dotted_md', path });
      for (const link of root.querySelectorAll('a[href]')) {
        const url = new URL(link.getAttribute('href'), origin);
        if (['drsfirst.com', new URL(origin).hostname].includes(url.hostname) && hiddenPath.test(url.pathname)) issues.push({ kind: 'careers_link', path, href: url.href });
      }
      const location = locations.find((entry) => entry.slug.replace(/\/$/, '') === path.replace(/\/$/, ''));
      if (location) {
        const lines = formatLocationAddress(location).split('\n');
        const blocks = root.querySelectorAll('[class*="locationAddressBlock"]');
        if (!blocks.some((block) => JSON.stringify(block.querySelectorAll('p').map((p) => p.text.trim())) === JSON.stringify(lines))) issues.push({ kind: 'location_address_lines', path });
      }
      const provider = providers.find((entry) => `/providers/${entry.slug}/` === path);
      if (provider) {
        if (!text.includes(provider.title)) issues.push({ kind: 'provider_title', path });
        const addresses = root.querySelectorAll('[class*="locationCardAddress"]').map((node) => node.text.trim());
        if (provider.locations.length && (!addresses.length || addresses.some((address) => !addressSet.has(address)))) issues.push({ kind: 'provider_address_lines', path, addresses });
      }
      results.push({ path, status: response.status, kind: location ? 'location' : provider ? 'provider' : 'page' });
    }
  }));
  for (const path of ['/about/careers', '/about/careers/', '/jobs', '/jobs/']) {
    const response = await request(path, { redirect: 'manual' });
    const destination = response.headers.get('location');
    if (response.status !== 307 || new URL(destination || '/', origin).pathname !== '/about/') issues.push({ kind: 'careers_redirect', path, status: response.status, destination });
  }
  const summary = { at: new Date().toISOString(), origin, pages: results.length, locations: results.filter((r) => r.kind === 'location').length, providers: results.filter((r) => r.kind === 'provider').length, issues: issues.length };
  await fs.mkdir(new URL('../artifacts/site-audit/formatting-2026-09-23/', import.meta.url), { recursive: true });
  await fs.writeFile(output, JSON.stringify({ summary, issues, results }, null, 2));
  console.log(JSON.stringify({ summary, issues }, null, 2));
  if (issues.length) process.exitCode = 1;
} finally { await prisma.$disconnect(); }
