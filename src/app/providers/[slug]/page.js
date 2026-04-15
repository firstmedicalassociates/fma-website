/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl } from "../../lib/config/site";
import { splitLocationSlug } from "../../lib/locations";
import { prisma } from "../../lib/prisma";
import {
  buildLocationTitleMap,
  formatProviderList,
  resolveLocationTitles,
} from "../../lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!slug) return {};

  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: {
      name: true,
      title: true,
      bio: true,
      imageUrl: true,
      imageAlt: true,
      isActive: true,
    },
  });

  if (!provider || !provider.isActive) return {};

  const canonicalUrl = absoluteUrl(`/providers/${slug}`);
  const description = provider.bio.length > 160 ? `${provider.bio.slice(0, 157)}...` : provider.bio;
  const imageUrl = provider.imageUrl.startsWith("http")
    ? provider.imageUrl
    : absoluteUrl(provider.imageUrl);

  return {
    title: `${provider.name} | Providers`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "profile",
      url: canonicalUrl,
      title: `${provider.name} | Providers`,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: provider.imageAlt || provider.name }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${provider.name} | Providers`,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: provider.imageAlt || provider.name }] : undefined,
    },
  };
}

export default async function ProviderDetailPage({ params }) {
  const { slug } = await params;
  if (!slug) notFound();

  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: {
      name: true,
      title: true,
      bio: true,
      imageUrl: true,
      imageAlt: true,
      linkUrl: true,
      locations: true,
      languages: true,
      updatedAt: true,
      isActive: true,
    },
  });

  if (!provider || !provider.isActive) {
    notFound();
  }

  const locations = await prisma.location.findMany({
    orderBy: { title: "asc" },
    select: {
      slug: true,
      title: true,
    },
  });

  const locationTitleBySlug = buildLocationTitleMap(locations);
  const locationTitles = resolveLocationTitles(provider.locations, locationTitleBySlug);
  const locationLinks = provider.locations.map((locationSlug) => ({
    href: locationSlug,
    label:
      locationTitleBySlug[locationSlug] ||
      splitLocationSlug(locationSlug)
        .join(" / ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
  }));

  const canonicalUrl = absoluteUrl(`/providers/${slug}`);
  const imageUrl = provider.imageUrl.startsWith("http")
    ? provider.imageUrl
    : absoluteUrl(provider.imageUrl);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: provider.name,
    jobTitle: provider.title,
    image: imageUrl,
    knowsLanguage: provider.languages,
    workLocation: locationTitles.map((location) => ({
      "@type": "Place",
      name: location,
    })),
    url: canonicalUrl,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "56px 16px 88px",
        fontFamily: "var(--font-geist-sans), Arial, sans-serif",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 24 }}>
        <Link href="/providers" style={{ color: "#2563eb", fontWeight: 700 }}>
          Back to all providers
        </Link>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
            background: "#fff",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 18px 40px rgba(2, 6, 23, 0.08)",
          }}
        >
          <div style={{ display: "grid", gap: 16, justifyItems: "center" }}>
            <img
              src={provider.imageUrl}
              alt={provider.imageAlt || provider.name}
              style={{
                width: "100%",
                maxWidth: 280,
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                objectFit: "cover",
                boxShadow: "0 0 0 8px #fff, 0 0 0 1px #e5e7eb",
              }}
            />
            <div style={{ display: "grid", gap: 8, width: "100%" }}>
              <div>
                <strong>Locations</strong>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {locationLinks.length > 0 ? (
                    locationLinks.map((location) => (
                      <Link
                        key={location.href}
                        href={location.href}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 12px",
                          borderRadius: 999,
                          background: "#eef2ff",
                          color: "#1d4ed8",
                          fontWeight: 700,
                        }}
                      >
                        {location.label}
                      </Link>
                    ))
                  ) : (
                    <p style={{ color: "#6b7280" }}>No location assignments</p>
                  )}
                </div>
              </div>
              <div>
                <strong>Languages</strong>
                <p style={{ marginTop: 6, color: "#6b7280" }}>
                  {formatProviderList(provider.languages)}
                </p>
              </div>
            </div>
          </div>

          <article style={{ display: "grid", gap: 18 }}>
            <header>
              <p
                style={{
                  margin: 0,
                  color: "#2563eb",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontSize: 12,
                }}
              >
                Provider profile
              </p>
              <h1 style={{ margin: "10px 0 6px", fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
                {provider.name}
              </h1>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "1.05rem", fontWeight: 700 }}>
                {provider.title}
              </p>
            </header>

            <div style={{ display: "grid", gap: 14, color: "#334155", lineHeight: 1.75 }}>
              {String(provider.bio)
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={`${provider.name}-${index}`} style={{ margin: 0 }}>
                    {paragraph}
                  </p>
                ))}
            </div>

            {provider.linkUrl ? (
              <a
                href={provider.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "fit-content",
                  minHeight: 48,
                  padding: "0 18px",
                  borderRadius: 999,
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 14px 30px rgba(37, 99, 235, 0.24)",
                }}
              >
                Book appointment
              </a>
            ) : null}

            <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
              Updated {new Date(provider.updatedAt).toLocaleDateString()}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
