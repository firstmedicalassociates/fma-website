"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import HeroEyebrow from "../components/hero-eyebrow";
import { PillToggleButtons } from "../components/pill-toggles";
import { normalizeServiceIcon } from "../lib/services";
import styles from "./services-directory.module.css";

function normalizeCategory(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getCategoryVariant(category = "") {
  const key = normalizeCategory(category);

  if (key.includes("primary care")) return "primary";
  if (key.includes("chronic")) return "chronic";
  if (key.includes("specialized")) return "specialized";
  if (key.includes("general")) return "general";
  if (key.includes("tele")) return "telehealth";

  return "default";
}

function getCardCategoryPillClass(category = "") {
  const variant = getCategoryVariant(category);
  const map = {
    primary: styles.cardCategoryPrimary,
    chronic: styles.cardCategoryChronic,
    specialized: styles.cardCategorySpecialized,
    general: styles.cardCategoryGeneral,
    telehealth: styles.cardCategoryTelehealth,
    default: styles.cardCategoryDefault,
  };

  return map[variant] || styles.cardCategoryDefault;
}

function isTelehealthService(service = {}) {
  const category = String(service.category || "").toLowerCase();
  const title = String(service.title || "").toLowerCase();
  return category.includes("tele") || title.includes("tele");
}

export default function ServicesDirectory({ services = [] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(() => {
    const seen = new Set();
    const values = [];
    for (const service of services) {
      const category = String(service?.category || "").trim();
      if (!category) continue;
      const key = normalizeCategory(category);
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(category);
    }
    return values;
  }, [services]);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return services
      .filter((service) => {
        const category = normalizeCategory(service?.category);
        if (activeCategory !== "all" && category !== activeCategory) return false;
        if (!normalizedQuery) return true;

        const title = String(service?.title || "").toLowerCase();
        const description = String(service?.description || "").toLowerCase();
        const categoryLabel = String(service?.category || "").toLowerCase();

        return (
          title.includes(normalizedQuery) ||
          description.includes(normalizedQuery) ||
          categoryLabel.includes(normalizedQuery)
        );
      })
      .sort((first, second) => {
        const firstTelehealth = isTelehealthService(first);
        const secondTelehealth = isTelehealthService(second);
        if (firstTelehealth === secondTelehealth) return 0;
        return firstTelehealth ? 1 : -1;
      });
  }, [activeCategory, query, services]);

  const filterItems = useMemo(() => {
    return [
      { value: "all", label: "All Services" },
      ...categories.map((category) => ({
        value: normalizeCategory(category),
        label: category,
      })),
    ];
  }, [categories]);

  return (
    <main className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroSplit}>
          <div className={styles.heroLeft}>
            <HeroEyebrow as="span">Primary Care, Specialized Care &amp; Telehealth</HeroEyebrow>
            <h1>
              Healthcare Services
              <br />
              in Maryland.
            </h1>
          </div>
          <div className={styles.heroRight}>
            <p>
              Browse primary care, specialized care, telehealth, and chronic care services. Search,
              filter, and find the right treatment options from First Medical Associates.
            </p>
            <div className={styles.heroLines} aria-hidden="true">
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.toolbarSection}>
        <div className={styles.toolbarInner}>
          <div className={styles.searchWrap}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services (e.g., Diabetes, Telemedicine)..."
              aria-label="Search services"
            />
          </div>

          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Filter By:</span>
            <PillToggleButtons
              items={filterItems}
              activeValue={activeCategory}
              onSelect={setActiveCategory}
              ariaLabel="Service category filters"
            />
          </div>
        </div>
      </section>

      <section className={styles.gridSection}>
        {filteredServices.length === 0 ? (
          <div className={styles.emptyState}>No services match that search/filter selection.</div>
        ) : (
          <div className={styles.grid}>
            {filteredServices.map((service) => {
              const telehealth = isTelehealthService(service);
              const categoryPillClass = getCardCategoryPillClass(service.category);
              return (
                <article
                  key={service.id}
                  className={`${styles.card} ${telehealth ? styles.cardTelehealth : ""}`}
                >
                  <Link href={`/service/${service.slug}`}>
                    <div className={styles.cardHeader}>
                      <span className={`material-symbols-outlined ${styles.cardIcon}`}>
                        {normalizeServiceIcon(service.icon)}
                      </span>
                      <span className={`${styles.cardCategory} ${categoryPillClass}`}>
                        {service.category}
                      </span>
                    </div>
                    <h2>{service.title}</h2>
                    <p>{service.description}</p>
                  </Link>
                  <Link href={`/service/${service.slug}`} className={styles.cardCta}>
                    {telehealth ? "Launch Visit" : "Learn More"}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaPattern} aria-hidden="true" />
          <div className={styles.ctaContent}>
            <h2>Need immediate clinical assistance?</h2>
            <p>
              Our medical team is available for urgent same-day consultations and chronic
              disease management.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/providers">Find a Clinician</Link>
              <Link href="/locations">Find a Location</Link>
              <Link href="/patient-resources">Patient Resources</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
