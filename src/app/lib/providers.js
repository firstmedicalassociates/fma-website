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

export function resolveLocationTitles(locationSlugs = [], locationTitleBySlug = {}) {
  return normalizeStringList(locationSlugs).map(
    (slug) => locationTitleBySlug[slug] || slug.replace(/^\//, "")
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
    locations: normalizeStringList(value?.locations).map((location) =>
      location.startsWith("/") ? location : `/${location.replace(/^\/+/, "")}`
    ),
    languages: normalizeStringList(value?.languages),
    sortOrder: Number.parseInt(String(value?.sortOrder ?? "0"), 10) || 0,
    isActive: Boolean(value?.isActive),
  };
}

export function mapProviderForDirectory(provider, locationTitleBySlug = {}) {
  const locationTitles = resolveLocationTitles(provider.locations, locationTitleBySlug);
  const languages = normalizeStringList(provider.languages);

  return {
    ...provider,
    image: provider.imageUrl,
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
