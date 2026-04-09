export const PROVIDER_LOCATION_OPTIONS = [
  "Annapolis",
  "Bowie (Gallant Fox Ln)",
  "Bowie (Health Center Dr)",
  "Columbia",
  "Columbia I",
  "Columbia II",
  "Crofton",
  "Frederick",
  "Gaithersburg",
  "Germantown",
  "Glen Burnie",
  "Greenbelt",
  "Lutherville",
  "Nottingham",
  "Rockville",
  "Severna Park",
  "Silver Spring",
];

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

export function normalizeProviderPayload(value) {
  return {
    name: String(value?.name || "").trim(),
    title: String(value?.title || "").trim(),
    bio: String(value?.bio || "").trim(),
    slug: normalizeProviderSlug(value?.slug || value?.name),
    imageUrl: String(value?.imageUrl || "").trim(),
    linkUrl: String(value?.linkUrl || "").trim() || null,
    locations: normalizeStringList(value?.locations),
    languages: normalizeStringList(value?.languages),
  };
}

export function mapProviderForDirectory(provider) {
  const locations = normalizeStringList(provider.locations);
  const languages = normalizeStringList(provider.languages);

  return {
    ...provider,
    image: provider.imageUrl,
    link: `/providers/${provider.slug}`,
    role: provider.title,
    location: formatProviderList(locations),
    language: formatProviderList(languages),
    locations,
    languages,
  };
}
