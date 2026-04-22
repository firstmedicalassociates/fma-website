require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const locationSeedData = require("./location-seed-data");
const providerSeedData = require("./provider-seed-data");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set for seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: databaseUrl }),
});

function cleanText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeSlug(value = "") {
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

function normalizeAddressLine(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,+$/g, "");
}

function parseCityStatePostal(line = "") {
  const match = String(line || "")
    .trim()
    .match(/^(.+?),\s*([A-Za-z. ]+)\s+(\d{5}(?:-\d{4})?)$/);

  if (!match) {
    return {
      addressCity: null,
      addressState: null,
      postalCode: null,
    };
  }

  return {
    addressCity: cleanText(match[1]),
    addressState: cleanText(match[2]),
    postalCode: cleanText(match[3]),
  };
}

function buildSeedLocation(entry) {
  const addressLines = Array.isArray(entry.addressLines)
    ? entry.addressLines.map((line) => normalizeAddressLine(line)).filter(Boolean)
    : [];
  const secondLineParts = parseCityStatePostal(addressLines[1] || "");
  const displayAddress = addressLines.join("\n") || entry.name;
  const address = addressLines.join(", ") || entry.name;
  const hasStructuredAddress = Boolean(
    addressLines[0] && secondLineParts.addressCity && secondLineParts.addressState
  );

  return {
    slug: normalizeSlug(entry.href),
    title: cleanText(entry.name),
    accent: `Primary care in ${cleanText(entry.name)}`,
    intro: `Visit our ${cleanText(entry.name)} location for primary care appointments and office information.`,
    address,
    streetAddress: hasStructuredAddress ? addressLines[0] : null,
    addressCity: hasStructuredAddress ? secondLineParts.addressCity : null,
    addressState: hasStructuredAddress ? secondLineParts.addressState : null,
    postalCode: hasStructuredAddress ? secondLineParts.postalCode : null,
    addressCountry: hasStructuredAddress ? "US" : null,
    displayAddress,
    phone: cleanText(entry.cityStatePhone),
    directionsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`,
    mapImageUrl: cleanText(entry.img),
    mapImageAlt: `${cleanText(entry.name)} office`,
    officeHours: [],
    serviceIds: [],
    services: [],
    hideOfficePhone: false,
  };
}

function pickText(existingValue, seededValue) {
  return cleanText(existingValue) || cleanText(seededValue);
}

function pickBoolean(existingValue, seededValue) {
  return typeof existingValue === "boolean" ? existingValue : seededValue;
}

function pickArray(existingValue, seededValue) {
  return Array.isArray(existingValue) && existingValue.length > 0 ? existingValue : seededValue;
}

function cleanStringList(values = []) {
  const source = Array.isArray(values) ? values : [values];

  return [...new Set(source.map((value) => String(value || "").trim()).filter(Boolean))];
}

function formatReadableList(values = []) {
  const items = cleanStringList(values);

  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function mergeLocation(existingLocation, seededLocation) {
  return {
    title: pickText(existingLocation.title, seededLocation.title),
    eyebrow: pickText(existingLocation.eyebrow, null),
    accent: pickText(existingLocation.accent, seededLocation.accent),
    intro: pickText(existingLocation.intro, seededLocation.intro),
    address: pickText(existingLocation.address, seededLocation.address),
    streetAddress: pickText(existingLocation.streetAddress, seededLocation.streetAddress),
    addressCity: pickText(existingLocation.addressCity, seededLocation.addressCity),
    addressState: pickText(existingLocation.addressState, seededLocation.addressState),
    postalCode: pickText(existingLocation.postalCode, seededLocation.postalCode),
    addressCountry: pickText(existingLocation.addressCountry, seededLocation.addressCountry),
    displayAddress: pickText(existingLocation.displayAddress, seededLocation.displayAddress),
    phone: pickText(existingLocation.phone, seededLocation.phone),
    directPhone: pickText(existingLocation.directPhone, null),
    callTextPhone: pickText(existingLocation.callTextPhone, null),
    hideOfficePhone: pickBoolean(existingLocation.hideOfficePhone, seededLocation.hideOfficePhone),
    directionsUrl: pickText(existingLocation.directionsUrl, seededLocation.directionsUrl),
    bookingUrl: pickText(existingLocation.bookingUrl, null),
    reviewUrl: pickText(existingLocation.reviewUrl, null),
    mapImageUrl: pickText(existingLocation.mapImageUrl, seededLocation.mapImageUrl),
    mapImageAlt: pickText(existingLocation.mapImageAlt, seededLocation.mapImageAlt),
    parkingTitle: pickText(existingLocation.parkingTitle, null),
    parkingDescription: pickText(existingLocation.parkingDescription, null),
    officeHours: pickArray(existingLocation.officeHours, seededLocation.officeHours),
    serviceIds: pickArray(existingLocation.serviceIds, seededLocation.serviceIds),
    services:
      Array.isArray(existingLocation.services) && existingLocation.services.length > 0
        ? existingLocation.services
        : seededLocation.services,
  };
}

const locationSlugByProviderLabel = new Map(
  locationSeedData.map((entry) => [
    cleanText(entry.name)?.replace(/,\s*[A-Z]{2}$/i, "") || "",
    normalizeSlug(entry.href),
  ])
);

locationSlugByProviderLabel.set("Bowie (Health Center Dr)", "/location/bowie");
locationSlugByProviderLabel.set("Bowie (Gallant Fox Ln)", "/location/bowie");
locationSlugByProviderLabel.set("Columbia I", "/location/columbia");
locationSlugByProviderLabel.set("Columbia II", "/location/columbia");

function normalizeProviderLocationSlug(locationLabel = "") {
  const normalizedLabel = cleanText(locationLabel);
  if (!normalizedLabel) return null;

  return (
    locationSlugByProviderLabel.get(normalizedLabel) ||
    normalizeSlug(`/location/${normalizedLabel}`)
  );
}

function buildProviderBio(entry) {
  const locationLine = formatReadableList(entry.locations);
  const languageLine = formatReadableList(entry.languages);
  const bioParts = [
    `${cleanText(entry.name)} is a ${cleanText(entry.title)} at First Medical Associates.`,
    locationLine ? `Sees patients at ${locationLine}.` : "",
    languageLine ? `Languages: ${languageLine}.` : "",
  ].filter(Boolean);

  return bioParts.join(" ");
}

function buildSeedProvider(entry, sortOrder) {
  return {
    slug: String(entry.slug || "").trim().toLowerCase(),
    name: cleanText(entry.name),
    title: cleanText(entry.title),
    bio: buildProviderBio(entry),
    imageUrl: cleanText(entry.imageUrl),
    imageAlt: `${cleanText(entry.name)} headshot`,
    linkUrl: null,
    locations: cleanStringList(entry.locations)
      .map((locationLabel) => normalizeProviderLocationSlug(locationLabel))
      .filter(Boolean),
    languages: cleanStringList(entry.languages),
    sortOrder,
    isActive: true,
  };
}

function mergeProvider(existingProvider, seededProvider) {
  return {
    name: seededProvider.name,
    title: seededProvider.title,
    bio: cleanText(existingProvider.bio) || seededProvider.bio,
    imageUrl: seededProvider.imageUrl,
    imageAlt: cleanText(existingProvider.imageAlt) || seededProvider.imageAlt,
    linkUrl: cleanText(existingProvider.linkUrl),
    locations: seededProvider.locations,
    languages: seededProvider.languages,
    sortOrder: seededProvider.sortOrder,
    isActive: typeof existingProvider.isActive === "boolean" ? existingProvider.isActive : true,
  };
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env for seeding."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { password: passwordHash },
    create: {
      email,
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const sortedLocations = [...locationSeedData].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" })
  );

  for (const entry of sortedLocations) {
    const seededLocation = buildSeedLocation(entry);
    const existingLocation = await prisma.location.findUnique({
      where: { slug: seededLocation.slug },
    });

    if (existingLocation) {
      await prisma.location.update({
        where: { slug: seededLocation.slug },
        data: mergeLocation(existingLocation, seededLocation),
      });
      continue;
    }

    await prisma.location.create({
      data: seededLocation,
    });
  }

  for (const [index, entry] of providerSeedData.entries()) {
    const seededProvider = buildSeedProvider(entry, index);
    const existingProvider = await prisma.provider.findUnique({
      where: { slug: seededProvider.slug },
    });

    if (existingProvider) {
      await prisma.provider.update({
        where: { slug: seededProvider.slug },
        data: mergeProvider(existingProvider, seededProvider),
      });
      continue;
    }

    await prisma.provider.create({
      data: seededProvider,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
