"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./providers-directory.module.css";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export default function ProvidersDirectory({ providers }) {
  const [activeLocation, setActiveLocation] = useState("all");
  const [activeLanguage, setActiveLanguage] = useState("all");

  const locationOptions = useMemo(() => {
    return [...new Set(providers.flatMap((provider) => provider.locations || []).filter(Boolean))].sort();
  }, [providers]);

  const languageOptions = useMemo(() => {
    return [...new Set(providers.flatMap((provider) => provider.languages || []).filter(Boolean))].sort();
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const matchesLocation =
        activeLocation === "all" ||
        (provider.locations || []).some((location) => slugify(location) === activeLocation);
      const matchesLanguage =
        activeLanguage === "all" ||
        (provider.languages || []).some((language) => slugify(language) === activeLanguage);

      return matchesLocation && matchesLanguage;
    });
  }, [activeLanguage, activeLocation, providers]);

  return (
    <div className={styles.page}>
      <div id="provider-directory" className={styles.directory}>
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <div className={styles.filterLabel}>Location</div>
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
            <div className={styles.filterLabel}>Language</div>
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
                    <div
                      className={styles.avatar}
                      style={provider.image ? { backgroundImage: `url('${provider.image}')` } : undefined}
                    />
                  </div>
                  <span className={styles.provName}>{provider.name || ""}</span>
                  <span className={styles.provRole}>{provider.role || ""}</span>
                  <span className={styles.provLoc}>{provider.location || ""}</span>
                  <span className={styles.provMore}>Learn More</span>
                </Link>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
