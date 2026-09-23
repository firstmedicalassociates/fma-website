import fs from "node:fs/promises";
import { parse } from "node-html-parser";

const origin = new URL(process.env.AUDIT_ORIGIN || "https://drsfirst.com").origin;
const output = process.env.AUDIT_OUTPUT || "artifacts/site-audit/links.json";
const pages = new Map();
const links = new Map();
const assets = new Map();
const issues = [];
const sitemap = new Set();
const queue = [];
const queued = new Set();
const headers = { "user-agent": "FMA-Site-Audit/1.0 (+https://drsfirst.com/)" };
const blockedPath = /\/(?:admin|_next)(?:\/|$)|\b(?:logout|delete|unsubscribe)\b/i;
const isInternal = (url) => [new URL(origin).hostname, "drsfirst.com", "www.drsfirst.com"].includes(url.hostname);
const keyFor = (url) => { const u = new URL(url); u.hash = ""; return u.href; };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function enqueue(url) {
  const key = keyFor(url);
  if (!queued.has(key) && queued.size < 1500 && !blockedPath.test(new URL(key).pathname)) {
    queued.add(key);
    queue.push(key);
  }
}

async function request(url, method = "GET", attempt = 0) {
  const start = Date.now();
  try {
    const response = await fetch(url, { headers, method, signal: AbortSignal.timeout(25000) });
    const type = response.headers.get("content-type") || "";
    const html = method === "GET" && /(?:text\/html|xml)/.test(type) ? await response.text() : "";
    await response.body?.cancel().catch(() => {});
    return { status: response.status, finalUrl: response.url, redirected: response.redirected, type, ms: Date.now() - start, html };
  } catch (error) {
    if (attempt === 0) { await wait(500); return request(url, method, 1); }
    return { status: 0, finalUrl: url, ms: Date.now() - start, error: error.message, html: "" };
  }
}

function addReference(map, url, source, label = "") {
  const entry = map.get(url) || { url, references: [] };
  if (!entry.references.some((ref) => ref.source === source && ref.label === label)) entry.references.push({ source, label });
  map.set(url, entry);
}

function inspectPage(url, response) {
  const root = parse(response.html);
  const title = root.querySelector("title")?.text.trim() || "";
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const robots = root.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const ids = root.querySelectorAll("[id],a[name]").map((node) => node.getAttribute("id") || node.getAttribute("name"));
  const h1 = root.querySelectorAll("h1").map((node) => node.text.trim());
  const page = { ...response, html: undefined, title, canonical, robots, ids, h1 };
  pages.set(url, page);
  if (response.status !== 200) issues.push({ kind: "page_status", url, status: response.status });
  if (/security checkpoint|access denied|just a moment/i.test(title)) issues.push({ kind: "blocked_page", url, title });
  if (response.status === 200 && /text\/html/.test(response.type)) {
    if (!title) issues.push({ kind: "missing_title", url });
    if (h1.length !== 1) issues.push({ kind: "heading_count", url, count: h1.length });
    if (sitemap.has(url) && /noindex/i.test(robots)) issues.push({ kind: "sitemap_noindex", url });
    if (sitemap.has(url) && (!canonical || new URL(canonical, url).href !== url.replace(origin, "https://drsfirst.com"))) issues.push({ kind: "canonical", url, canonical });
  }
  for (const anchor of root.querySelectorAll("a")) {
    const raw = anchor.getAttribute("href");
    const label = (anchor.getAttribute("aria-label") || anchor.text || anchor.querySelector("img")?.getAttribute("alt") || "").trim().replace(/\s+/g, " ");
    if (raw === undefined) continue;
    if (!raw.trim() || raw === "#" || /^javascript:/i.test(raw)) {
      issues.push({ kind: "placeholder_link", url, href: raw, label });
      continue;
    }
    let target;
    try { target = new URL(raw, response.finalUrl || url); } catch { issues.push({ kind: "invalid_url", url, href: raw, label }); continue; }
    addReference(links, target.href, url, label);
    if (!label) issues.push({ kind: "unnamed_link", url, href: target.href });
    if (/inquicker\.com$/i.test(target.hostname)) issues.push({ kind: "legacy_booking", url, href: target.href });
    if (isInternal(target) && /^https?:$/.test(target.protocol)) enqueue(target);
    if (target.protocol === "tel:" && !/^\+?[\d(). -]{7,}/.test(target.pathname)) issues.push({ kind: "invalid_phone", url, href: target.href });
  }
  for (const img of root.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) addReference(assets, new URL(src, response.finalUrl || url).href, url, img.getAttribute("alt") || "");
    if (!img.hasAttribute("alt")) issues.push({ kind: "missing_image_alt", url, src });
  }
}

async function pool(items, worker, concurrency = 4) {
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) await worker(items[cursor++]);
  }));
}

await fs.mkdir(output.slice(0, output.lastIndexOf("/")), { recursive: true });
const sitemapResponse = await request(`${origin}/sitemap.xml`);
if (sitemapResponse.status !== 200) throw new Error(`Sitemap: ${sitemapResponse.status}`);
for (const match of sitemapResponse.html.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = match[1].replace(/&amp;/g, "&").replace("https://drsfirst.com", origin);
  sitemap.add(url); enqueue(url);
}
console.log(`Sitemap: ${sitemap.size} URLs`);
while (queue.length) {
  const batch = queue.splice(0, 4);
  await pool(batch, async (url) => inspectPage(url, await request(url)));
  if (pages.size % 20 === 0) console.log(`Pages: ${pages.size}; queued: ${queue.length}`);
  await wait(100);
}

for (const [url, entry] of links) {
  const target = new URL(url);
  if (!isInternal(target) || !target.hash) continue;
  const page = pages.get(keyFor(url));
  const id = decodeURIComponent(target.hash.slice(1));
  if (page?.status === 200 && !id.startsWith(":~:text=") && !page.ids.includes(id)) issues.push({ kind: "missing_fragment", url, references: entry.references });
}

const external = [...links.values()].filter((entry) => {
  const url = new URL(entry.url);
  return /^https?:$/.test(url.protocol) && !isInternal(url) && !blockedPath.test(url.pathname);
});
await pool(external, async (entry) => {
  const result = await request(entry.url);
  entry.check = { ...result, html: undefined, title: result.html ? parse(result.html).querySelector("title")?.text.trim() : "" };
  if (result.status >= 400 || result.status === 0) issues.push({ kind: [401,403,429,999,0].includes(result.status) ? "external_unverified" : "external_status", url: entry.url, status: result.status, references: entry.references });
  await wait(150);
});
console.log(`External destinations: ${external.length}`);
await pool([...assets.values()], async (entry) => {
  entry.check = await request(entry.url, "HEAD");
  if (entry.check.status === 405) entry.check = await request(entry.url);
  delete entry.check.html;
  if (entry.check.status >= 400 || entry.check.status === 0) issues.push({ kind: "asset_status", url: entry.url, status: entry.check.status, references: entry.references });
});
const summary = { at: new Date().toISOString(), origin, sitemapPages: sitemap.size, pagesChecked: pages.size, uniqueLinks: links.size, externalChecked: external.length, imagesChecked: assets.size, issues: Object.fromEntries([...new Set(issues.map((issue) => issue.kind))].map((kind) => [kind, issues.filter((issue) => issue.kind === kind).length])) };
await fs.writeFile(output, JSON.stringify({ summary, issues, pages: Object.fromEntries(pages), links: [...links.values()], assets: [...assets.values()] }, null, 2));
console.log(JSON.stringify(summary, null, 2));
