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

  return {
    ...provider,
    image: resolveProviderImageSrc(provider),
    imageAlt: provider.imageAlt || provider.name,
    link: `/providers/${provider.slug}`,
    role: provider.title,
    location: formatProviderList(locationTitles),
    language: formatProviderList(languages),
    locations: locationTitles,
    locationSlugs: normalizeStringList(provider.locations),
    languages,
  };
}
