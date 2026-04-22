import "server-only";

import {
  buildDisplayAddress,
  buildStructuredAddress,
  normalizeOfficeHours,
} from "./locations";
import { normalizeServiceIds } from "./services";

export const LOCATION_FORM_SELECT = {
  id: true,
  slug: true,
  title: true,
  eyebrow: true,
  accent: true,
  intro: true,
  address: true,
  streetAddress: true,
  addressCity: true,
  addressState: true,
  postalCode: true,
  addressCountry: true,
  displayAddress: true,
  phone: true,
  directPhone: true,
  callTextPhone: true,
  hideOfficePhone: true,
  directionsUrl: true,
  bookingUrl: true,
  reviewUrl: true,
  mapImageUrl: true,
  mapImageAlt: true,
  parkingTitle: true,
  parkingDescription: true,
  officeHours: true,
  serviceIds: true,
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

function normalizeBoolean(value) {
  return Boolean(value);
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
  const addressParts = {
    streetAddress: normalizeText(input.streetAddress),
    addressCity: normalizeText(input.addressCity),
    addressState: normalizeText(input.addressState),
    postalCode: normalizeText(input.postalCode),
    addressCountry: normalizeText(input.addressCountry),
  };
  const generatedAddress = buildStructuredAddress(addressParts);
  const generatedDisplayAddress = buildDisplayAddress(addressParts);

  return {
    slug: normalizeLocationSlug(input.slug),
    title: normalizeRequiredText(input.title),
    eyebrow: normalizeText(input.eyebrow),
    accent: normalizeText(input.accent),
    intro: normalizeText(input.intro),
    address: generatedAddress || normalizeRequiredText(input.address),
    streetAddress: addressParts.streetAddress,
    addressCity: addressParts.addressCity,
    addressState: addressParts.addressState,
    postalCode: addressParts.postalCode,
    addressCountry: addressParts.addressCountry,
    displayAddress: generatedDisplayAddress || normalizeText(input.displayAddress),
    phone: normalizeText(input.phone),
    directPhone: normalizeText(input.directPhone),
    callTextPhone: normalizeText(input.callTextPhone),
    hideOfficePhone: normalizeBoolean(input.hideOfficePhone),
    directionsUrl: normalizeText(input.directionsUrl),
    bookingUrl: normalizeText(input.bookingUrl),
    reviewUrl: normalizeText(input.reviewUrl),
    mapImageUrl: normalizeText(input.mapImageUrl),
    mapImageAlt: normalizeText(input.mapImageAlt),
    parkingTitle: normalizeText(input.parkingTitle),
    parkingDescription: normalizeText(input.parkingDescription),
    officeHours: normalizeOfficeHours(input.officeHours),
    serviceIds: normalizeServiceIds(input.serviceIds),
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
