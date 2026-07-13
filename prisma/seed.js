require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const locationSeedData = require("./location-seed-data");
const locationInfoSeedData = require("./location-info-seed-data");
const providerSeedData = require("./provider-seed-data");
const serviceSeedData = require("./service-seed-data");

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

const STANDARD_LOCATION_OFFICE_HOURS = [
  { day: "Sunday", closed: true },
  { day: "Monday", startTime: "08:00", endTime: "17:00" },
  { day: "Tuesday", startTime: "08:00", endTime: "17:00" },
  { day: "Wednesday", startTime: "08:00", endTime: "17:00" },
  { day: "Thursday", startTime: "08:00", endTime: "17:00" },
  { day: "Friday", startTime: "08:00", endTime: "17:00" },
  { day: "Saturday", closed: true },
];

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
  const slug = normalizeSlug(entry.href);
  const infoSeed = locationInfoSeedData[slug];
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
    slug,
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
    officeHours: STANDARD_LOCATION_OFFICE_HOURS,
    infoSections: normalizeInfoSections(infoSeed?.sections),
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

function normalizeInfoSections(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const key = cleanText(entry?.key);
      const title = cleanText(entry?.title);
      const paragraphs = Array.isArray(entry?.paragraphs)
        ? entry.paragraphs.map((paragraph) => cleanText(paragraph)).filter(Boolean)
        : [];

      if (!title || paragraphs.length === 0) return null;

      return {
        key: key || normalizeSlug(title).replace(/^\//, ""),
        title,
        paragraphs,
      };
    })
    .filter(Boolean);
}

function formatReadableList(values = []) {
  const items = cleanStringList(values);

  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function mergeLocation(existingLocation, seededLocation) {
  const existingInfoSections = normalizeInfoSections(existingLocation.infoSections);
  const seededInfoSections = normalizeInfoSections(seededLocation.infoSections);

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
    officeHours: seededLocation.officeHours,
    infoSections: existingInfoSections.length > 0 ? existingInfoSections : seededInfoSections,
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

locationSlugByProviderLabel.set("Bowie (Health Center Dr)", "/bowie-dev");
locationSlugByProviderLabel.set("Bowie (Gallant Fox Ln)", "/location/bowie");
locationSlugByProviderLabel.set("Columbia (Snowden River Pkwy)", "/location/columbia");
locationSlugByProviderLabel.set("Columbia (Broken Land Dr)", "/columbia-dev");
locationSlugByProviderLabel.set("Columbia I", "/location/columbia");
locationSlugByProviderLabel.set("Columbia II", "/columbia-dev");

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
    bio: cleanText(entry.bio) || buildProviderBio(entry),
    imageUrl: cleanText(entry.imageUrl),
    imageAlt: cleanText(entry.imageAlt) || `${cleanText(entry.name)} headshot`,
    linkUrl: cleanText(entry.linkUrl),
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
    bio: seededProvider.bio,
    imageUrl: seededProvider.imageUrl,
    imageAlt: seededProvider.imageAlt,
    linkUrl: seededProvider.linkUrl,
    locations: seededProvider.locations,
    languages: seededProvider.languages,
    sortOrder: seededProvider.sortOrder,
    isActive: seededProvider.isActive,
  };
}

function buildSeedService(entry, sortOrder) {
  return {
    category: cleanText(entry.category) || "General Care",
    slug: cleanText(entry.slug),
    title: cleanText(entry.title),
    description: cleanText(entry.description),
    icon: cleanText(entry.icon) || "medical_services",
    pageContent:
      entry.pageContent && typeof entry.pageContent === "object" ? entry.pageContent : null,
    sortOrder,
    isActive: true,
  };
}

function mergeService(existingService, seededService) {
  return {
    category: seededService.category,
    slug: seededService.slug,
    title: seededService.title,
    description: seededService.description,
    icon: seededService.icon,
    pageContent: seededService.pageContent,
    sortOrder: seededService.sortOrder,
    isActive: typeof existingService.isActive === "boolean" ? existingService.isActive : true,
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

  for (const [index, entry] of serviceSeedData.entries()) {
    const seededService = buildSeedService(entry, index);
    const existingService = await prisma.service.findFirst({
      where: {
        OR: [{ slug: seededService.slug }, { category: seededService.category, title: seededService.title }],
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (existingService) {
      await prisma.service.update({
        where: { id: existingService.id },
        data: mergeService(existingService, seededService),
      });
      continue;
    }

    await prisma.service.create({
      data: seededService,
    });
  }

  const seededSlugs = new Set(
    serviceSeedData.map((entry) => cleanText(entry.slug)).filter(Boolean)
  );
  const existingServices = await prisma.service.findMany({
    select: {
      id: true,
      slug: true,
    },
  });
  const staleServices = existingServices.filter(
    (service) => !seededSlugs.has(cleanText(service.slug))
  );

  if (staleServices.length > 0) {
    const staleServiceIdSet = new Set(staleServices.map((service) => service.id));
    const locationsUsingStaleServices = await prisma.location.findMany({
      where: {
        serviceIds: {
          hasSome: [...staleServiceIdSet],
        },
      },
      select: {
        id: true,
        serviceIds: true,
      },
    });

    await prisma.$transaction([
      ...locationsUsingStaleServices.map((location) =>
        prisma.location.update({
          where: { id: location.id },
          data: {
            serviceIds: (location.serviceIds || []).filter(
              (serviceId) => !staleServiceIdSet.has(serviceId)
            ),
          },
        })
      ),
      prisma.service.deleteMany({
        where: {
          id: {
            in: [...staleServiceIdSet],
          },
        },
      }),
    ]);
  }

  const allActiveServices = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true },
  });
  const allActiveServiceIds = allActiveServices.map((service) => service.id);

  const sortedLocations = [...locationSeedData].sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" })
  );

  for (const entry of sortedLocations) {
    const seededLocation = {
      ...buildSeedLocation(entry),
      // Seed behavior mirrors selecting every service in the location editor.
      serviceIds: allActiveServiceIds,
    };
    const shouldForceSeedAddressFields =
      seededLocation.slug === "/location/bowie" || seededLocation.slug === "/bowie-dev";
    const existingLocation = await prisma.location.findUnique({
      where: { slug: seededLocation.slug },
    });

    if (existingLocation) {
      const mergedLocation = mergeLocation(existingLocation, seededLocation);
      await prisma.location.update({
        where: { slug: seededLocation.slug },
        data: {
          ...(shouldForceSeedAddressFields
            ? {
                ...mergedLocation,
                address: seededLocation.address,
                streetAddress: seededLocation.streetAddress,
                addressCity: seededLocation.addressCity,
                addressState: seededLocation.addressState,
                postalCode: seededLocation.postalCode,
                addressCountry: seededLocation.addressCountry,
                displayAddress: seededLocation.displayAddress,
                directionsUrl: seededLocation.directionsUrl,
                mapImageAlt: seededLocation.mapImageAlt,
              }
            : mergedLocation),
          serviceIds: allActiveServiceIds,
        },
      });
      continue;
    }

    await prisma.location.create({
      data: seededLocation,
    });
  }

  const seededProviderSlugs = new Set();

  for (const [index, entry] of providerSeedData.entries()) {
    const seededProvider = buildSeedProvider(entry, index);
    seededProviderSlugs.add(seededProvider.slug);
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

  await prisma.provider.deleteMany({
    where: {
      slug: {
        notIn: [...seededProviderSlugs],
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
