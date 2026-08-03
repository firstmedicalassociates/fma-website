"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import HeroEyebrow from "../components/hero-eyebrow";
import { splitProviderCredentialTags } from "../lib/providers";
import styles from "./providers-directory.module.css";

const PROVIDER_TYPE_OPTIONS = [
  {
    value: "physician",
    label: "Physician",
    credentials: ["MD", "DO"],
  },
  {
    value: "physician-assistant",
    label: "Physician Assistant",
    credentials: ["PA-C"],
  },
  {
    value: "nurse-practitioner",
    label: "Nurse Practitioner",
    credentials: ["AGPCNP", "FNP", "FNP-BC", "FNP-C"],
  },
];

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

function getCityFromLocation(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.split(",")[0].trim();
}

function getActiveLabel(activeValue, options, allLabel) {
  if (activeValue === "all") return allLabel;
  const match = options.find((option) => slugify(option) === activeValue);
  return match || allLabel;
}

function getActiveProviderTypeLabel(activeValue) {
  if (activeValue === "all") return "All Provider Types";
  const match = PROVIDER_TYPE_OPTIONS.find((option) => option.value === activeValue);
  return match?.label || "All Provider Types";
}

export default function ProvidersDirectory({ providers }) {
  const [activeCity, setActiveCity] = useState("all");
  const [activeLanguage, setActiveLanguage] = useState("all");

  const [activeSpecialty, setActiveSpecialty] = useState("all");
  const [openFilter, setOpenFilter] = useState(null);
  const filterBarRef = useRef(null);

  const cityOptions = useMemo(() => {
    return [
      ...new Set(
        providers
          .flatMap((provider) => provider.locations || [])
          .map((location) => getCityFromLocation(location))
          .filter(Boolean)
      ),
    ].sort();
  }, [providers]);

  const languageOptions = useMemo(() => {
    return [...new Set(providers.flatMap((provider) => provider.languages || []).filter(Boolean))].sort();
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const selectedProviderType = PROVIDER_TYPE_OPTIONS.find(
      (option) => option.value === activeSpecialty
    );

    return providers.filter((provider) => {
      const matchesCity =
        activeCity === "all" ||
        (provider.locations || []).some((location) => slugify(getCityFromLocation(location)) === activeCity);
      const matchesLanguage =
        activeLanguage === "all" ||
        (provider.languages || []).some((language) => slugify(language) === activeLanguage);
      const matchesSpecialty =
        activeSpecialty === "all" ||
        Boolean(
          selectedProviderType &&
            (provider.credentialTags || splitProviderCredentialTags(provider.role)).some(
              (credential) => selectedProviderType.credentials.includes(credential)
            )
        );

      return matchesCity && matchesLanguage && matchesSpecialty;
    });
  }, [activeCity, activeLanguage, activeSpecialty, providers]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterBarRef.current && !filterBarRef.current.contains(event.target)) {
        setOpenFilter(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenFilter(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={styles.page}>
      <div id="provider-directory" className={styles.directory}>
        <section className={styles.hero}>
          <div className={styles.heroHeader}>
            <div>
              <HeroEyebrow>Clinical Team</HeroEyebrow>
              <h1>
                Find a Provider
              </h1>
            </div>
            <p className={styles.heroCopy}>
              Find providers by location, language, or specialty and quickly jump to each profile.
            </p>
          </div>
          <div className={styles.heroLines} aria-hidden="true">
            <span />
            <span />
          </div>
        </section>

        <section className={styles.filterDock}>
          <div className={styles.filterDockInner}>
            <div
              className={styles.providerFilterBar}
              role="group"
              aria-label="Provider filters"
              ref={filterBarRef}
            >
              <div
                className={`${styles.providerFilterField} ${
                  openFilter === "city" ? styles.providerFilterFieldOpen : ""
                }`}
              >
                <span className={styles.providerFilterLabel}>City</span>
                <button
                  type="button"
                  className={styles.providerDropdownTrigger}
                  onClick={() => setOpenFilter((current) => (current === "city" ? null : "city"))}
                  aria-expanded={openFilter === "city"}
                  aria-haspopup="listbox"
                  aria-label="Filter providers by city"
                >
                  {getActiveLabel(activeCity, cityOptions, "All Cities")}
                </button>
                {openFilter === "city" ? (
                  <ul className={styles.providerDropdownMenu} role="listbox" aria-label="City options">
                    <li>
                      <button
                        type="button"
                        className={`${styles.providerDropdownOption} ${
                          activeCity === "all" ? styles.providerDropdownOptionActive : ""
                        }`}
                        onClick={() => {
                          setActiveCity("all");
                          setOpenFilter(null);
                        }}
                      >
                        All Cities
                      </button>
                    </li>
                    {cityOptions.map((city) => {
                      const value = slugify(city);
                      return (
                        <li key={city}>
                          <button
                            type="button"
                            className={`${styles.providerDropdownOption} ${
                              activeCity === value ? styles.providerDropdownOptionActive : ""
                            }`}
                            onClick={() => {
                              setActiveCity(value);
                              setOpenFilter(null);
                            }}
                          >
                            {city}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              <div
                className={`${styles.providerFilterField} ${
                  openFilter === "language" ? styles.providerFilterFieldOpen : ""
                }`}
              >
                <span className={styles.providerFilterLabel}>Language</span>
                <button
                  type="button"
                  className={styles.providerDropdownTrigger}
                  onClick={() => setOpenFilter((current) => (current === "language" ? null : "language"))}
                  aria-expanded={openFilter === "language"}
                  aria-haspopup="listbox"
                  aria-label="Filter providers by language"
                >
                  {getActiveLabel(activeLanguage, languageOptions, "All Languages")}
                </button>
                {openFilter === "language" ? (
                  <ul className={styles.providerDropdownMenu} role="listbox" aria-label="Language options">
                    <li>
                      <button
                        type="button"
                        className={`${styles.providerDropdownOption} ${
                          activeLanguage === "all" ? styles.providerDropdownOptionActive : ""
                        }`}
                        onClick={() => {
                          setActiveLanguage("all");
                          setOpenFilter(null);
                        }}
                      >
                        All Languages
                      </button>
                    </li>
                    {languageOptions.map((language) => {
                      const value = slugify(language);
                      return (
                        <li key={language}>
                          <button
                            type="button"
                            className={`${styles.providerDropdownOption} ${
                              activeLanguage === value ? styles.providerDropdownOptionActive : ""
                            }`}
                            onClick={() => {
                              setActiveLanguage(value);
                              setOpenFilter(null);
                            }}
                          >
                            {language}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              <div
                className={`${styles.providerFilterField} ${
                  openFilter === "specialty" ? styles.providerFilterFieldOpen : ""
                }`}
              >
                <span className={styles.providerFilterLabel}>Provider Type</span>
                <button
                  type="button"
                  className={styles.providerDropdownTrigger}
                  onClick={() => setOpenFilter((current) => (current === "specialty" ? null : "specialty"))}
                  aria-expanded={openFilter === "specialty"}
                  aria-haspopup="listbox"
                  aria-label="Filter providers by type"
                >
                  {getActiveProviderTypeLabel(activeSpecialty)}
                </button>
                {openFilter === "specialty" ? (
                  <ul className={styles.providerDropdownMenu} role="listbox" aria-label="Provider type options">
                    <li>
                      <button
                        type="button"
                        className={`${styles.providerDropdownOption} ${
                          activeSpecialty === "all" ? styles.providerDropdownOptionActive : ""
                        }`}
                        onClick={() => {
                          setActiveSpecialty("all");
                          setOpenFilter(null);
                        }}
                      >
                        All Provider Types
                      </button>
                    </li>
                    {PROVIDER_TYPE_OPTIONS.map((providerType) => {
                      return (
                        <li key={providerType.value}>
                          <button
                            type="button"
                            className={`${styles.providerDropdownOption} ${
                              activeSpecialty === providerType.value
                                ? styles.providerDropdownOptionActive
                                : ""
                            }`}
                            onClick={() => {
                              setActiveSpecialty(providerType.value);
                              setOpenFilter(null);
                            }}
                          >
                            {providerType.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
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
                    <span className={styles.provName}>{provider.name || ""}</span>
                    <span className={styles.provRole}>{provider.role || "Provider"}</span>
                    <span className={styles.provLoc}>{provider.location || ""}</span>
                    <span className={styles.provMore}>Learn More</span>
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
                <Link href="/services" className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}>Browse Services</Link>
                <Link href="/locations" className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>Find a Location</Link>
                <Link href="/patient-resources" className={`${styles.ctaButton} ${styles.ctaButtonTertiary}`}>Patient Resources</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
