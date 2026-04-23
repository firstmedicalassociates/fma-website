"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import styles from "./providers-directory.module.css";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function getInitials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "MD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProvidersDirectory({ providers }) {
  const [activeLocation, setActiveLocation] = useState("all");
  const [activeLanguage, setActiveLanguage] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const locationOptions = useMemo(() => {
    return [...new Set(providers.flatMap((provider) => provider.locations || []).filter(Boolean))].sort();
  }, [providers]);

  const languageOptions = useMemo(() => {
    return [...new Set(providers.flatMap((provider) => provider.languages || []).filter(Boolean))].sort();
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const normalizedSearch = String(deferredSearchTerm || "").trim().toLowerCase();

    return providers.filter((provider) => {
      const matchesLocation =
        activeLocation === "all" ||
        (provider.locations || []).some((location) => slugify(location) === activeLocation);
      const matchesLanguage =
        activeLanguage === "all" ||
        (provider.languages || []).some((language) => slugify(language) === activeLanguage);
      const matchesSearch =
        !normalizedSearch ||
        String(provider.name || "").toLowerCase().includes(normalizedSearch) ||
        String(provider.role || "").toLowerCase().includes(normalizedSearch) ||
        String(provider.location || "").toLowerCase().includes(normalizedSearch) ||
        String(provider.language || "").toLowerCase().includes(normalizedSearch);

      return matchesLocation && matchesLanguage && matchesSearch;
    });
  }, [activeLanguage, activeLocation, deferredSearchTerm, providers]);

  return (
    <div className={styles.page}>
      <div id="provider-directory" className={styles.directory}>
        <section className={styles.hero}>
          <div className={styles.heroHeader}>
            <div>
              <p className={styles.kicker}>Clinical Team</p>
              <h1>
                Provider Finder
                <br />
                Dashboard.
              </h1>
            </div>
            <p className={styles.heroCopy}>
              Find physicians by location, language, or specialty and quickly jump to each profile.
            </p>
          </div>
          <div className={styles.heroLines} aria-hidden="true">
            <span />
            <span />
          </div>
          <div className={styles.metricRow}>
            <div className={styles.metricCard}>
              <strong>{providers.length}</strong>
              <span>Active Providers</span>
            </div>
            <div className={styles.metricCard}>
              <strong>{locationOptions.length}</strong>
              <span>Locations</span>
            </div>
            <div className={styles.metricCard}>
              <strong>{languageOptions.length}</strong>
              <span>Languages</span>
            </div>
          </div>
        </section>

        <section className={styles.filterDock}>
          <div className={styles.filterDockInner}>
            <div className={styles.searchField}>
              <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search providers (e.g., Melinda Jorge, Family Medicine)"
                aria-label="Search providers"
              />
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Filter By Location:</div>
              <div className={styles.tabs} role="tablist" aria-label="Location Filters">
                <button
                  className={styles.tab}
                  type="button"
                  aria-pressed={activeLocation === "all"}
                  onClick={() => setActiveLocation("all")}
                >
                  All Locations
                </button>
                {locationOptions.map((location) => {
                  const key = slugify(location);
                  return (
                    <button
                      key={location}
                      className={styles.tab}
                      type="button"
                      aria-pressed={activeLocation === key}
                      onClick={() => setActiveLocation(key)}
                    >
                      {location}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Filter By Language:</div>
              <div className={styles.tabs} role="tablist" aria-label="Language Filters">
                <button
                  className={styles.tab}
                  type="button"
                  aria-pressed={activeLanguage === "all"}
                  onClick={() => setActiveLanguage("all")}
                >
                  All Languages
                </button>
                {languageOptions.map((language) => {
                  const key = slugify(language);
                  return (
                    <button
                      key={language}
                      className={styles.tab}
                      type="button"
                      aria-pressed={activeLanguage === key}
                      onClick={() => setActiveLanguage(key)}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <main className={styles.wrap}>
          {filteredProviders.length === 0 ? (
            <div className={styles.emptyState}>No providers match the selected filters.</div>
          ) : (
            <section className={styles.grid} aria-label="Providers">
              {filteredProviders.map((provider) => (
                <Link
                  key={provider.id}
                  href={provider.link}
                  className={styles.card}
                  aria-label={`${provider.name || ""}, ${provider.role || ""} in ${provider.location || ""}`}
                >
                  <div className={styles.avatarWrap}>
                    {provider.image ? (
                      <div
                        className={styles.avatar}
                        style={{ backgroundImage: `url('${provider.image}')` }}
                      />
                    ) : (
                      <div className={styles.avatarFallback}>{getInitials(provider.name)}</div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardCategory}>{provider.role || "Provider"}</span>
                    </div>
                    <span className={styles.provName}>{provider.name || ""}</span>
                    <span className={styles.provLoc}>{provider.location || ""}</span>
                    <div className={styles.metaRow}>
                      {(provider.languages || []).slice(0, 2).map((language) => (
                        <span key={`${provider.id}-${language}`} className={styles.metaChip}>
                          {language}
                        </span>
                      ))}
                    </div>
                    <span className={styles.provMore}>
                      View Profile
                      <span className={`material-symbols-outlined ${styles.provMoreIcon}`}>
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </main>

        <section className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaPattern} aria-hidden="true" />
            <div className={styles.ctaContent}>
              <h2>Need help choosing the right provider?</h2>
              <p>
                Compare specialties and available locations, then schedule your visit in just a
                few clicks.
              </p>
              <div className={styles.ctaActions}>
                <Link href="/services">Browse Services</Link>
                <Link href="/location">Find a Location</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
