"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PUBLIC_SEARCH_MAX_CHARACTERS,
  getNoPhiError,
  hasPotentialPhi,
  normalizePublicSearchQuery,
} from "../lib/no-phi-guard";
import styles from "./search-page.module.css";

const SEARCH_MIN_CHARACTERS = 2;
const HERO_APPOINTMENT_SEARCH_STORAGE_KEY = "fma:hero-appointment-search";
const HERO_APPOINTMENT_RESULT_LIMIT = 12;

function groupResultsByKind(results = []) {
  return results.reduce((groups, result) => {
    const existingGroup = groups.find((group) => group.kind === result.kind);

    if (existingGroup) {
      existingGroup.items.push(result);
      return groups;
    }

    groups.push({
      kind: result.kind,
      label: result.categoryLabel,
      items: [result],
    });
    return groups;
  }, []);
}

function normalizeAiPayload(value = {}) {
  const appointmentOptions = Array.isArray(value?.appointmentOptions)
    ? value.appointmentOptions.slice(0, HERO_APPOINTMENT_RESULT_LIMIT)
    : [];

  return {
    ok: value?.ok === true,
    answer: String(value?.answer || ""),
    error: String(value?.error || ""),
    sources: Array.isArray(value?.sources) ? value.sources.slice(0, 3) : [],
    confidence: Number(value?.confidence || 0),
    appointmentOptions,
    appointmentMeta:
      value?.appointmentMeta && typeof value.appointmentMeta === "object"
        ? value.appointmentMeta
        : null,
    recoveryActions: Array.isArray(value?.recoveryActions) ? value.recoveryActions.slice(0, 4) : [],
  };
}

function getAppointmentStatusText(appointmentMeta, hasAppointmentOptions) {
  if (hasAppointmentOptions) {
    return "Showing the earliest online time found for each provider. Use Book appointment to view the full live schedule.";
  }
  if (!appointmentMeta) return "";
  if (appointmentMeta.availabilityStatus === "no_open_slots") {
    return "No online appointment times found for that search.";
  }
  if (appointmentMeta.availabilityStatus === "unavailable") {
    return "Appointment availability is temporarily unavailable.";
  }
  return "";
}

function getAppointmentTimeLabel(option = {}) {
  if (option.slotMatchType === "exact") return "Exact match";
  if (option.slotMatchType === "fallback") return "Closest available";
  return "Earliest shown";
}

function isExternalHref(href = "") {
  return /^https?:\/\//i.test(String(href || ""));
}

function parseStoredHeroSearch() {
  try {
    const raw = window.sessionStorage.getItem(HERO_APPOINTMENT_SEARCH_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(HERO_APPOINTMENT_SEARCH_STORAGE_KEY);
    const payload = JSON.parse(raw);
    const query = String(payload?.query || "").trim();
    if (!query) return null;

    return {
      query,
      city: String(payload?.city || "").trim(),
      date: String(payload?.date || "").trim(),
      source: String(payload?.source || "home_hero").trim(),
    };
  } catch {
    return null;
  }
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [results, setResults] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const groups = useMemo(() => groupResultsByKind(results), [results]);
  const hasQuery = submittedQuery.length >= SEARCH_MIN_CHARACTERS;

  const executeSearch = useCallback(async (rawQuery, options = {}) => {
    const nextQuery = normalizePublicSearchQuery(rawQuery);
    setQuery(nextQuery);

    setSubmittedQuery("");
    setResults([]);
    setAiResult(null);
    setError("");

    if (nextQuery.length < SEARCH_MIN_CHARACTERS) {
      setStatus("idle");
      setError(`Start with at least ${SEARCH_MIN_CHARACTERS} characters.`);
      return;
    }

    if (hasPotentialPhi(nextQuery)) {
      setStatus("blocked");
      setError(getNoPhiError("website search"));
      return;
    }

    if (nextQuery.length > PUBLIC_SEARCH_MAX_CHARACTERS) {
      setStatus("blocked");
      setError("Query is too long. Please keep your question under 300 characters.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: nextQuery,
          sessionContext: options.sessionContext || null,
          maxAppointmentResults: options.maxAppointmentResults || undefined,
          providerCheckLimit: options.providerCheckLimit || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      const nextResults = Array.isArray(data?.results) ? data.results : [];
      const nextAiResult = normalizeAiPayload(data?.ai);

      setSubmittedQuery(data?.query || nextQuery);
      setResults(nextResults);
      setAiResult(nextAiResult.ok || nextAiResult.answer ? nextAiResult : null);
      setStatus(response.ok && data?.ok ? "results" : "error");
      setError(response.ok && data?.ok ? "" : data?.error || "Search is temporarily unavailable.");
    } catch {
      setStatus("error");
      setError("Search is temporarily unavailable.");
    }
  }, []);

  useEffect(() => {
    const storedHeroSearch = parseStoredHeroSearch();
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (!storedHeroSearch) return undefined;

    const timeoutId = window.setTimeout(() => {
      executeSearch(storedHeroSearch.query, {
        sessionContext: {
          source: storedHeroSearch.source,
          city: storedHeroSearch.city,
          date: storedHeroSearch.date,
        },
        maxAppointmentResults: HERO_APPOINTMENT_RESULT_LIMIT,
        providerCheckLimit: 32,
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [executeSearch]);

  function runSearch(event) {
    event.preventDefault();
    executeSearch(query);
  }

  const appointmentOptions = aiResult?.appointmentOptions || [];
  const hasAppointmentOptions = appointmentOptions.length > 0;
  const appointmentStatusText = getAppointmentStatusText(
    aiResult?.appointmentMeta,
    hasAppointmentOptions,
  );

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Search Directory</p>
        <h1>Search the entire website.</h1>
        <p className={styles.lead}>
          Find providers, clinic locations, and published articles from one place.
        </p>

        <form className={styles.searchForm} onSubmit={runSearch}>
          <input
            className={styles.searchInput}
            maxLength={PUBLIC_SEARCH_MAX_CHARACTERS}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by provider, city, ZIP, service, or article topic"
            type="search"
            value={query}
          />
          <button className={styles.searchButton} disabled={status === "loading"} type="submit">
            {status === "loading" ? "Searching..." : "Search"}
          </button>
        </form>
        <p className={styles.privacyHint}>
          Do not include symptoms, diagnoses, medications, test results, dates of birth,
          insurance ID numbers, or other medical details.
        </p>

        {hasQuery ? (
          <div className={styles.summaryRow}>
            <span className={styles.summaryPill}>Search complete</span>
            <span className={styles.summaryText}>
              {hasAppointmentOptions
                ? `${appointmentOptions.length} appointment time${appointmentOptions.length === 1 ? "" : "s"} found`
                : `${results.length} result${results.length === 1 ? "" : "s"} found`}
            </span>
          </div>
        ) : (
          <div className={styles.summaryRow}>
            <span className={styles.summaryPill}>Try a provider, city, ZIP, or article topic</span>
          </div>
        )}
      </section>

      {hasQuery && aiResult?.answer ? (
        <section className={styles.aiCard}>
          <div className={styles.aiCardHeader}>
            <strong>AI answer</strong>
            <span>Confidence {Math.round((aiResult.confidence || 0) * 100)}%</span>
          </div>
          <p className={styles.aiAnswer}>{aiResult.answer}</p>
          {aiResult.sources.length > 0 ? (
            <div className={styles.aiSources}>
              {aiResult.sources.map((source) => (
                <Link key={`${source.type}-${source.url}`} className={styles.aiSource} href={source.url}>
                  <span>{source.type}</span>
                  <strong>{source.title}</strong>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {hasQuery && (hasAppointmentOptions || appointmentStatusText) ? (
        <section className={styles.appointmentSection}>
          <div className={styles.appointmentHeader}>
            <div>
              <span className={styles.resultBadge}>Current availability</span>
              <h2>Available appointment times</h2>
            </div>
            {appointmentStatusText ? <p>{appointmentStatusText}</p> : null}
          </div>

          {hasAppointmentOptions ? (
            <div className={styles.appointmentGrid}>
              {appointmentOptions.map((option, index) => {
                const providerUrl = String(option.providerUrl || "").trim();
                const bookingUrl = String(option.bookingUrl || "").trim();
                return (
                  <article
                    className={styles.appointmentCard}
                    key={`${option.providerName || "provider"}-${option.displayTime || index}`}
                  >
                    <span className={styles.appointmentTimeLabel}>
                      {getAppointmentTimeLabel(option)}
                    </span>
                    <span className={styles.appointmentTime}>
                      {option.displayTime || [option.date, option.startTime].filter(Boolean).join(" ")}
                    </span>
                    <h3>{option.providerName || "FMA provider"}</h3>
                    <p>{[option.providerTitle, option.locationName].filter(Boolean).join(" | ")}</p>
                    <p className={styles.appointmentHint}>
                      More times may be available on the booking page.
                    </p>
                    <div className={styles.appointmentActions}>
                      {providerUrl ? (
                        <Link className={styles.appointmentSecondaryLink} href={providerUrl}>
                          View profile
                        </Link>
                      ) : null}
                      {bookingUrl ? (
                        <a
                          className={styles.appointmentBookLink}
                          href={bookingUrl}
                          rel={isExternalHref(bookingUrl) ? "noreferrer" : undefined}
                          target={isExternalHref(bookingUrl) ? "_blank" : undefined}
                        >
                          Book appointment
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : aiResult?.recoveryActions?.length > 0 ? (
            <div className={styles.recoveryActions}>
              {aiResult.recoveryActions.map((action) =>
                action.href ? (
                  <a
                    className={styles.recoveryAction}
                    href={action.href}
                    key={`${action.label}-${action.href}`}
                    rel={isExternalHref(action.href) ? "noreferrer" : undefined}
                    target={isExternalHref(action.href) ? "_blank" : undefined}
                  >
                    {action.label}
                  </a>
                ) : action.query ? (
                  <button
                    className={styles.recoveryAction}
                    key={`${action.label}-${action.query}`}
                    onClick={() => executeSearch(action.query)}
                    type="button"
                  >
                    {action.label}
                  </button>
                ) : null,
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <section className={styles.emptyCard}>
          <strong>{status === "blocked" ? "Search blocked for privacy." : "Search notice."}</strong>
          <p>{error}</p>
        </section>
      ) : !hasQuery ? (
        <section className={styles.emptyCard}>
          <strong>Start with at least 2 characters.</strong>
          <p>Examples: Melinda, Annapolis, Silver Spring, or preventive care.</p>
        </section>
      ) : results.length === 0 && status !== "loading" ? (
        <section className={styles.emptyCard}>
          <strong>No pages matched your search.</strong>
          <p>Try a broader search term, a city name, or a provider last name.</p>
        </section>
      ) : null}

      {groups.length > 0 ? (
        <div className={styles.groupList}>
          {groups.map((group) => (
            <section key={group.kind} className={styles.groupSection}>
              <div className={styles.groupHeader}>
                <h2>{group.label}</h2>
                <span>{group.items.length} match{group.items.length === 1 ? "" : "es"}</span>
              </div>

              <div className={styles.resultsGrid}>
                {group.items.map((result) => (
                  <Link key={`${result.kind}-${result.href}`} className={styles.resultCard} href={result.href}>
                    <span className={styles.resultBadge}>{result.categoryLabel}</span>
                    <h3>{result.title}</h3>
                    <p>{result.description}</p>
                    <span className={styles.resultAction}>Open page</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}
