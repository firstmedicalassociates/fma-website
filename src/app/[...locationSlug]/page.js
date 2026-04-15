import { notFound } from "next/navigation";
import { SITE_NAME, absoluteUrl } from "../lib/config/site";
import { groupLocationServices, joinLocationSegments } from "../lib/locations";
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
};

function resolveLocationPath(params) {
  return joinLocationSegments(params?.locationSlug || []);
}

function resolveImageUrl(value) {
  if (!value) return undefined;
  return value.startsWith("http") ? value : absoluteUrl(value);
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

  const [location, providers] = await Promise.all([
    prisma.location.findUnique({
      where: { slug: locationPath },
      select: LOCATION_PAGE_SELECT,
    }),
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
  ]);

  if (!location) {
    notFound();
  }

  const imageUrl = resolveImageUrl(location.mapImageUrl);
  const locationUrl = absoluteUrl(location.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: `${SITE_NAME} - ${location.title}`,
    image: imageUrl,
    url: locationUrl,
    telephone: location.phone || undefined,
    address: location.address || undefined,
    hasMap: location.directionsUrl || undefined,
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
          parkingTitle: location.parkingTitle || "Parking",
          parkingDescription:
            location.parkingDescription || "Parking and arrival instructions will appear here.",
          officeHours: Array.isArray(location.officeHours) ? location.officeHours : [],
          services: Array.isArray(location.services) ? location.services : [],
          imageUrl: imageUrl || "",
        }}
        providers={providers.map((provider) => ({
          ...provider,
          imageAlt: provider.imageAlt || provider.name,
          profileHref: `/providers/${provider.slug}`,
          ctaHref: provider.linkUrl || `/providers/${provider.slug}`,
          ctaLabel: provider.linkUrl ? "Book Appointment" : "View Profile",
        }))}
        serviceGroups={groupLocationServices(location.services)}
      />
    </>
  );
}
