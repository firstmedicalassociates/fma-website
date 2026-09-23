import { formatLocationAddress } from "../lib/locations";
import Image from "next/image";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import HeroEyebrow from "../components/hero-eyebrow";
import { formatOfficeHoursForDisplay } from "../lib/locations";
import styles from "./location-page.module.css";

export default function ComingSoonLocation({ location }) {
  const hours = formatOfficeHoursForDisplay(location.officeHours);
  const phone =
    location.phone || location.callTextPhone || location.directPhone;
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <section className={styles.tabShell}>
          <div className={styles.locationPanel}>
            <div className={styles.locationHero}>
              <div className={styles.locationHeroCopy}>
                <HeroEyebrow>Coming soon</HeroEyebrow>
                <h1 className={styles.locationHeroTitle}>{location.title}</h1>
                <p className={styles.locationHeroAccent}>
                  {location.openingDateLabel
                    ? `Estimated opening: ${location.openingDateLabel}`
                    : "Opening date to be announced"}
                </p>
                <p className={styles.locationHeroLead}>{location.intro}</p>
                {phone ? (
                  <div className={styles.locationHeroActions}>
                    <a
                      className={styles.locationHeroPrimaryButton}
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    >
                      Call {phone} for updates
                    </a>
                  </div>
                ) : null}
              </div>
              {location.mapImageUrl ? (
                <div className={styles.locationHeroMedia}>
                  <div className={styles.locationHeroMediaCard}>
                    <Image
                      src={location.mapImageUrl}
                      alt={
                        location.mapImageAlt ||
                        `${location.title} building exterior`
                      }
                      width={1350}
                      height={900}
                      className={styles.locationHeroImage}
                      priority
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className={styles.locationInfoGrid}>
              <article className={styles.locationInfoCard}>
                <h2>Office address</h2>
                <div className={styles.locationAddressBlock}>
                  {formatLocationAddress(location)
                    .split("\n")
                    .map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                </div>
                {location.directionsUrl ? (
                  <a
                    className={styles.locationInfoLink}
                    href={location.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View directions
                  </a>
                ) : null}
              </article>
              <article className={styles.locationInfoCard}>
                <h2>Planned hours after opening</h2>
                <div className={styles.locationAddressBlock}>
                  {hours.length ? (
                    hours.map((row) => <p key={row}>{row}</p>)
                  ) : (
                    <p>Hours will be announced.</p>
                  )}
                </div>
              </article>
              {(Array.isArray(location.infoSections)
                ? location.infoSections
                : []
              ).map((section) => (
                <article
                  key={section.key || section.title}
                  className={styles.locationInfoCard}
                >
                  <h2>{section.title}</h2>
                  {(section.paragraphs || []).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
