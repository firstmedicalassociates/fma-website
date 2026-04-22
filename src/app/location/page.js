import { SITE_NAME } from "../lib/config/site";
import { buildStructuredAddress, formatOfficeHoursForDisplay, resolveLocationAddressParts } from "../lib/locations";
import { prisma } from "../lib/prisma";
import LocationFinder from "./location-finder";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = {
  title: "Find a Location",
  description: `Browse ${SITE_NAME} locations on an interactive map and filter by city, state, or ZIP code.`,
};

const LOCATION_FINDER_SELECT = {
  id: true,
  slug: true,
  title: true,
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
  mapImageUrl: true,
  mapImageAlt: true,
  officeHours: true,
};

function normalizeAddressLines(location) {
  const displayAddress = String(location.displayAddress || "").trim();
  if (displayAddress) {
    return displayAddress
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return String(location.address || "")
    .split(/,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPublicPhone(location) {
  return location.hideOfficePhone
    ? location.callTextPhone || location.directPhone || ""
    : location.phone || location.callTextPhone || location.directPhone || "";
}

function buildGeocodeQuery(location) {
  const parts = resolveLocationAddressParts(location);
  const structuredAddress =
    parts.streetAddress && parts.addressCity ? buildStructuredAddress(parts) : "";

  return {
    geocodeQuery: structuredAddress || location.title || location.displayAddress || location.address,
    fallbackGeocodeQuery: location.title || location.address || location.displayAddress || "",
  };
}

export default async function LocationFinderPage() {
  const [locations, providers] = await Promise.all([
    prisma.location.findMany({
      orderBy: { title: "asc" },
      select: LOCATION_FINDER_SELECT,
    }),
    prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        title: true,
        imageUrl: true,
        imageAlt: true,
        locations: true,
      },
    }),
  ]);

  const providersByLocationSlug = providers.reduce((groups, provider) => {
    for (const locationSlug of provider.locations || []) {
      groups[locationSlug] = groups[locationSlug] || [];
      groups[locationSlug].push({
        slug: provider.slug,
        name: provider.name,
        title: provider.title,
        imageUrl: provider.imageUrl,
        imageAlt: provider.imageAlt || provider.name,
      });
    }

    return groups;
  }, {});

  const finderLocations = locations.map((location) => {
    const assignedProviders = providersByLocationSlug[location.slug] || [];
    const addressLines = normalizeAddressLines(location);
    const { geocodeQuery, fallbackGeocodeQuery } = buildGeocodeQuery(location);

    return {
      id: location.id,
      slug: location.slug,
      title: location.title,
      accent: location.accent || "",
      intro: location.intro || "",
      address: location.address || "",
      addressLines,
      addressCity: location.addressCity || "",
      addressState: location.addressState || "",
      postalCode: location.postalCode || "",
      directionsUrl: location.directionsUrl || "",
      bookingUrl: location.bookingUrl || "",
      mapImageUrl: location.mapImageUrl || "",
      mapImageAlt: location.mapImageAlt || location.title,
      officeHours: Array.isArray(location.officeHours) ? location.officeHours : [],
      officeHourRows: formatOfficeHoursForDisplay(location.officeHours),
      publicPhone: buildPublicPhone(location),
      geocodeQuery,
      fallbackGeocodeQuery,
      providerCount: assignedProviders.length,
      providers: assignedProviders.slice(0, 4),
    };
  });

  return <LocationFinder locations={finderLocations} />;
}
