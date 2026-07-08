"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AI_SEARCH_REQUEST_EVENT } from "../lib/ai-search-events";
import styles from "../page.module.css";

const HERO_APPOINTMENT_RESULT_LIMIT = 48;
const HERO_PROVIDER_CHECK_LIMIT = 80;
const UPCOMING_DATE_OPTION_COUNT = 21;
const CITY_DROPDOWN_ID = "home-hero-city-options";
const DATE_DROPDOWN_ID = "home-hero-date-options";
const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const dateMetaFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

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

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function parseInputDate(value = "") {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dateToInputValue(date) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function formatDateButtonLabel(value) {
  const date = parseInputDate(value);
  return date ? dateLabelFormatter.format(date) : "";
}

function buildUpcomingDateOptions(todayValue) {
  const baseDate = parseInputDate(todayValue) || new Date();

  return Array.from({ length: UPCOMING_DATE_OPTION_COUNT }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + index);

    return {
      value: dateToInputValue(date),
      label:
        index === 0
          ? "Today"
          : index === 1
            ? "Tomorrow"
            : dateLabelFormatter.format(date),
      meta: dateMetaFormatter.format(date),
    };
  });
}

function buildAppointmentQuery(city, date) {
  const cityPhrase = city ? ` in ${city}` : "";
  const datePhrase = date ? ` on ${date}` : "";
  return `show available appointments${cityPhrase}${datePhrase}`;
}

export default function HomeHeroAiSearch({ locations = [] }) {
  const [selectedCity, setSelectedCity] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const schedulerRef = useRef(null);
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

  const trimmedCityQuery = normalizeText(selectedCity);
  const trimmedDateQuery = normalizeText(dateQuery);

  const cityOptions = useMemo(() => {
    return uniqueSorted(normalizedLocations.map((location) => location.city));
  }, [normalizedLocations]);

  const upcomingDateOptions = useMemo(
    () => buildUpcomingDateOptions(todayInputValue),
    [todayInputValue],
  );

  useEffect(() => {
    function handleDocumentMouseDown(event) {
      if (schedulerRef.current?.contains(event.target)) return;
      setOpenDropdown(null);
    }

    function handleDocumentKeyDown(event) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    setOpenDropdown(null);

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

  const hasCityOptions = cityOptions.length > 0;
  const dateButtonLabel = formatDateButtonLabel(dateQuery);

  return (
    <form className={styles.schedulerBar} onSubmit={submitSearch} ref={schedulerRef}>
      <div className={styles.schedulerFilterGrid}>
        <div
          className={`${styles.schedulerFilterField} ${
            openDropdown === "city" ? styles.schedulerFilterFieldOpen : ""
          }`}
        >
          <span className={styles.schedulerFilterLabel}>City</span>
          <button
            type="button"
            className={`${styles.schedulerFilterInput} ${styles.schedulerDropdownTrigger}`}
            aria-label="Select appointment city"
            aria-controls={CITY_DROPDOWN_ID}
            aria-expanded={openDropdown === "city"}
            aria-haspopup="listbox"
            disabled={!hasCityOptions}
            onClick={() =>
              setOpenDropdown((current) => (current === "city" ? null : "city"))
            }
          >
            <span className={selectedCity ? "" : styles.schedulerDropdownPlaceholder}>
              {selectedCity || (hasCityOptions ? "Select a city" : "No cities available")}
            </span>
            <ChevronDown aria-hidden="true" className={styles.schedulerDropdownIcon} />
          </button>
          {openDropdown === "city" && hasCityOptions ? (
            <ul
              className={styles.schedulerSuggestions}
              id={CITY_DROPDOWN_ID}
              role="listbox"
              aria-label="City options"
            >
              {cityOptions.map((city) => (
                <li key={city} className={styles.schedulerSuggestionItem}>
                  <button
                    type="button"
                    className={`${styles.schedulerSuggestionButton} ${
                      selectedCity === city ? styles.schedulerSuggestionButtonActive : ""
                    }`}
                    role="option"
                    aria-selected={selectedCity === city}
                    onClick={() => {
                      setSelectedCity(city);
                      setOpenDropdown(null);
                    }}
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div
          className={`${styles.schedulerFilterField} ${
            openDropdown === "date" ? styles.schedulerFilterFieldOpen : ""
          }`}
        >
          <span className={styles.schedulerFilterLabel}>Date</span>
          <button
            type="button"
            className={`${styles.schedulerFilterInput} ${styles.schedulerDropdownTrigger}`}
            aria-label="Select appointment date"
            aria-controls={DATE_DROPDOWN_ID}
            aria-expanded={openDropdown === "date"}
            aria-haspopup="dialog"
            onClick={() =>
              setOpenDropdown((current) => (current === "date" ? null : "date"))
            }
          >
            <span className={dateButtonLabel ? "" : styles.schedulerDropdownPlaceholder}>
              {dateButtonLabel || "Select a date"}
            </span>
            <ChevronDown aria-hidden="true" className={styles.schedulerDropdownIcon} />
          </button>
          {openDropdown === "date" ? (
            <div
              className={`${styles.schedulerSuggestions} ${styles.schedulerDateMenu}`}
              id={DATE_DROPDOWN_ID}
              role="dialog"
              aria-label="Date options"
            >
              <div className={styles.schedulerDateMenuHeader}>
                <input
                  className={`${styles.schedulerFilterInput} ${styles.schedulerDateMenuInput}`}
                  value={dateQuery}
                  onChange={(event) => setDateQuery(event.target.value)}
                  aria-label="Choose appointment date"
                  min={todayInputValue}
                  type="date"
                  autoComplete="off"
                />
                {dateQuery ? (
                  <button
                    type="button"
                    className={styles.schedulerDateClear}
                    onClick={() => setDateQuery("")}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <ul className={styles.schedulerDateOptionList}>
                {upcomingDateOptions.map((dateOption) => (
                  <li key={dateOption.value} className={styles.schedulerSuggestionItem}>
                    <button
                      type="button"
                      className={`${styles.schedulerSuggestionButton} ${
                        dateQuery === dateOption.value
                          ? styles.schedulerSuggestionButtonActive
                          : ""
                      }`}
                      onClick={() => {
                        setDateQuery(dateOption.value);
                        setOpenDropdown(null);
                      }}
                    >
                      <span>{dateOption.label}</span>
                      <small className={styles.schedulerDateOptionMeta}>{dateOption.meta}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <button className={styles.schedulerArrow} type="submit" aria-label="Search available appointments">
        <ArrowIcon />
      </button>
    </form>
  );
}
