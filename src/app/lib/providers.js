export function normalizeProviderSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeStringList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
  const items = source
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return [...new Set(items)];
}

export function formatProviderList(items) {
  return normalizeStringList(items).join(", ");
}

export function normalizeProviderCredential(value = "") {
  const cleaned = String(value || "")
    .trim()
    .replace(/\./g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ");
  if (!cleaned) return "";

  const upper = cleaned.toUpperCase();
  const compact = upper.replace(/\s+/g, "");

  if (compact === "MD") return "MD";
  if (compact === "DO") return "DO";
  if (compact === "PAC" || compact === "PA-C") return "PA-C";
  if (compact === "FNPBC" || compact === "FNP-BC") return "FNP-BC";
  if (compact === "FNPC" || compact === "FNP-C") return "FNP-C";

  return upper;
}

export function splitProviderCredentialTags(value = "") {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,;/]+/);
  const tags = source.map(normalizeProviderCredential).filter(Boolean);

  return [...new Set(tags)];
}

export function buildLocationTitleMap(locations = []) {
  return Object.fromEntries(
    locations
      .filter((location) => location?.slug && location?.title)
      .map((location) => [location.slug, location.title])
  );
}

const LOCATION_ABBREVIATIONS = new Set(["dr", "ii", "iii", "iv", "ln", "md", "rd", "ste"]);

export function formatLocationSlugFallback(value = "") {
  const normalized = String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!normalized) return "";

  const segments = normalized.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";

  return lastSegment
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lowered = part.toLowerCase();
      if (LOCATION_ABBREVIATIONS.has(lowered)) return lowered.toUpperCase();
      return lowered.charAt(0).toUpperCase() + lowered.slice(1);
    })
    .join(" ");
}

export function resolveLocationTitles(locationSlugs = [], locationTitleBySlug = {}) {
  return normalizeStringList(locationSlugs).map(
    (slug) => locationTitleBySlug[slug] || formatLocationSlugFallback(slug)
  );
}

export function normalizeProviderPayload(value) {
  return {
    name: String(value?.name || "").trim(),
    title: String(value?.title || "").trim(),
    bio: String(value?.bio || "").trim(),
    slug: normalizeProviderSlug(value?.slug || value?.name),
    imageUrl: String(value?.imageUrl || "").trim(),
    imageAlt: String(value?.imageAlt || "").trim() || null,
    linkUrl: String(value?.linkUrl || "").trim() || null,
    athenaProviderId: String(value?.athenaProviderId || "").trim() || null,
    athenaDepartmentId: String(value?.athenaDepartmentId || "").trim() || null,
    athenaSchedulingName: String(value?.athenaSchedulingName || "").trim() || null,
    locations: normalizeStringList(value?.locations).map((location) =>
      location.startsWith("/") ? location : `/${location.replace(/^\/+/, "")}`
    ),
    languages: normalizeStringList(value?.languages),
    sortOrder: Number.parseInt(String(value?.sortOrder ?? "0"), 10) || 0,
    isActive: Boolean(value?.isActive),
  };
}

export function isPrivateBlobUrl(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    return url.hostname.endsWith(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function resolveProviderImageSrc(provider = {}) {
  const imageUrl = String(provider.imageUrl || "").trim();
  const slug = String(provider.slug || "").trim();

  if (!imageUrl) return "";
  if (slug && isPrivateBlobUrl(imageUrl)) return `/api/provider-images/${slug}`;

  return imageUrl;
}

export function mapProviderForDirectory(provider, locationTitleBySlug = {}) {
  const locationTitles = resolveLocationTitles(provider.locations, locationTitleBySlug);
  const languages = normalizeStringList(provider.languages);
  const credentialTags = splitProviderCredentialTags(provider.title);

  return {
    ...provider,
    image: resolveProviderImageSrc(provider),
    imageAlt: provider.imageAlt || provider.name,
    link: `/providers/${provider.slug}`,
    role: formatProviderList(credentialTags) || provider.title,
    credentialTags,
    location: formatProviderList(locationTitles),
    language: formatProviderList(languages),
    locations: locationTitles,
    locationSlugs: normalizeStringList(provider.locations),
    languages,
  };
}

const PROVIDER_NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
const providerNameCollator = new Intl.Collator("en", { sensitivity: "base" });

function normalizeProviderNameToken(value = "") {
  return String(value || "")
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function splitProviderName(name = "") {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .map(normalizeProviderNameToken)
    .filter(Boolean);
}

export function getProviderLastName(name = "") {
  const parts = splitProviderName(name);
  if (parts.length === 0) return "";

  let index = parts.length - 1;
  while (index > 0 && PROVIDER_NAME_SUFFIXES.has(parts[index].toLowerCase())) {
    index -= 1;
  }

  return parts[index] || "";
}

export function getProviderFirstNames(name = "") {
  const parts = splitProviderName(name);
  if (parts.length <= 1) return parts[0] || "";

  let lastNameIndex = parts.length - 1;
  while (lastNameIndex > 0 && PROVIDER_NAME_SUFFIXES.has(parts[lastNameIndex].toLowerCase())) {
    lastNameIndex -= 1;
  }

  return parts.slice(0, lastNameIndex).join(" ");
}

export function compareProvidersByLastName(first = {}, second = {}) {
  const lastNameComparison = providerNameCollator.compare(
    getProviderLastName(first.name),
    getProviderLastName(second.name)
  );
  if (lastNameComparison !== 0) return lastNameComparison;

  const firstNamesComparison = providerNameCollator.compare(
    getProviderFirstNames(first.name),
    getProviderFirstNames(second.name)
  );
  if (firstNamesComparison !== 0) return firstNamesComparison;

  return providerNameCollator.compare(String(first.name || ""), String(second.name || ""));
}
