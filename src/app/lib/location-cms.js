import "server-only";

export const LOCATION_FORM_SELECT = {
  id: true,
  slug: true,
  title: true,
  eyebrow: true,
  accent: true,
  intro: true,
  address: true,
  displayAddress: true,
  phone: true,
  directionsUrl: true,
  bookingUrl: true,
  mapImageUrl: true,
  mapImageAlt: true,
  parkingTitle: true,
  parkingDescription: true,
  officeHours: true,
  services: true,
  updatedAt: true,
  createdAt: true,
};

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeRequiredText(value) {
  return String(value ?? "").trim();
}

export function normalizeLocationSlug(value = "") {
  const segments = String(value)
    .split("/")
    .map((segment) =>
      String(segment)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean);

  return segments.length > 0 ? `/${segments.join("/")}` : "";
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function normalizeServices(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      const category = String(value?.category ?? "").trim();
      const title = String(value?.title ?? "").trim();
      const description = String(value?.description ?? "").trim();

      if (!title || !description) return null;

      return {
        category: category || "General Care",
        title,
        description,
      };
    })
    .filter(Boolean);
}

function buildLocationRecord(input = {}) {
  return {
    slug: normalizeLocationSlug(input.slug),
    title: normalizeRequiredText(input.title),
    eyebrow: normalizeText(input.eyebrow),
    accent: normalizeText(input.accent),
    intro: normalizeText(input.intro),
    address: normalizeRequiredText(input.address),
    displayAddress: normalizeText(input.displayAddress),
    phone: normalizeText(input.phone),
    directionsUrl: normalizeText(input.directionsUrl),
    bookingUrl: normalizeText(input.bookingUrl),
    mapImageUrl: normalizeText(input.mapImageUrl),
    mapImageAlt: normalizeText(input.mapImageAlt),
    parkingTitle: normalizeText(input.parkingTitle),
    parkingDescription: normalizeText(input.parkingDescription),
    officeHours: normalizeStringArray(input.officeHours),
    services: normalizeServices(input.services),
  };
}

export function validateLocationPayload(payload) {
  const normalized = buildLocationRecord(payload);

  if (!normalized.slug || !normalized.title || !normalized.address) {
    return {
      ok: false,
      error: "Title, slug, and address are required.",
    };
  }

  return {
    ok: true,
    data: normalized,
  };
}
