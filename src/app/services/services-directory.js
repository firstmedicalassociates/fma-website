"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalizeServiceIcon } from "../lib/services";
import styles from "./services-directory.module.css";

function normalizeCategory(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
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

    return services.filter((service) => {
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
    });
  }, [activeCategory, query, services]);

  return (
    <main className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroSplit}>
          <div className={styles.heroLeft}>
            <span className={styles.kicker}>Interactive Portal</span>
            <h1>
              Service Finder
              <br />
              Dashboard.
            </h1>
          </div>
          <div className={styles.heroRight}>
            <p>
              Seamlessly navigate our clinical offerings. Use the dashboard below to search,
              filter, and discover the exact care you need.
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
            <button
              type="button"
              className={`${styles.filterPill} ${activeCategory === "all" ? styles.filterPillActive : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              All Services
            </button>
            {categories.map((category) => {
              const key = normalizeCategory(category);
              const isActive = key === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ""}`}
                  onClick={() => setActiveCategory(key)}
                >
                  {category}
                </button>
              );
            })}
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
              return (
                <article
                  key={service.id}
                  className={`${styles.card} ${telehealth ? styles.cardTelehealth : ""}`}
                >
                  <div>
                    <div className={styles.cardHeader}>
                      <span className={`material-symbols-outlined ${styles.cardIcon}`}>
                        {normalizeServiceIcon(service.icon)}
                      </span>
                      <span className={styles.cardCategory}>{service.category}</span>
                    </div>
                    <h2>{service.title}</h2>
                    <p>{service.description}</p>
                  </div>
                  <div className={styles.cardCta}>
                    {telehealth ? "Launch Visit" : "Learn More"}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
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
              Our medical team is available for urgent consultations and chronic disease
              management.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/providers">Find a Clinician</Link>
              <Link href="/location">Emergency Portal</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
