const fs = require("fs/promises");
const path = require("path");
const vm = require("vm");
const { parse } = require("node-html-parser");

const DEFAULT_PROVIDER_LIST_PATH = "C:/Users/citry/OneDrive/Desktop/FMA-Features/FMA-Providers/index.html";
const OUTPUT_PATH = path.join(__dirname, "..", "prisma", "provider-seed-data.js");
const LIVE_SITE_ORIGIN = "https://drsfirst.com";
const FETCH_CONCURRENCY = 4;

function cleanText(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanParagraphText(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSlug(value = "") {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function tokenizePersonName(value = "") {
  return cleanText(value)
    .replace(/^dr\.?\s+/i, "")
    .replace(/\b(m\.?d\.?|d\.?o\.?|pa-c|fnp-?bc|fnp-c|agpcnp|facp|sfhm)\b/gi, " ")
    .replace(/["“”]/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function looksLikeExpectedProviderName(expectedName, actualName) {
  const expectedTokens = tokenizePersonName(expectedName);
  const actualTokens = tokenizePersonName(actualName);

  if (expectedTokens.length === 0 || actualTokens.length === 0) {
    return false;
  }

  const expectedLastName = expectedTokens[expectedTokens.length - 1];
  const actualLastName = actualTokens[actualTokens.length - 1];
  if (expectedLastName !== actualLastName) {
    return false;
  }

  return expectedTokens.some((token) => actualTokens.includes(token));
}

function buildFallbackBio(provider) {
  const locationText =
    provider.locations.length === 0
      ? ""
      : provider.locations.length === 1
        ? `Sees patients at ${provider.locations[0]}.`
        : `Sees patients at ${provider.locations.slice(0, -1).join(", ")}, and ${
            provider.locations[provider.locations.length - 1]
          }.`;
  const languageText =
    provider.languages.length === 0 ? "" : `Languages: ${provider.languages.join(", ")}.`;

  return [
    `${provider.name} is a ${provider.title} at First Medical Associates.`,
    locationText,
    languageText,
  ]
    .filter(Boolean)
    .join(" ");
}

function escapeJsString(value = "") {
  return JSON.stringify(String(value ?? ""));
}

function parseProviderDirectory(html) {
  const match = html.match(/const PROVIDERS = \[(.|\r|\n)*?\n\s*\];/);
  if (!match) {
    throw new Error("Could not find the PROVIDERS array in the supplied index.html file.");
  }

  const arrayLiteral = match[0]
    .replace(/^const PROVIDERS = /, "")
    .replace(/;\s*$/, "");

  const providers = vm.runInNewContext(arrayLiteral);
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new Error("The PROVIDERS array was empty or invalid.");
  }

  return providers.map((provider) => ({
    name: cleanText(provider.name),
    title: cleanText(provider.role),
    locations: Array.isArray(provider.locations)
      ? provider.locations.map(cleanText).filter(Boolean)
      : [cleanText(provider.location)].filter(Boolean),
    languages: Array.isArray(provider.languages)
      ? [...new Set(provider.languages.map(cleanText).filter(Boolean))]
      : [],
    imageUrl: cleanText(provider.img),
    slug: normalizeSlug(provider.link),
  }));
}

function getProviderPageUrl(slug) {
  return `${LIVE_SITE_ORIGIN}/${normalizeSlug(slug)}/`;
}

async function fetchProviderPageDetails(provider) {
  const response = await fetch(getProviderPageUrl(provider.slug), {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Codex Provider Sync/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${provider.slug}: ${response.status}`);
  }

  const html = await response.text();
  const root = parse(html);
  const heroRow = root.querySelector(".et_pb_row_0");

  if (!heroRow) {
    throw new Error(`Could not locate the provider hero row for ${provider.slug}.`);
  }

  const pageName = cleanText(heroRow.querySelector(".et_pb_text h1")?.text);
  if (!looksLikeExpectedProviderName(provider.name, pageName)) {
    throw new Error(
      `Live provider page mismatch for ${provider.slug}. Expected "${provider.name}", received "${pageName || "unknown"}".`
    );
  }

  const imageUrl = cleanText(heroRow.querySelector("img")?.getAttribute("src")) || provider.imageUrl;
  const textBlocks = heroRow.querySelectorAll(".et_pb_text");
  const bioBlock = textBlocks[textBlocks.length - 1];
  const bioParagraphs = bioBlock
    ? bioBlock
        .querySelectorAll("p")
        .map((node) => cleanParagraphText(node.text))
        .filter(Boolean)
    : [];

  const fallbackBio = cleanParagraphText(bioBlock?.text || "");
  const bookingLink = heroRow
    .querySelectorAll("a")
    .map((node) => ({
      text: cleanText(node.text),
      href: cleanText(node.getAttribute("href")),
    }))
    .find((entry) => entry.href && /book appointment/i.test(entry.text));

  return {
    imageUrl,
    imageAlt: `${provider.name} headshot`,
    bio: (bioParagraphs.length > 0 ? bioParagraphs : [fallbackBio]).filter(Boolean).join("\n\n"),
    linkUrl: bookingLink?.href || null,
  };
}

async function maybeUploadImageToBlob(provider) {
  const token = cleanText(process.env.BLOB_READ_WRITE_TOKEN);
  if (!token) {
    return provider.imageUrl;
  }

  let put;
  try {
    ({ put } = await import("@vercel/blob"));
  } catch (error) {
    throw new Error(
      `BLOB_READ_WRITE_TOKEN is set, but @vercel/blob is unavailable. Install it before running blob uploads. ${error.message}`
    );
  }

  const imageResponse = await fetch(provider.imageUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Codex Provider Sync/1.0)",
    },
  });
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image for ${provider.slug}: ${imageResponse.status}`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const pathname = new URL(provider.imageUrl).pathname;
  const extension = path.extname(pathname) || ".jpg";
  const blob = await put(`providers/${provider.slug}${extension}`, imageBuffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: imageResponse.headers.get("content-type") || undefined,
    token,
  });

  return blob.url;
}

async function mapWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  );

  return results;
}

function renderProviderSeedData(providers) {
  const lines = [];
  lines.push("module.exports = [");

  providers.forEach((provider) => {
    lines.push("  {");
    lines.push(`    name: ${escapeJsString(provider.name)},`);
    lines.push(`    title: ${escapeJsString(provider.title)},`);
    lines.push(
      `    locations: [${provider.locations.map((location) => escapeJsString(location)).join(", ")}],`
    );
    lines.push(
      `    languages: [${provider.languages.map((language) => escapeJsString(language)).join(", ")}],`
    );
    lines.push(`    imageUrl: ${escapeJsString(provider.imageUrl)},`);
    lines.push(`    imageAlt: ${escapeJsString(provider.imageAlt)},`);
    lines.push(`    slug: ${escapeJsString(provider.slug)},`);
    lines.push(`    linkUrl: ${provider.linkUrl ? escapeJsString(provider.linkUrl) : "null"},`);
    lines.push(`    bio: ${escapeJsString(provider.bio)},`);
    lines.push("  },");
  });

  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const inputPath = process.argv[2] || DEFAULT_PROVIDER_LIST_PATH;
  const sourceHtml = await fs.readFile(inputPath, "utf8");
  const directoryProviders = parseProviderDirectory(sourceHtml);

  console.log(`Parsed ${directoryProviders.length} providers from ${inputPath}.`);

  const hydratedProviders = await mapWithConcurrency(
    directoryProviders,
    async (provider, index) => {
      console.log(`[${index + 1}/${directoryProviders.length}] Fetching ${provider.slug}`);
      let liveDetails;
      try {
        liveDetails = await fetchProviderPageDetails(provider);
      } catch (error) {
        console.warn(`WARN ${provider.slug}: ${error.message}`);
        liveDetails = {
          imageUrl: provider.imageUrl,
          imageAlt: `${provider.name} headshot`,
          bio: buildFallbackBio(provider),
          linkUrl: null,
        };
      }
      const imageUrl = await maybeUploadImageToBlob({
        ...provider,
        imageUrl: liveDetails.imageUrl,
      });

      return {
        ...provider,
        ...liveDetails,
        imageUrl,
      };
    },
    FETCH_CONCURRENCY
  );

  await fs.writeFile(OUTPUT_PATH, renderProviderSeedData(hydratedProviders), "utf8");
  console.log(`Wrote ${hydratedProviders.length} providers to ${OUTPUT_PATH}`);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("BLOB_READ_WRITE_TOKEN is not set. Provider image URLs were kept as live WordPress URLs.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
