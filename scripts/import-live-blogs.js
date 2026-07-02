require("dotenv/config");

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { parse } = require("node-html-parser");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

const LIVE_SITE_ORIGIN = "https://drsfirst.com";
const WP_POSTS_ENDPOINT = `${LIVE_SITE_ORIGIN}/wp-json/wp/v2/posts`;
const BLOG_IMPORT_DIR = path.join(process.cwd(), "public", "uploads", "blog-import");
const BLOG_IMPORT_URL_PREFIX = "/uploads/blog-import";
const GENERIC_LEADING_HEADINGS = new Set([
  "family doctor in maryland",
  "same-day appointments in maryland",
  "same-day appointments in maryland",
]);
const ROUTE_REWRITE_MAP = new Map([
  ["/contact-us", "/contact"],
  ["/contactus", "/contact"],
  ["/location/springville", "/location/silver-spring"],
  ["/springville", "/location/silver-spring"],
]);

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to import live blog posts.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: databaseUrl }),
});

const imageCache = new Map();

function decodeHtmlEntities(value = "") {
  const namedEntities = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
  };

  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, valueHex) =>
      String.fromCodePoint(Number.parseInt(valueHex, 16))
    )
    .replace(/&#(\d+);/g, (_, valueNumber) =>
      String.fromCodePoint(Number.parseInt(valueNumber, 10))
    )
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name.toLowerCase()] ?? match);
}

function stripTags(value = "") {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeadingText(value = "") {
  return stripTags(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function trimExcerpt(value = "", maxLength = 180) {
  const text = stripTags(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).replace(/\s+\S*$/, "").trim()}…`;
}

function buildExcerptFromHtml(html = "", maxLength = 220) {
  return trimExcerpt(
    String(html ?? "")
      .replace(/<\/p>\s*<p>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
    maxLength
  );
}

function extractAttribute(tag = "", attributeName = "") {
  const pattern = new RegExp(
    `${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = String(tag).match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function resolveLiveUrl(value = "") {
  if (!value) return "";

  try {
    return new URL(value, LIVE_SITE_ORIGIN).toString();
  } catch {
    return "";
  }
}

function pickExtensionFromContentType(contentType = "") {
  const normalized = String(contentType).split(";")[0].trim().toLowerCase();

  if (normalized === "image/jpeg") return ".jpg";
  if (normalized === "image/png") return ".png";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/gif") return ".gif";
  if (normalized === "image/svg+xml") return ".svg";

  return "";
}

async function ensureDirectory(directoryPath) {
  await fs.promises.mkdir(directoryPath, { recursive: true });
}

async function downloadImageToLocal({ sourceUrl, slug, label }) {
  const resolvedSourceUrl = resolveLiveUrl(sourceUrl);
  if (!resolvedSourceUrl) return null;

  if (imageCache.has(resolvedSourceUrl)) {
    return imageCache.get(resolvedSourceUrl);
  }

  const source = new URL(resolvedSourceUrl);
  const sourceExtension = path.extname(source.pathname).toLowerCase();
  const cacheKey = crypto.createHash("md5").update(resolvedSourceUrl).digest("hex").slice(0, 10);
  const safeSlug = String(slug || "post").replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  const safeLabel = String(label || "image")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  const response = await fetch(resolvedSourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${resolvedSourceUrl} (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  const extension = sourceExtension || pickExtensionFromContentType(contentType) || ".jpg";
  const filename = `${safeSlug}-${safeLabel}-${cacheKey}${extension}`;
  const targetPath = path.join(BLOG_IMPORT_DIR, filename);
  const relativeUrl = `${BLOG_IMPORT_URL_PREFIX}/${filename}`;

  if (!fs.existsSync(targetPath)) {
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(targetPath, buffer);
  }

  imageCache.set(resolvedSourceUrl, relativeUrl);
  return relativeUrl;
}

async function replaceAsync(source, pattern, replacer) {
  const matches = [...String(source).matchAll(pattern)];
  if (matches.length === 0) return String(source);

  let cursor = 0;
  let output = "";

  for (const match of matches) {
    const [fullMatch] = match;
    const matchIndex = match.index ?? 0;
    output += source.slice(cursor, matchIndex);
    output += await replacer(...match);
    cursor = matchIndex + fullMatch.length;
  }

  output += source.slice(cursor);
  return output;
}

function normalizeInternalLinks(html = "") {
  return String(html).replace(
    /\shref=(["'])(https?:\/\/(?:www\.)?drsfirst\.com[^"']*)\1/gi,
    (_match, quote, href) => {
      try {
        const url = new URL(href);
        const relativeUrl = `${url.pathname}${url.search}${url.hash}` || "/";
        return ` href=${quote}${relativeUrl}${quote}`;
      } catch {
        return ` href=${quote}${href}${quote}`;
      }
    }
  );
}

function normalizePathname(pathname = "") {
  if (!pathname) return "/";
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function buildRouteMaps(locations = [], services = []) {
  const locationSlugSet = new Set();
  const locationAliasMap = new Map();
  const serviceAliasMap = new Map();

  for (const location of locations) {
    const slug = normalizePathname(location.slug);
    locationSlugSet.add(slug);

    const locationLeaf = slug.replace(/^\/location\//, "").replace(/^\//, "");
    if (locationLeaf) {
      locationAliasMap.set(`/${locationLeaf}`, slug);
      locationAliasMap.set(locationLeaf, slug);
    }

    locationAliasMap.set(`${slug}/`, slug);
  }

  for (const service of services) {
    const slug = normalizePathname(`/service/${service.slug}`);
    const serviceLeaf = normalizePathname(`/${service.slug}`);
    serviceAliasMap.set(slug, slug);
    serviceAliasMap.set(`${slug}/`, slug);
    serviceAliasMap.set(serviceLeaf, slug);
    serviceAliasMap.set(serviceLeaf.replace(/^\//, ""), slug);
  }

  return {
    locationSlugSet,
    locationAliasMap,
    serviceAliasMap,
  };
}

function normalizeInternalHref(href = "", routeMaps) {
  const rawHref = String(href || "").trim();
  if (!rawHref) return "/contact";
  if (/^(mailto:|tel:|#)/i.test(rawHref)) return rawHref;

  let url;

  try {
    url = new URL(rawHref, LIVE_SITE_ORIGIN);
  } catch {
    return rawHref;
  }

  const isInternal =
    !url.host || /^(?:www\.)?drsfirst\.com$/i.test(url.host) || url.origin === LIVE_SITE_ORIGIN;

  if (!isInternal) {
    return rawHref;
  }

  const pathname = normalizePathname(url.pathname);

  if (ROUTE_REWRITE_MAP.has(pathname)) {
    return `${ROUTE_REWRITE_MAP.get(pathname)}${url.search}${url.hash}`;
  }

  if (routeMaps.locationSlugSet.has(pathname)) {
    return `${pathname}${url.search}${url.hash}`;
  }

  if (routeMaps.locationAliasMap.has(pathname)) {
    return `${routeMaps.locationAliasMap.get(pathname)}${url.search}${url.hash}`;
  }

  if (routeMaps.serviceAliasMap.has(pathname)) {
    return `${routeMaps.serviceAliasMap.get(pathname)}${url.search}${url.hash}`;
  }

  return `${pathname}${url.search}${url.hash}`;
}

function rewriteInternalLinks(html = "", routeMaps) {
  return String(html).replace(/\shref=(["'])([^"']*)\1/gi, (_match, quote, href) => {
    const normalizedHref = normalizeInternalHref(href, routeMaps);
    return ` href=${quote}${normalizedHref}${quote}`;
  });
}

function stripUnsafeMarkup(html = "") {
  let cleaned = String(html ?? "");

  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, "");
  cleaned = cleaned.replace(/\[(?:\/)?et_pb[^\]]*\]/gi, "");
  cleaned = cleaned.replace(/<\/?span\b[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/?(section|article|figure|div)\b[^>]*>/gi, "");
  cleaned = cleaned.replace(/\s+(?:class|style|id|data-[\w:-]+|aria-[\w:-]+|role|loading|decoding|fetchpriority|srcset|sizes)=(".*?"|'.*?'|[^\s>]+)/gi, "");
  cleaned = cleaned.replace(/<(b|strong)>\s*<br\s*\/?>\s*<\/\1>/gi, "");
  cleaned = cleaned.replace(/<(p|h[2-6])>\s*(?:<br\s*\/?>\s*)+/gi, "<$1>");
  cleaned = cleaned.replace(/(?:<br\s*\/?>\s*)+<\/(p|h[2-6])>/gi, "</$1>");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, " ");
  cleaned = cleaned.replace(/<(ul|ol)>\s*<\/\1>/gi, "");
  cleaned = cleaned.replace(/<a href=(["'])(?:#|)\1>\s*Request a Consultation!?\s*<\/a>/gi, '<a href="/contact">Request a Consultation</a>');
  cleaned = cleaned.replace(/<a href=(["'])(?:#|)\1>\s*<\/a>/gi, "");
  cleaned = cleaned.replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, "");
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, "");
  cleaned = cleaned.replace(/<h1\b([^>]*)>/gi, "<h2$1>");
  cleaned = cleaned.replace(/<\/h1>/gi, "</h2>");
  cleaned = cleaned.replace(/<h([2-6])>\s*<\/h\1>/gi, "");
  cleaned = cleaned.replace(/\s+>/g, ">");

  return cleaned.trim();
}

function normalizeBlockStructure(html = "") {
  const root = parse(`<body>${String(html || "")}</body>`);
  const body = root.querySelector("body");

  if (!body) {
    return String(html || "").trim();
  }

  const blockTags = new Set([
    "p",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "blockquote",
    "img",
  ]);

  let invalidParagraphs = body
    .querySelectorAll("p")
    .filter((paragraph) =>
      paragraph.childNodes.some(
        (childNode) => childNode.tagName && blockTags.has(childNode.tagName.toLowerCase())
      )
    );

  while (invalidParagraphs.length > 0) {
    for (const paragraph of invalidParagraphs) {
      paragraph.replaceWith(...paragraph.childNodes);
    }

    invalidParagraphs = body
      .querySelectorAll("p")
      .filter((paragraph) =>
        paragraph.childNodes.some(
          (childNode) => childNode.tagName && blockTags.has(childNode.tagName.toLowerCase())
        )
      );
  }

  const fragments = [];
  let inlineBuffer = "";

  const flushInlineBuffer = () => {
    const normalizedInline = inlineBuffer.replace(/\s+/g, " ").trim();
    if (normalizedInline) {
      fragments.push(`<p>${normalizedInline}</p>`);
    }
    inlineBuffer = "";
  };

  for (const node of body.childNodes) {
    if (!node.tagName) {
      const text = decodeHtmlEntities(node.toString()).replace(/\s+/g, " ").trim();
      if (text) {
        inlineBuffer += `${inlineBuffer ? " " : ""}${escapeHtml(text)}`;
      }
      continue;
    }

    const tagName = node.tagName.toLowerCase();
    if (blockTags.has(tagName)) {
      flushInlineBuffer();
      const nodeHtml = node.toString().trim();
      if (nodeHtml) {
        fragments.push(nodeHtml);
      }
      continue;
    }

    const inlineHtml = node.toString().trim();
    if (inlineHtml) {
      inlineBuffer += `${inlineBuffer ? " " : ""}${inlineHtml}`;
    }
  }

  flushInlineBuffer();

  return fragments.join(" ").replace(/\s{2,}/g, " ").trim();
}

function removeLeadingHeading(html = "", postTitle = "") {
  const normalizedTitle = normalizeHeadingText(postTitle);
  let cleaned = String(html);
  let changed = true;
  let removedAtLeastOne = false;

  while (changed) {
    changed = false;
    cleaned = cleaned.replace(/^\s*<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>\s*/i, (fullMatch, level, headingText) => {
      const normalizedHeading = normalizeHeadingText(headingText);

      if (
        removedAtLeastOne ||
        !normalizedHeading ||
        normalizedHeading === normalizedTitle ||
        GENERIC_LEADING_HEADINGS.has(normalizedHeading)
      ) {
        changed = true;
        removedAtLeastOne = true;
        return "";
      }

      return fullMatch;
    });
  }

  return cleaned;
}

async function localizeInlineImages(html = "", { slug, title }) {
  let imageIndex = 0;

  return replaceAsync(html, /<img\b[^>]*>/gi, async (tag) => {
    imageIndex += 1;
    const sourceUrl = extractAttribute(tag, "src");
    if (!sourceUrl) return "";

    const localUrl = await downloadImageToLocal({
      sourceUrl,
      slug,
      label: `inline-${imageIndex}`,
    });

    const altText = stripTags(extractAttribute(tag, "alt")) || title;
    const width = extractAttribute(tag, "width");
    const height = extractAttribute(tag, "height");

    return `<img src="${escapeHtml(localUrl)}" alt="${escapeHtml(altText)}"${
      width ? ` width="${escapeHtml(width)}"` : ""
    }${height ? ` height="${escapeHtml(height)}"` : ""} />`;
  });
}

function buildMetaTitle(post) {
  const yoastTitle = stripTags(post?.yoast_head_json?.title || "");
  return yoastTitle || stripTags(post?.title?.rendered || "");
}

function buildMetaDescription(post) {
  const yoastDescription = stripTags(post?.yoast_head_json?.description || "");
  if (yoastDescription) return yoastDescription;

  return trimExcerpt(post?.excerpt?.rendered || "", 160);
}

function buildExcerpt(post) {
  return trimExcerpt(post?.yoast_head_json?.description || post?.excerpt?.rendered || "", 220);
}

function buildTitle(post) {
  return stripTags(post?.title?.rendered || "");
}

async function buildCoverImage(post, title) {
  const featuredMedia = post?._embedded?.["wp:featuredmedia"]?.[0];
  const featuredSourceUrl = featuredMedia?.source_url;
  const coverImageAlt = stripTags(featuredMedia?.alt_text || "") || title;

  if (featuredSourceUrl) {
    const localCoverUrl = await downloadImageToLocal({
      sourceUrl: featuredSourceUrl,
      slug: post.slug,
      label: "cover",
    });

    return {
      coverImageUrl: localCoverUrl,
      coverImageAlt,
    };
  }

  const inlineImageMatch = String(post?.content?.rendered || "").match(
    /<img\b[^>]*src=(["'])([^"']+)\1[^>]*>/i
  );

  if (!inlineImageMatch) {
    return {
      coverImageUrl: null,
      coverImageAlt: null,
    };
  }

  const inlineTag = inlineImageMatch[0];
  const inlineSourceUrl = inlineImageMatch[2];
  const inlineAlt = stripTags(extractAttribute(inlineTag, "alt")) || title;
  const localInlineUrl = await downloadImageToLocal({
    sourceUrl: inlineSourceUrl,
    slug: post.slug,
    label: "cover",
  });

  return {
    coverImageUrl: localInlineUrl,
    coverImageAlt: inlineAlt,
  };
}

async function cleanPostHtml(post, title, coverImageUrl, routeMaps) {
  let html = post?.content?.rendered || "";

  html = rewriteInternalLinks(normalizeInternalLinks(html), routeMaps);
  html = await localizeInlineImages(html, { slug: post.slug, title });
  html = stripUnsafeMarkup(html);
  html = normalizeBlockStructure(html);
  html = removeLeadingHeading(html, title);
  if (coverImageUrl) {
    const escapedCoverImageUrl = coverImageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(`<img\\b[^>]*src=(["'])${escapedCoverImageUrl}\\1[^>]*>\\s*`, "i"),
      ""
    );
  }
  html = html.replace(/\s{2,}/g, " ").trim();

  return `<article>${html}</article>`;
}

async function fetchAllLivePosts() {
  const posts = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL(WP_POSTS_ENDPOINT);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("_embed", "1");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch live posts page ${page}: ${response.status}`);
    }

    totalPages = Number.parseInt(response.headers.get("x-wp-totalpages") || "1", 10);
    const pagePosts = await response.json();
    posts.push(...pagePosts);
    page += 1;
  }

  return posts;
}

async function importPosts({ limit = null, slug = null } = {}) {
  await ensureDirectory(BLOG_IMPORT_DIR);

  const [livePosts, locations, services] = await Promise.all([
    fetchAllLivePosts(),
    prisma.location.findMany({ select: { slug: true } }),
    prisma.service.findMany({ select: { slug: true } }),
  ]);
  const routeMaps = buildRouteMaps(locations, services);
  const filteredPosts = slug
    ? livePosts.filter((post) => post.slug === slug)
    : livePosts;
  const selectedPosts =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? filteredPosts.slice(0, limit)
      : filteredPosts;

  const importedSlugs = [];
  const failures = [];

  for (const post of selectedPosts) {
    const title = buildTitle(post);
    const metaTitle = buildMetaTitle(post);
    const metaDescription = buildMetaDescription(post);

    try {
      const { coverImageUrl, coverImageAlt } = await buildCoverImage(post, title);
      const contentHtml = await cleanPostHtml(post, title, coverImageUrl, routeMaps);
      const excerpt = buildExcerptFromHtml(contentHtml, 220) || buildExcerpt(post);

      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {
          title,
          metaTitle,
          metaDescription,
          excerpt: excerpt || null,
          contentHtml,
          coverImageUrl,
          coverImageAlt,
          status: "PUBLISHED",
          publishedAt: post.date ? new Date(post.date) : null,
          createdAt: post.date ? new Date(post.date) : undefined,
        },
        create: {
          title,
          metaTitle,
          metaDescription,
          slug: post.slug,
          excerpt: excerpt || null,
          contentHtml,
          coverImageUrl,
          coverImageAlt,
          status: "PUBLISHED",
          publishedAt: post.date ? new Date(post.date) : null,
          createdAt: post.date ? new Date(post.date) : undefined,
        },
      });

      importedSlugs.push(post.slug);
      console.log(`Imported ${post.slug}`);
    } catch (error) {
      failures.push({
        slug: post.slug,
        message: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed to import ${post.slug}:`, error);
    }
  }

  await prisma.blogPost.deleteMany({
    where: {
      slug: { notIn: importedSlugs },
      title: { equals: "post title", mode: "insensitive" },
    },
  });

  return {
    attempted: selectedPosts.length,
    imported: importedSlugs.length,
    failures,
  };
}

async function main() {
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
  const slugArgument = process.argv.find((argument) => argument.startsWith("--slug="));
  const limitValue = limitArgument ? Number.parseInt(limitArgument.split("=")[1], 10) : null;
  const slugValue = slugArgument ? String(slugArgument.split("=")[1] || "").trim() : null;
  const result = await importPosts({
    limit: Number.isFinite(limitValue) ? limitValue : null,
    slug: slugValue || null,
  });

  console.log(
    JSON.stringify(
      {
        attempted: result.attempted,
        imported: result.imported,
        failed: result.failures.length,
        failures: result.failures,
      },
      null,
      2
    )
  );

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
