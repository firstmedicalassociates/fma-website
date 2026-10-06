import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteHeader from "../../components/site-header";
import { SITE_NAME, pageUrl } from "../../lib/config/site";
import { prisma } from "../../lib/prisma";
import { buildPostalAddressSchema } from "../../lib/locations";
import serviceAvailability from "../../lib/service-availability.cjs";
import { getServiceSeoContent } from "../../lib/seo";
import { SERVICE_SELECT } from "../../lib/services";
import ServiceDetailTemplate from "../service-detail-template";

export const runtime = "nodejs";
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = await prisma.service.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      slug: true,
      title: true,
      description: true,
    },
  });

  if (!service) {
    return {
      title: "Service",
      description: "Detailed clinical service information from First Medical Associates.",
    };
  }

  const seo = getServiceSeoContent(service);
  const canonicalUrl = pageUrl(`/service/${slug}`);

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: canonicalUrl,
      title: seo.title,
      description: seo.description,
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: seo.description,
    },
  };
}

export default async function ServiceDetailPage({ params }) {
  const { slug } = await params;

  const service = await prisma.service.findFirst({
    where: {
      slug,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: SERVICE_SELECT,
  });

  if (!service) {
    notFound();
  }

  const allowedLocationSlugs = serviceAvailability.getServiceLocationSlugs(service.slug);
  const offeringLocations = allowedLocationSlugs
    ? await prisma.location.findMany({
        where: { slug: { in: allowedLocationSlugs } },
        select: {
          slug: true,
          title: true,
          address: true,
          displayAddress: true,
          streetAddress: true,
          addressCity: true,
          addressState: true,
          postalCode: true,
          addressCountry: true,
        },
      })
    : [];
  const seo = getServiceSeoContent(service);
  const canonicalUrl = pageUrl(`/service/${slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalWebPage",
        name: seo.title,
        headline: seo.h1,
        description: seo.description,
        url: canonicalUrl,
        isPartOf: pageUrl("/services"),
        about: {
          "@id": `${canonicalUrl}#service`,
        },
      },
      {
        "@type": "Service",
        "@id": `${canonicalUrl}#service`,
        name: service.title,
        description: service.description || seo.description,
        areaServed: offeringLocations.length ? offeringLocations.map((office) => office.title) : "Maryland",
        provider: offeringLocations.length ? offeringLocations.map((office) => ({
          "@type": "MedicalClinic",
          name: `${SITE_NAME} - ${office.title}`,
          url: pageUrl(office.slug),
          address: buildPostalAddressSchema(office),
        })) : {
          "@type": "MedicalClinic",
          name: SITE_NAME,
          url: pageUrl("/locations"),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: pageUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Services",
            item: pageUrl("/services"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: service.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <ServiceDetailTemplate service={service} />
      <SiteFooter />
    </>
  );
}
