import fs from 'node:fs/promises';
import { prisma } from '../src/app/lib/prisma.js';
import { formatLocationAddress, VISIBLE_LOCATION_WHERE } from '../src/app/lib/locations.js';
import { resolveProviderBookingHref } from '../src/app/lib/providers.js';

const origin = process.env.AUDIT_ORIGIN || 'https://drsfirst.com';
const results = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  const [locations, providers] = await Promise.all([
    prisma.location.findMany({ where: VISIBLE_LOCATION_WHERE, orderBy: { title: 'asc' } }),
    prisma.provider.findMany({ where: { isActive: true, title: { contains: 'MD' } }, orderBy: { name: 'asc' } }),
  ]);
  const cases = [
    ...locations.map((location) => ({ kind: 'address', query: `What is the address of the FMA ${location.title} office?`, expected: formatLocationAddress(location) })),
    ...providers.map((provider) => ({ kind: 'provider', query: `Tell me about ${provider.name}`, providerName: provider.name, expected: provider.title, booking: resolveProviderBookingHref(provider) })),
    { kind: 'founder', query: 'Who founded First Medical Associates?', expected: 'Rakesh Malik, MD' },
    { kind: 'careers', query: 'Where can I find careers at First Medical Associates?' },
  ];
  for (const entry of cases) {
    const response = await fetch(`${origin}/api/search`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'FMA-Formatting-Audit/1.0' },
      body: JSON.stringify({ query: entry.query, surface: 'search_page' }), signal: AbortSignal.timeout(90000),
    });
    if (response.status === 429) throw new Error(`Rate limit reached; stopped audit. Retry after ${response.headers.get('retry-after')} seconds.`);
    const data = await response.json();
    const ai = data.ai || {};
    const cards = ai.cards || ai.structuredCards || [];
    const sources = ai.sources || [];
    const rendered = JSON.stringify({ answer: ai.answer, cards, sources, results: data.results });
    const failures = [];
    if (!response.ok || !ai.ok) failures.push(`Search failed: ${response.status} ${ai.error || ai.code}`);
    if (/\bM\.\s*D\./.test(rendered)) failures.push('Dotted MD credential');
    if (entry.kind === 'address' && !String(ai.answer).includes(entry.expected)) failures.push('Address does not match two-line CMS format');
    if (entry.kind === 'provider') {
      const card = cards.find((card) => card.title === entry.providerName);
      if (!card || card.subtitle !== entry.expected) failures.push('Provider title mismatch');
      if (!rendered.includes(entry.booking)) failures.push('Missing provider booking link');
    }
    if (entry.kind === 'founder' && !String(ai.answer).includes(entry.expected)) failures.push('Founder credential mismatch');
    if (entry.kind === 'careers' && /\/(?:about\/careers|jobs)(?:\/|["\\]|$)/.test(rendered)) failures.push('Hidden Careers link returned');
    results.push({ ...entry, status: response.status, answer: ai.answer, cards, sources, failures });
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${entry.kind}: ${entry.query}${failures.length ? ` — ${failures.join('; ')}` : ''}`);
    await wait(3500);
  }
} finally {
  const summary = { at: new Date().toISOString(), origin, total: results.length, failed: results.filter((entry) => entry.failures.length).length };
  await fs.mkdir('artifacts/site-audit/formatting-2026-09-23', { recursive: true });
  await fs.writeFile('artifacts/site-audit/formatting-2026-09-23/live-ai.json', JSON.stringify({ summary, results }, null, 2));
  console.log(JSON.stringify(summary));
  if (summary.failed) process.exitCode = 1;
  await prisma.$disconnect();
}
