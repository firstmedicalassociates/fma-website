"use client";

import { useState } from "react";
import { AI_SEARCH_REQUEST_EVENT } from "../lib/ai-search-events";
import styles from "../page.module.css";

function SparkleIcon() {
  return (
    <svg aria-hidden="true" className={styles.schedulerSearchIconSvg} viewBox="0 0 24 24">
      <path d="M12 2.75 13.75 8.25 19.25 10 13.75 11.75 12 17.25 10.25 11.75 4.75 10 10.25 8.25 12 2.75Z" />
      <path d="M19 14.5 19.8 17.2 22.5 18 19.8 18.8 19 21.5 18.2 18.8 15.5 18 18.2 17.2 19 14.5Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className={styles.schedulerArrowIcon} viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

export default function HomeHeroAiSearch() {
  const [query, setQuery] = useState("");

  function submitSearch(event) {
    event.preventDefault();

    const nextQuery = query.trim();
    window.dispatchEvent(
      new CustomEvent(AI_SEARCH_REQUEST_EVENT, {
        detail: {
          query: nextQuery,
          autoRun: nextQuery.length >= 2,
        },
      }),
    );
  }

  return (
    <form className={styles.schedulerBar} onSubmit={submitSearch}>
      <span className={styles.schedulerSearchIcon} aria-hidden="true">
        <SparkleIcon />
      </span>
      <input
        aria-label="Search doctors, services, locations, or appointment types"
        className={styles.schedulerInput}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search doctors, services, locations, or appointment types"
        type="search"
        value={query}
      />
      <button className={styles.schedulerArrow} type="submit" aria-label="Search with AI">
        <ArrowIcon />
      </button>
    </form>
  );
}
