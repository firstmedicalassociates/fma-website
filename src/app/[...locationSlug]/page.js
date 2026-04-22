import { notFound } from "next/navigation";
import { SITE_NAME, absoluteUrl } from "../lib/config/site";
import {
  buildPostalAddressSchema,
  buildOpeningHoursSpecification,
  formatOfficeHoursForDisplay,
  groupLocationServices,
  joinLocationSegments,
} from "../lib/locations";
import { prisma } from "../lib/prisma";
import LocationPageShell from "./location-page-shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCATION_PAGE_SELECT = {
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
  officeHours: true,
  serviceIds: true,
  services: true,
  updatedAt: true,
};

function resolveLocationPath(params) {
  return joinLocationSegments(params?.locationSlug || []);
}

function resolveImageUrl(value) {
  if (!value) return undefined;
  return value.startsWith("http") ? value : absoluteUrl(value);
}

function buildServiceOfferCatalog(services = [], locationTitle = "Location") {
  const itemListElement = services
    .filter((service) => service?.title && service?.description)
    .map((service, index) => ({
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.description,
        serviceType: service.category || undefined,
      },
    }));

  if (itemListElement.length === 0) return undefined;

  return {
    "@type": "OfferCatalog",
    name: `${locationTitle} services`,
    itemListElement,
  };
}

export async function generateMetadata({ params }) {
  const locationPath = resolveLocationPath(await params);
  if (!locationPath) return {};

  const location = await prisma.location.findUnique({
    where: { slug: locationPath },
    select: LOCATION_PAGE_SELECT,
  });

  if (!location) return {};

  const description =
    location.intro ||
    location.accent ||
    location.displayAddress ||
    location.address ||
    `Visit ${location.title}.`;
  const imageUrl = resolveImageUrl(location.mapImageUrl);

  return {
    title: `${location.title} | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: absoluteUrl(location.slug),
    },
    openGraph: {
      type: "website",
      url: absoluteUrl(location.slug),
      title: `${location.title} | ${SITE_NAME}`,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: location.mapImageAlt || location.title }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${location.title} | ${SITE_NAME}`,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: location.mapImageAlt || location.title }] : undefined,
    },
  };
}

export default async function LocationLandingPage({ params }) {
  const locationPath = resolveLocationPath(await params);
  if (!locationPath) {
    notFound();
  }

  const location = await prisma.location.findUnique({
    where: { slug: locationPath },
    select: LOCATION_PAGE_SELECT,
  });

  if (!location) {
    notFound();
  }

  const selectedServiceIds = Array.isArray(location.serviceIds) ? location.serviceIds : [];
  const [providers, serviceRecords] = await Promise.all([
    prisma.provider.findMany({
      where: {
        isActive: true,
        locations: {
          has: locationPath,
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        title: true,
        imageUrl: true,
        imageAlt: true,
        linkUrl: true,
      },
    }),
    selectedServiceIds.length > 0
      ? prisma.service.findMany({
          where: {
            id: {
              in: selectedServiceIds,
            },
            isActive: true,
          },
          select: {
            id: true,
            category: true,
            title: true,
            description: true,
          },
        })
      : [],
  ]);

  const imageUrl = resolveImageUrl(location.mapImageUrl);
  const locationUrl = absoluteUrl(location.slug);
  const openingHours = formatOfficeHoursForDisplay(location.officeHours);
  const openingHoursSpecification = buildOpeningHoursSpecification(location.officeHours);
  const serviceRecordsById = Object.fromEntries(serviceRecords.map((service) => [service.id, service]));
  const locationServices =
    selectedServiceIds.length > 0
      ? selectedServiceIds.map((serviceId) => serviceRecordsById[serviceId]).filter(Boolean)
      : Array.isArray(location.services)
        ? location.services
        : [];
  const publicPhone = location.hideOfficePhone
    ? location.callTextPhone || location.directPhone || ""
    : location.phone || location.callTextPhone || location.directPhone || "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: `${SITE_NAME} - ${location.title}`,
    description: location.intro || location.accent || undefined,
    image: imageUrl,
    url: locationUrl,
    telephone: publicPhone || undefined,
    address: buildPostalAddressSchema(location),
    hasMap: location.directionsUrl || undefined,
    openingHours: openingHours.length > 0 ? openingHours : undefined,
    openingHoursSpecification:
      openingHoursSpecification.length > 0 ? openingHoursSpecification : undefined,
    hasOfferCatalog: buildServiceOfferCatalog(locationServices, location.title),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LocationPageShell
        location={{
          ...location,
          mapImageUrl: location.mapImageUrl || "",
          mapImageAlt: location.mapImageAlt || location.title,
          officeHours: Array.isArray(location.officeHours) ? location.officeHours : [],
          publicPhone,
          services: locationServices,
          imageUrl: imageUrl || "",
        }}
        providers={providers.map((provider) => ({
          ...provider,
          imageAlt: provider.imageAlt || provider.name,
          profileHref: `/providers/${provider.slug}`,
          ctaHref: provider.linkUrl || `/providers/${provider.slug}`,
          ctaLabel: provider.linkUrl ? "Book Appointment" : "View Profile",
        }))}
        serviceGroups={groupLocationServices(locationServices)}
      />
    </>
  );
}
