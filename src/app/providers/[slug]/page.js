/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteHeader from "../../components/site-header";
import { absoluteUrl } from "../../lib/config/site";
import { buildDisplayAddress, splitLocationSlug } from "../../lib/locations";
import { prisma } from "../../lib/prisma";
import {
  buildLocationTitleMap,
  formatLocationSlugFallback,
  formatProviderList,
  resolveLocationTitles,
} from "../../lib/providers";
import styles from "./provider-detail.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isExternalUrl(value = "") {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function splitBioParagraphs(value = "") {
  const paragraphs = String(value || "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  return ["Provider biography details will appear here once they are added in the CMS."];
}

function formatUpdatedDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function renderInlineIcon(kind) {
  if (kind === "calendar") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 3.75v4.5M17 3.75v4.5M3.5 9.5h17M8 13h2.5M13.5 13H16M8 17h2.5M13.5 17H16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "map") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 21s-6-5.4-6-11a6 6 0 1 1 12 0c0 5.6-6 11-6 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "user") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5.5 19.25a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "pulse") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 12h4.2l1.8-4.3L12.5 17l2.2-5H21" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "stack") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m12 4.5 8 4.2-8 4.3-8-4.3 8-4.2Zm-8 8.5 8 4.2 8-4.2M4 17.5l8 4 8-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "check") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m8.4 12.1 2.2 2.3 5-5.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "globe") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.5 2.3 4 5.5 4 9s-1.5 6.7-4 9c-2.5-2.3-4-5.5-4-9s1.5-6.7 4-9Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "clock") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7.5v5l3.4 2" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 12h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ActionLink({ href, className, external = false, icon, children }) {
  const resolvedHref = String(href || "").trim();
  const sharedContent = (
    <>
      {icon ? <span className={styles.actionIcon}>{icon}</span> : null}
      <span>{children}</span>
    </>
  );

  if (!resolvedHref) {
    return <span className={`${className} ${styles.actionDisabled}`}>{sharedContent}</span>;
  }

  if (external || isExternalUrl(resolvedHref)) {
    return (
      <a className={className} href={resolvedHref} rel="noopener noreferrer" target="_blank">
        {sharedContent}
      </a>
    );
  }

  return (
    <Link className={className} href={resolvedHref}>
      {sharedContent}
    </Link>
  );
}

function QuickInfoCard({ label, value, icon, href, external = false }) {
  const content = (
    <>
      <span className={styles.quickInfoIcon}>{icon}</span>
      <div className={styles.quickInfoCopy}>
        <span className={styles.quickInfoLabel}>{label}</span>
        <strong className={styles.quickInfoValue}>{value}</strong>
      </div>
    </>
  );

  if (!href) {
    return <div className={styles.quickInfoCard}>{content}</div>;
  }

  if (external || isExternalUrl(href)) {
    return (
      <a
        className={`${styles.quickInfoCard} ${styles.quickInfoCardLink}`}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={`${styles.quickInfoCard} ${styles.quickInfoCardLink}`} href={href}>
      {content}
    </Link>
  );
}

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

  const assignedLocations = provider.locations.length
    ? await prisma.location.findMany({
        where: {
          slug: {
            in: provider.locations,
          },
        },
        select: {
          slug: true,
          title: true,
          address: true,
          streetAddress: true,
          addressCity: true,
          addressState: true,
          postalCode: true,
          addressCountry: true,
          displayAddress: true,
          bookingUrl: true,
        },
      })
    : [];

  const locationTitleBySlug = buildLocationTitleMap(assignedLocations);
  const locationTitles = resolveLocationTitles(provider.locations, locationTitleBySlug);
  const assignedLocationBySlug = new Map(assignedLocations.map((location) => [location.slug, location]));
  const locationLinks = provider.locations.map((locationSlug) => {
    const location = assignedLocationBySlug.get(locationSlug);
    const label =
      locationTitleBySlug[locationSlug] ||
      formatLocationSlugFallback(locationSlug) ||
      splitLocationSlug(locationSlug)
        .join(" / ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const address = location
      ? (location.displayAddress || buildDisplayAddress(location) || location.address || "")
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join(", ")
      : "";

    return {
      href: location?.slug || null,
      label,
      address,
      bookingUrl: location?.bookingUrl || "",
    };
  });

  const primaryLocation = locationLinks[0] || null;
  const bookingSource = String(provider.linkUrl || primaryLocation?.bookingUrl || "").trim();
  const bookingHref = bookingSource || primaryLocation?.href || "/locations";
  const bookingExternal = isExternalUrl(bookingSource);
  const locationsHref =
    locationLinks.length > 1
      ? "#provider-locations"
      : primaryLocation?.href || "/providers";
  const locationsLabel =
    locationLinks.length > 1
      ? "View Locations"
      : primaryLocation?.href
        ? "View Location"
        : "Back to Providers";
  const heroBadgeLabel = primaryLocation?.label || "Provider Profile";
  const subtitle = provider.title
    ? `${provider.title} at First Medical Associates`
    : "First Medical Associates provider";
  const languagesText = formatProviderList(provider.languages) || "Language support information coming soon";
  const bioParagraphs = splitBioParagraphs(provider.bio);
  const updatedLabel = formatUpdatedDate(provider.updatedAt);
  const snapshotItems = [
    provider.title ? `${provider.name} serves patients as a ${provider.title}.` : "",
    locationTitles.length > 0
      ? `Practices at ${locationTitles.length === 1 ? locationTitles[0] : `${locationTitles.length} First Medical Associates locations`}.`
      : "Location assignments are being finalized for this provider.",
    provider.languages.length > 0
      ? `Languages offered include ${languagesText}.`
      : "Language support details can be confirmed with the clinic team.",
    bookingSource
      ? "Appointment requests can be started online from this page."
      : primaryLocation?.href
        ? "Appointment details are available through the assigned clinic page."
        : "Contact First Medical Associates for current scheduling details.",
  ].filter(Boolean);

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
    <>
      <SiteHeader />
      <main className={styles.page}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className={styles.shell}>
          <Link className={styles.backLink} href="/providers">
            <span className={styles.backIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m14.5 6.5-5 5 5 5M8.75 11.5h9.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </span>
            Back to all providers
          </Link>

          <section className={styles.profileCard}>
            <div className={styles.hero}>
              <div className={styles.heroPortrait}>
                <div className={styles.imageFrame}>
                  <img
                    className={styles.image}
                    src={provider.imageUrl}
                    alt={provider.imageAlt || provider.name}
                  />
                </div>
              </div>

              <div className={styles.heroCopy}>
                <span className={styles.heroBadge}>
                  <span className={styles.heroBadgeIcon}>{renderInlineIcon("stack")}</span>
                  <span>{heroBadgeLabel}</span>
                </span>

                <div className={styles.heroHeading}>
                  <h1>{provider.name}</h1>
                  <p>{subtitle}</p>
                </div>

                <div className={styles.heroMeta}>
                  {locationTitles.length > 0 ? (
                    <span>
                      <span className={styles.heroMetaIcon}>{renderInlineIcon("map")}</span>
                      <span>{formatProviderList(locationTitles)}</span>
                    </span>
                  ) : null}

                  {provider.languages.length > 0 ? (
                    <span>
                      <span className={styles.heroMetaIcon}>{renderInlineIcon("globe")}</span>
                      <span>{languagesText}</span>
                    </span>
                  ) : null}
                </div>

                <div className={styles.heroActions}>
                  <ActionLink
                    className={`${styles.actionButton} ${styles.actionPrimary}`}
                    external={bookingExternal}
                    href={bookingHref}
                    icon={renderInlineIcon("calendar")}
                  >
                    Book Appointment
                  </ActionLink>

                  <ActionLink
                    className={`${styles.actionButton} ${styles.actionSecondary}`}
                    href={locationsHref}
                    icon={renderInlineIcon("map")}
                  >
                    {locationsLabel}
                  </ActionLink>
                </div>
              </div>
            </div>

            <div className={styles.contentGrid}>
              <section className={styles.contentSection}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionHeadingIcon}>{renderInlineIcon("user")}</span>
                  <span>Professional Summary</span>
                </div>

                <div className={styles.summaryCopy}>
                  {bioParagraphs.map((paragraph, index) => (
                    <p key={`${provider.name}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </section>

              <section className={`${styles.contentSection} ${styles.contentSectionMuted}`}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionHeadingIcon}>{renderInlineIcon("pulse")}</span>
                  <span>Provider Snapshot</span>
                </div>

                <ul className={styles.snapshotList}>
                  {snapshotItems.map((item) => (
                    <li key={item} className={styles.snapshotItem}>
                      <span className={styles.snapshotIcon}>{renderInlineIcon("check")}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.contentSection} id="provider-locations">
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionHeadingIcon}>{renderInlineIcon("stack")}</span>
                  <span>Locations & Quick Info</span>
                </div>

                <div className={styles.locationStack}>
                  {locationLinks.length > 0 ? (
                    locationLinks.map((location) =>
                      location.href ? (
                        <Link
                          key={`${location.label}-${location.href}`}
                          className={styles.locationCard}
                          href={location.href}
                        >
                          <div>
                            <span className={styles.locationCardLabel}>Location</span>
                            <strong className={styles.locationCardTitle}>{location.label}</strong>
                            <span className={styles.locationCardAddress}>
                              {location.address || "Visit the location page for clinic details."}
                            </span>
                          </div>
                          <span className={styles.locationCardAction}>View page</span>
                        </Link>
                      ) : (
                        <div key={location.label} className={styles.locationCard}>
                          <div>
                            <span className={styles.locationCardLabel}>Location</span>
                            <strong className={styles.locationCardTitle}>{location.label}</strong>
                            <span className={styles.locationCardAddress}>
                              {location.address || "Location details are being updated."}
                            </span>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className={styles.emptyState}>
                      Clinic assignments for this provider will appear here once they are added.
                    </div>
                  )}
                </div>

                <div className={styles.quickInfoStack}>
                  <QuickInfoCard
                    href={primaryLocation?.href || undefined}
                    icon={renderInlineIcon("map")}
                    label="Primary Location"
                    value={primaryLocation?.label || "Location coming soon"}
                  />
                  <QuickInfoCard
                    icon={renderInlineIcon("globe")}
                    label="Languages"
                    value={languagesText}
                  />
                  <QuickInfoCard
                    icon={renderInlineIcon("clock")}
                    label="Profile Updated"
                    value={updatedLabel}
                  />
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
