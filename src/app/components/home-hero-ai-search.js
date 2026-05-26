"use client";

import { useMemo, useState } from "react";
import styles from "../page.module.css";

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

function includesIgnoreCase(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

function filterSuggestions(values, query, limit = 10) {
  const text = normalizeText(query).toLowerCase();
  if (!text) return values.slice(0, limit);
  return values.filter((value) => value.toLowerCase().includes(text)).slice(0, limit);
}

export default function HomeHeroAiSearch({ locations = [], providers = [] }) {
  const [cityQuery, setCityQuery] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [providerQuery, setProviderQuery] = useState("");
  const [activeField, setActiveField] = useState(null);

  const normalizedLocations = useMemo(
    () =>
      locations.map((location) => ({
        slug: normalizeText(location.slug),
        city: normalizeText(location.addressCity),
        state: normalizeText(location.addressState),
      })),
    [locations],
  );

  const normalizedProviders = useMemo(
    () =>
      providers.map((provider) => ({
        slug: normalizeText(provider.slug),
        name: normalizeText(provider.name),
        linkUrl: normalizeText(provider.linkUrl),
        locations: Array.isArray(provider.locations)
          ? provider.locations.map((slug) => normalizeText(slug)).filter(Boolean)
          : [],
      })),
    [providers],
  );

  const trimmedCityQuery = normalizeText(cityQuery);
  const trimmedStateQuery = normalizeText(stateQuery);
  const trimmedProviderQuery = normalizeText(providerQuery);

  const cityOptions = useMemo(() => {
    const scoped = trimmedStateQuery
      ? normalizedLocations.filter((location) => includesIgnoreCase(location.state, trimmedStateQuery))
      : normalizedLocations;
    return uniqueSorted(scoped.map((location) => location.city));
  }, [normalizedLocations, trimmedStateQuery]);

  const stateOptions = useMemo(() => {
    const scoped = trimmedCityQuery
      ? normalizedLocations.filter((location) => includesIgnoreCase(location.city, trimmedCityQuery))
      : normalizedLocations;
    return uniqueSorted(scoped.map((location) => location.state));
  }, [normalizedLocations, trimmedCityQuery]);

  const matchingLocationSlugs = useMemo(() => {
    return new Set(
      normalizedLocations
        .filter((location) => {
          if (trimmedCityQuery && !includesIgnoreCase(location.city, trimmedCityQuery)) return false;
          if (trimmedStateQuery && !includesIgnoreCase(location.state, trimmedStateQuery)) return false;
          return true;
        })
        .map((location) => location.slug),
    );
  }, [normalizedLocations, trimmedCityQuery, trimmedStateQuery]);

  const providerOptions = useMemo(() => {
    const items = normalizedProviders
      .filter((provider) => {
        if (!trimmedCityQuery && !trimmedStateQuery) return true;
        return provider.locations.some((slug) => matchingLocationSlugs.has(slug));
      })
      .map((provider) => ({ slug: provider.slug, name: provider.name, linkUrl: provider.linkUrl }));

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [matchingLocationSlugs, normalizedProviders, trimmedCityQuery, trimmedStateQuery]);

  const visibleCityOptions = filterSuggestions(cityOptions, cityQuery);
  const visibleStateOptions = filterSuggestions(stateOptions, stateQuery);
  const visibleProviderOptions = filterSuggestions(
    providerOptions.map((provider) => provider.name),
    providerQuery,
  );

  function submitSearch(event) {
    event.preventDefault();

    const exactProvider = providerOptions.find(
      (provider) => provider.name.toLowerCase() === trimmedProviderQuery.toLowerCase(),
    );

    if (exactProvider) {
      const bookingHref = normalizeText(exactProvider.linkUrl);
      if (bookingHref) {
        window.location.assign(bookingHref);
        return;
      }

      // If no provider booking link exists yet, keep users on provider search results.
      const fallbackParams = new URLSearchParams();
      fallbackParams.set("provider", exactProvider.name);
      window.location.assign(`/providers?${fallbackParams.toString()}`);
      return;
    }

    const params = new URLSearchParams();
    if (trimmedCityQuery) params.set("city", trimmedCityQuery);
    if (trimmedStateQuery) params.set("state", trimmedStateQuery);
    if (trimmedProviderQuery) params.set("provider", trimmedProviderQuery);

    const query = params.toString();
    window.location.assign(query ? `/providers?${query}` : "/providers");
  }

  function selectSuggestion(field, value) {
    if (field === "city") setCityQuery(value);
    if (field === "state") setStateQuery(value);
    if (field === "provider") setProviderQuery(value);
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
          onFocus={() => setActiveField("state")}
          onBlur={() => setActiveField((value) => (value === "state" ? null : value))}
        >
          <span className={styles.schedulerFilterLabel}>State</span>
          <input
            className={styles.schedulerFilterInput}
            value={stateQuery}
            onChange={(event) => setStateQuery(event.target.value)}
            aria-label="Search by state"
            placeholder="Search by state"
            autoComplete="off"
          />
          {activeField === "state" && visibleStateOptions.length > 0 ? (
            <ul className={styles.schedulerSuggestions} role="listbox" aria-label="State suggestions">
              {visibleStateOptions.map((state) => (
                <li key={state} className={styles.schedulerSuggestionItem}>
                  <button
                    type="button"
                    className={styles.schedulerSuggestionButton}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion("state", state)}
                  >
                    {state}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>

        <label
          className={styles.schedulerFilterField}
          onFocus={() => setActiveField("provider")}
          onBlur={() => setActiveField((value) => (value === "provider" ? null : value))}
        >
          <span className={styles.schedulerFilterLabel}>Provider</span>
          <input
            className={styles.schedulerFilterInput}
            value={providerQuery}
            onChange={(event) => setProviderQuery(event.target.value)}
            aria-label="Search by provider"
            placeholder="Search by provider"
            autoComplete="off"
          />
          {activeField === "provider" && visibleProviderOptions.length > 0 ? (
            <ul className={styles.schedulerSuggestions} role="listbox" aria-label="Provider suggestions">
              {visibleProviderOptions.map((providerName) => (
                <li key={providerName} className={styles.schedulerSuggestionItem}>
                  <button
                    type="button"
                    className={styles.schedulerSuggestionButton}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion("provider", providerName)}
                  >
                    {providerName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
      </div>

      <button className={styles.schedulerArrow} type="submit" aria-label="Search providers">
        <ArrowIcon />
      </button>
    </form>
  );
}
