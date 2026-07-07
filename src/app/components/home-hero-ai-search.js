"use client";

import { useMemo, useState } from "react";
import { AI_SEARCH_REQUEST_EVENT } from "../lib/ai-search-events";
import styles from "../page.module.css";

const HERO_APPOINTMENT_RESULT_LIMIT = 48;
const HERO_PROVIDER_CHECK_LIMIT = 80;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className={styles.schedulerArrowIcon} viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function normalizeText(value) {
  return String(value || "").trim();
}

function uniqueSorted(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function filterSuggestions(values, query, limit = 10) {
  const text = normalizeText(query).toLowerCase();
  if (!text) return values.slice(0, limit);
  return values.filter((value) => value.toLowerCase().includes(text)).slice(0, limit);
}

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function buildAppointmentQuery(city, date) {
  const cityPhrase = city ? ` in ${city}` : "";
  const datePhrase = date ? ` on ${date}` : "";
  return `show available appointments${cityPhrase}${datePhrase}`;
}

export default function HomeHeroAiSearch({ locations = [] }) {
  const [cityQuery, setCityQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [activeField, setActiveField] = useState(null);
  const todayInputValue = useMemo(() => getTodayInputValue(), []);

  const normalizedLocations = useMemo(
    () =>
      locations.map((location) => ({
        slug: normalizeText(location.slug),
        city: normalizeText(location.addressCity),
        state: normalizeText(location.addressState),
      })),
    [locations],
  );

  const trimmedCityQuery = normalizeText(cityQuery);
  const trimmedDateQuery = normalizeText(dateQuery);

  const cityOptions = useMemo(() => {
    return uniqueSorted(normalizedLocations.map((location) => location.city));
  }, [normalizedLocations]);

  const visibleCityOptions = filterSuggestions(cityOptions, cityQuery);

  function submitSearch(event) {
    event.preventDefault();

    if (!trimmedCityQuery && !trimmedDateQuery) {
      window.dispatchEvent(
        new CustomEvent(AI_SEARCH_REQUEST_EVENT, {
          detail: {
            query: "",
            autoRun: false,
          },
        }),
      );
      return;
    }

    const query = buildAppointmentQuery(trimmedCityQuery, trimmedDateQuery);

    window.dispatchEvent(
      new CustomEvent(AI_SEARCH_REQUEST_EVENT, {
        detail: {
          query,
          autoRun: true,
          maxAppointmentResults: HERO_APPOINTMENT_RESULT_LIMIT,
          providerCheckLimit: HERO_PROVIDER_CHECK_LIMIT,
          sessionContext: {
            source: "home_hero",
            city: trimmedCityQuery,
            date: trimmedDateQuery,
          },
        },
      }),
    );
  }

  function selectSuggestion(field, value) {
    if (field === "city") setCityQuery(value);
    setActiveField(null);
  }

  return (
    <form className={styles.schedulerBar} onSubmit={submitSearch}>
      <div className={styles.schedulerFilterGrid}>
        <label
          className={styles.schedulerFilterField}
          onFocus={() => setActiveField("city")}
          onBlur={() => setActiveField((value) => (value === "city" ? null : value))}
        >
          <span className={styles.schedulerFilterLabel}>City</span>
          <input
            className={styles.schedulerFilterInput}
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            aria-label="Search by city"
            placeholder="Search by city"
            autoComplete="off"
          />
          {activeField === "city" && visibleCityOptions.length > 0 ? (
            <ul className={styles.schedulerSuggestions} role="listbox" aria-label="City suggestions">
              {visibleCityOptions.map((city) => (
                <li key={city} className={styles.schedulerSuggestionItem}>
                  <button
                    type="button"
                    className={styles.schedulerSuggestionButton}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion("city", city)}
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>

        <label
          className={styles.schedulerFilterField}
          onFocus={() => setActiveField(null)}
        >
          <span className={styles.schedulerFilterLabel}>Date</span>
          <input
            className={`${styles.schedulerFilterInput} ${styles.schedulerDateInput}`}
            value={dateQuery}
            onChange={(event) => setDateQuery(event.target.value)}
            aria-label="Select appointment date"
            min={todayInputValue}
            type="date"
            autoComplete="off"
          />
        </label>
      </div>

      <button className={styles.schedulerArrow} type="submit" aria-label="Search available appointments">
        <ArrowIcon />
      </button>
    </form>
  );
}
