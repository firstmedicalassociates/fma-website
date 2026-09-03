import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config.mjs";
import {
  CANONICAL_ORIGIN,
  absoluteUrl,
  getTrailingSlashRedirectUrl,
  isPublicPagePath,
  normalizeInternalHtmlLinks,
  normalizeInternalPageHref,
  normalizePagePath,
  pageUrl,
  shouldNoIndexDeployment,
} from "../../src/app/lib/config/site.js";
import {
  LEGACY_REDIRECTS,
  WWW_TO_APEX_FALLBACK_REDIRECT,
  WWW_TO_APEX_REDIRECT,
  buildLegacyRedirects,
  validateRedirectManifest,
} from "../../src/app/lib/config/legacy-redirects.mjs";
import {
  extractAnchorHrefs,
  extractCanonical,
  extractSitemapUrls,
  hasNoindex,
  parseCsv,
} from "../../scripts/audit-seo-live.mjs";

test("canonical page and asset URLs stay on the apex host", () => {
  assert.equal(CANONICAL_ORIGIN, "https://drsfirst.com");
  assert.equal(pageUrl("/about"), "https://drsfirst.com/about/");
  assert.equal(pageUrl("/"), "https://drsfirst.com/");
  assert.equal(
    absoluteUrl("/wp-content/uploads/policy.pdf"),
    "https://drsfirst.com/wp-content/uploads/policy.pdf"
  );
});

test("page path normalization preserves query strings and fragments", () => {
  assert.equal(normalizePagePath("services"), "/services/");
  assert.equal(
    normalizePagePath("/services?category=Primary%20Care#results"),
    "/services/?category=Primary%20Care#results"
  );
  assert.equal(normalizeInternalPageHref("/api/search"), "/api/search");
  assert.equal(normalizeInternalPageHref("/uploads/photo.jpg"), "/uploads/photo.jpg");
  assert.equal(normalizeInternalPageHref("/providers"), "/providers/");
  assert.equal(normalizeInternalPageHref("/location"), "/locations/");
  assert.equal(normalizeInternalPageHref("mailto:info@example.com"), "mailto:info@example.com");
});

test("rendered CMS links are normalized without changing asset URLs", () => {
  assert.equal(
    normalizeInternalHtmlLinks(
      '<a href="/location/rockville">Office</a><a href="https://www.drsfirst.com/contact-us/">Contact</a><a href="/form.pdf">PDF</a>'
    ),
    '<a href="/location/rockville/">Office</a><a href="https://drsfirst.com/contact/">Contact</a><a href="/form.pdf">PDF</a>'
  );
});

test("only GET and HEAD public pages receive trailing-slash redirects", () => {
  const redirected = getTrailingSlashRedirectUrl(
    "https://drsfirst.com/services?category=Primary%20Care#results",
    "GET"
  );

  assert.equal(
    redirected?.toString(),
    "https://drsfirst.com/services/?category=Primary%20Care#results"
  );
  assert.equal(
    getTrailingSlashRedirectUrl("https://drsfirst.com/services", "HEAD")?.pathname,
    "/services/"
  );
  assert.equal(getTrailingSlashRedirectUrl("https://drsfirst.com/services", "POST"), null);
  assert.equal(getTrailingSlashRedirectUrl("https://drsfirst.com/services/", "GET"), null);
});

test("APIs, admin, framework files, well-known paths, and files never acquire slashes", () => {
  const excludedPaths = [
    "/api/search",
    "/admin",
    "/admin/login",
    "/_next/static/app.js",
    "/.well-known/security.txt",
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico",
    "/uploads/policy.pdf",
  ];

  for (const pathname of excludedPaths) {
    assert.equal(isPublicPagePath(pathname), false, pathname);
    assert.equal(getTrailingSlashRedirectUrl(`https://drsfirst.com${pathname}`), null, pathname);
  }
});

test("redirect manifest is final, unique, permanent, and expanded for both page forms", () => {
  assert.equal(validateRedirectManifest(), true);
  const redirects = buildLegacyRedirects();
  const logicalSources = new Set(LEGACY_REDIRECTS.map((entry) => entry.source));

  assert.ok(LEGACY_REDIRECTS.length >= 140);
  assert.equal(redirects.every((entry) => entry.permanent === true), true);
  assert.equal(new Set(redirects.map((entry) => entry.source)).size, redirects.length);
  assert.ok(logicalSources.has("/the-connection-between-sore-throats-and-seasonal-changes/"));
  assert.ok(logicalSources.has("/anita-kunwar-md/"));
  assert.ok(logicalSources.has("/provider/leanne-antioquia-fnp-c/"));
  assert.ok(logicalSources.has("/providers/costa-md/"));
  assert.ok(logicalSources.has("/gallant-staff/"));
  assert.ok(logicalSources.has("/wp-content/uploads/2026/02/Late-Arrival-Policy-1.pdf"));

  for (const retiredPath of [
    "/providers/angelique-ramirez/",
    "/providers/ashley-myatt/",
    "/providers/kimaya-vaidya/",
    "/providers/ronald-attanasio/",
    "/providers/yvonne-tukei/",
    "/location/joppa/",
    "/soma-mitra/",
    "/health-center-staff/",
  ]) {
    assert.equal(logicalSources.has(retiredPath), false, retiredPath);
  }
});

test("www safeguard is the first app redirect and can only point toward apex", async () => {
  const redirects = await nextConfig.redirects();

  assert.deepEqual(redirects[0], WWW_TO_APEX_REDIRECT);
  assert.deepEqual(redirects[1], WWW_TO_APEX_FALLBACK_REDIRECT);
  assert.equal(redirects[0].has[0].value, "www.drsfirst.com");
  assert.equal(redirects[0].destination.startsWith("https://drsfirst.com/"), true);
  assert.equal(redirects[0].destination.includes("www."), false);
  assert.equal(nextConfig.skipTrailingSlashRedirect, true);
});

test("only non-production Vercel environments are marked noindex", () => {
  assert.equal(shouldNoIndexDeployment({ VERCEL_ENV: "preview" }), true);
  assert.equal(shouldNoIndexDeployment({ VERCEL_ENV: "development" }), true);
  assert.equal(shouldNoIndexDeployment({ VERCEL_ENV: "production" }), false);
  assert.equal(shouldNoIndexDeployment({}), false);
});

test("live audit parsers handle sitemap, metadata, links, and quoted GSC CSV fields", () => {
  assert.deepEqual(
    extractSitemapUrls("<urlset><url><loc>https://drsfirst.com/about/</loc></url></urlset>"),
    ["https://drsfirst.com/about/"]
  );
  assert.equal(
    extractCanonical('<link href="https://drsfirst.com/about/" rel="canonical">'),
    "https://drsfirst.com/about/"
  );
  assert.equal(
    hasNoindex('<meta content="noindex, nofollow" name="robots">', new Headers()),
    true
  );
  assert.deepEqual(extractAnchorHrefs('<a href="/about/">About</a><a href="/about/">Again</a>'), [
    "/about/",
  ]);
  assert.deepEqual(parseCsv('Top pages,Clicks\r\n"https://drsfirst.com/a,b/",2\r\n'), [
    ["Top pages", "Clicks"],
    ["https://drsfirst.com/a,b/", "2"],
  ]);
});
