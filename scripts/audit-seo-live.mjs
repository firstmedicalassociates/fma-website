import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  CANONICAL_ORIGIN,
  isPublicPagePath,
  normalizePagePath,
  pageUrl,
} from "../src/app/lib/config/site.js";

const DEFAULT_DELAY_MS = 250;
const MAX_REDIRECTS = 10;

function parseArguments(argv = []) {
  const options = {
    origin: CANONICAL_ORIGIN,
    gscPages: "",
    delayMs: DEFAULT_DELAY_MS,
    limit: Number.POSITIVE_INFINITY,
    expectNoindex: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const [rawKey, inlineValue] = argument.split("=", 2);
    const key = rawKey.replace(/^--/, "");
    const value = inlineValue ?? argv[index + 1];

    if (key === "expect-noindex") {
      options.expectNoindex = true;
      continue;
    }
    if (!argument.startsWith("--")) continue;

    if (inlineValue === undefined) index += 1;
    if (key === "origin") options.origin = value;
    if (key === "gsc-pages") options.gscPages = value;
    if (key === "delay-ms") options.delayMs = Number(value);
    if (key === "limit") options.limit = Number(value);
  }

  const origin = new URL(options.origin);
  origin.pathname = "/";
  origin.search = "";
  origin.hash = "";

  return {
    ...options,
    origin: origin.toString().replace(/\/$/, ""),
    delayMs: Number.isFinite(options.delayMs) ? Math.max(0, options.delayMs) : DEFAULT_DELAY_MS,
    limit: Number.isFinite(options.limit) ? Math.max(1, options.limit) : Number.POSITIVE_INFINITY,
  };
}

function delay(milliseconds) {
  return milliseconds > 0
    ? new Promise((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractSitemapUrls(xml = "") {
  return [...String(xml).matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) =>
    decodeXml(match[1].trim())
  );
}

function parseAttributes(tag = "") {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gi)].map((match) => [
      match[1].toLowerCase(),
      match[3],
    ])
  );
}

export function extractCanonical(html = "") {
  for (const tag of String(html).match(/<link\b[^>]*>/gi) || []) {
    const attributes = parseAttributes(tag);
    const relValues = String(attributes.rel || "").toLowerCase().split(/\s+/);
    if (relValues.includes("canonical")) return attributes.href || "";
  }

  return "";
}

export function hasNoindex(html = "", headers = new Headers()) {
  const headerDirective = headers.get("x-robots-tag") || "";
  if (/\bnoindex\b/i.test(headerDirective)) return true;

  return (String(html).match(/<meta\b[^>]*>/gi) || []).some((tag) => {
    const attributes = parseAttributes(tag);
    const name = String(attributes.name || "").toLowerCase();
    return (name === "robots" || name === "googlebot") && /\bnoindex\b/i.test(attributes.content || "");
  });
}

export function extractAnchorHrefs(html = "") {
  return [
    ...new Set(
      (String(html).match(/<a\b[^>]*>/gi) || [])
        .map((tag) => parseAttributes(tag).href || "")
        .filter(Boolean)
    ),
  ];
}

export function parseCsv(text = "") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function fetchRedirectChain(inputUrl) {
  const chain = [];
  let currentUrl = inputUrl;

  for (let index = 0; index <= MAX_REDIRECTS; index += 1) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: { "user-agent": "FMA-SEO-Audit/1.0 (+https://drsfirst.com/)" },
    });
    const location = response.headers.get("location");
    chain.push({ url: currentUrl, status: response.status, location });

    if (!location || response.status < 300 || response.status >= 400) {
      return { response, chain, finalUrl: currentUrl };
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error(`More than ${MAX_REDIRECTS} redirects for ${inputUrl}`);
}

function requestUrlForOrigin(canonicalUrl, origin) {
  const canonical = new URL(canonicalUrl);
  return new URL(`${canonical.pathname}${canonical.search}`, `${origin}/`).toString();
}

async function auditSitemap(options) {
  const sitemapUrl = new URL("/sitemap.xml", `${options.origin}/`).toString();
  const sitemapResponse = await fetch(sitemapUrl, {
    headers: { "user-agent": "FMA-SEO-Audit/1.0 (+https://drsfirst.com/)" },
  });
  const sitemapXml = await sitemapResponse.text();

  if (!sitemapResponse.ok) {
    throw new Error(`Sitemap returned ${sitemapResponse.status}: ${sitemapUrl}`);
  }
  if (/Vercel Security Checkpoint/i.test(sitemapXml)) {
    throw new Error("Vercel Security Checkpoint was returned for sitemap.xml");
  }

  const sitemapUrls = extractSitemapUrls(sitemapXml).slice(0, options.limit);
  const issues = [];

  for (const sitemapEntry of sitemapUrls) {
    const canonicalEntry = new URL(sitemapEntry);
    const requestUrl = requestUrlForOrigin(sitemapEntry, options.origin);
    const { response, chain, finalUrl } = await fetchRedirectChain(requestUrl);
    const html = await response.text();
    const canonical = extractCanonical(html);
    const expectedCanonical = pageUrl(canonicalEntry.pathname);

    if (chain.length !== 1) issues.push(`${requestUrl}: sitemap URL redirected ${chain.length - 1} time(s)`);
    if (response.status !== 200) issues.push(`${requestUrl}: expected 200, received ${response.status}`);
    if (/Vercel Security Checkpoint/i.test(html)) issues.push(`${requestUrl}: Vercel Security Checkpoint`);
    const normalizedCanonical = canonical ? new URL(canonical).toString() : "";
    if (normalizedCanonical !== expectedCanonical) {
      issues.push(`${requestUrl}: canonical ${canonical || "(missing)"}; expected ${expectedCanonical}`);
    }
    if (new URL(sitemapEntry).origin !== CANONICAL_ORIGIN) {
      issues.push(`${sitemapEntry}: sitemap hostname is not ${CANONICAL_ORIGIN}`);
    }
    if (canonicalEntry.pathname !== normalizePagePath(canonicalEntry.pathname)) {
      issues.push(`${sitemapEntry}: sitemap page does not end in a trailing slash`);
    }

    const noindex = hasNoindex(html, response.headers);
    if (options.expectNoindex && !noindex) issues.push(`${finalUrl}: preview page is missing noindex`);
    if (!options.expectNoindex && noindex) issues.push(`${finalUrl}: production sitemap page has noindex`);

    for (const href of extractAnchorHrefs(html)) {
      if (!href.startsWith("/") && !/^https?:\/\//i.test(href)) continue;

      const linkUrl = new URL(href, requestUrl);
      const isSiteHostname = [
        new URL(options.origin).hostname,
        "drsfirst.com",
        "www.drsfirst.com",
      ].includes(linkUrl.hostname);
      if (!isSiteHostname) continue;

      if (linkUrl.hostname === "www.drsfirst.com") {
        issues.push(`${requestUrl}: internal link uses www (${href})`);
      }
      if (isPublicPagePath(linkUrl.pathname) && !linkUrl.pathname.endsWith("/")) {
        issues.push(`${requestUrl}: internal page link is missing a trailing slash (${href})`);
      }
    }

    await delay(options.delayMs);
  }

  return { checked: sitemapUrls.length, issues };
}

async function auditGscPages(options) {
  if (!options.gscPages) return { checked: 0, issues: [] };

  const csv = await readFile(options.gscPages, "utf8");
  const rows = parseCsv(csv);
  const urls = rows
    .slice(1)
    .map((row) => row[0])
    .filter(Boolean)
    .slice(0, options.limit);
  const issues = [];

  for (const sourceUrl of urls) {
    const requestUrl = requestUrlForOrigin(sourceUrl, options.origin);
    const { response, chain, finalUrl } = await fetchRedirectChain(requestUrl);
    const final = new URL(finalUrl);

    if (chain.length > 2) issues.push(`${requestUrl}: ${chain.length - 1} redirects (expected at most one)`);
    if (response.status !== 200 && response.status !== 404) {
      issues.push(`${requestUrl}: final status ${response.status}; expected 200 or intentional 404`);
    }
    if (final.hostname === "www.drsfirst.com") issues.push(`${requestUrl}: final URL still uses www`);

    await response.body?.cancel();
    await delay(options.delayMs);
  }

  return { checked: urls.length, issues };
}

export async function runAudit(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const sitemap = await auditSitemap(options);
  const gsc = await auditGscPages(options);
  const issues = [...sitemap.issues, ...gsc.issues];

  console.log(
    JSON.stringify(
      {
        origin: options.origin,
        sitemapPagesChecked: sitemap.checked,
        gscUrlsChecked: gsc.checked,
        issueCount: issues.length,
      },
      null,
      2
    )
  );

  if (issues.length > 0) {
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  }

  return { options, sitemap, gsc, issues };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  runAudit().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  });
}
