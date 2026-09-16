"use client";

import { useState } from "react";

function filterProviderRecords(query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const records = Array.from(document.querySelectorAll("[data-provider-record]"));

  records.forEach((record) => {
    const searchValue = record.dataset.providerSearch?.toLocaleLowerCase() || "";
    const isMatch = !normalizedQuery || searchValue.includes(normalizedQuery);
    record.hidden = !isMatch;
  });

  document.querySelectorAll("[data-provider-group]").forEach((group) => {
    const groupRecords = Array.from(group.querySelectorAll("[data-provider-record]"));
    group.hidden = Boolean(normalizedQuery) && !groupRecords.some((record) => !record.hidden);
  });

  document.querySelectorAll("[data-provider-static-empty]").forEach((emptyState) => {
    emptyState.hidden = Boolean(normalizedQuery);
  });

}

export default function ProviderSearch() {
  const [query, setQuery] = useState("");

  const hasQuery = query.trim().length > 0;

  function handleQueryChange(value) {
    setQuery(value);
    filterProviderRecords(value);
  }

  return (
    <div className="provider-search-shell">
      <label className="provider-live-search">
        <span>Search providers</span>
        <input
          className="builder-input"
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Search name, title, location..."
        />
      </label>

      {hasQuery ? (
        <button className="provider-search-clear" type="button" onClick={() => handleQueryChange("")}>
          Clear
        </button>
      ) : null}

    </div>
  );
}
