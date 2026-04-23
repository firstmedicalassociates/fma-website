"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PATIENT_PORTAL_URL,
  SITE_CALL_HREF,
  SITE_CALL_LABEL,
  SITE_NAME,
} from "../lib/config/site";
import styles from "./site-chrome.module.css";

const SEARCH_MIN_CHARACTERS = 2;

function isExternalUrl(value = "") {
  const normalized = String(value || "").trim();
  return /^[a-z][a-z\d+\-.]*:/i.test(normalized) || normalized.startsWith("//");
}

function isActivePath(pathname, href) {
  if (!pathname || !href || isExternalUrl(href) || href === "#") return false;
  if (href === "/locations") {
    return (
      pathname === "/location" ||
      pathname === "/locations" ||
      pathname.startsWith("/location/") ||
      pathname.startsWith("/locations/")
    );
  }
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const trimmedQuery = query.trim();
  const hasSearchQuery = trimmedQuery.length >= SEARCH_MIN_CHARACTERS;
  const showSearchPanel = isSearchOpen && (hasSearchQuery || searchStatus === "loading");
  const headerActionHref = SITE_CALL_HREF || "/locations";
  const headerActionExternal = isExternalUrl(headerActionHref);
  const headerActionLabel = SITE_CALL_HREF ? SITE_CALL_LABEL : "Call now";
  const navLinks = [
    { href: "/providers", label: "Find a Doctor" },
    { href: "/locations", label: "Locations" },
    { href: "/blog", label: "Blog" },
    ...(PATIENT_PORTAL_URL !== "#"
      ? [{ href: PATIENT_PORTAL_URL, label: "Patient Portal", external: true }]
      : []),
  ];

  const searchSummary = useMemo(() => {
    if (searchStatus === "loading") return "Searching the site...";
    if (!hasSearchQuery) return `Type at least ${SEARCH_MIN_CHARACTERS} characters to search.`;
    if (results.length === 0) return "No matching pages found.";
    return `${results.length} matching page${results.length === 1 ? "" : "s"}`;
  }, [hasSearchQuery, results.length, searchStatus]);

  useEffect(() => {
    setIsSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!hasSearchQuery) {
      setResults([]);
      setSearchStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setResults([]);
    setSearchStatus("loading");

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
          setResults([]);
          setSearchStatus("error");
          return;
        }

        setResults(Array.isArray(data.results) ? data.results : []);
        setSearchStatus("ready");
      } catch (error) {
        if (error.name === "AbortError") return;
        setResults([]);
        setSearchStatus("error");
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [hasSearchQuery, trimmedQuery]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    if (!hasSearchQuery) {
      setIsSearchOpen(true);
      return;
    }

    setIsSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  }

  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerInner}>
        <Link className={styles.brandLink} href="/">
          <Image
            alt={SITE_NAME}
            className={styles.brandLogo}
            height={1178}
            priority
            src="/logo-white.png"
            width={3754}
          />
        </Link>

        <nav className={styles.utilityNav} aria-label="Primary navigation">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={`${link.label}-${link.href}`}
                className={styles.navLink}
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                className={`${styles.navLink} ${isActivePath(pathname, link.href) ? styles.navLinkActive : ""}`}
                href={link.href}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className={styles.headerTools}>
          <div className={styles.searchWrap} ref={searchRef}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input
                aria-label="Search website"
                className={styles.searchInput}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search doctors, locations, or articles"
                type="search"
                value={query}
              />
            </form>

            {showSearchPanel ? (
              <div className={styles.searchPanel}>
                <div className={styles.searchPanelHeader}>
                  <span className={styles.searchPanelTitle}>Search Directory</span>
                  <span className={styles.searchPanelMeta}>{searchSummary}</span>
                </div>

                {hasSearchQuery && results.length > 0 ? (
                  <div className={styles.searchResults}>
                    {results.map((result) => (
                      <Link
                        key={`${result.kind}-${result.href}`}
                        className={styles.searchResult}
                        href={result.href}
                        onClick={() => setIsSearchOpen(false)}
                      >
                        <span className={styles.searchResultBadge}>{result.categoryLabel}</span>
                        <strong>{result.title}</strong>
                        <span>{result.description}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className={styles.searchEmptyState}>
                    {searchStatus === "error"
                      ? "Search is temporarily unavailable."
                      : hasSearchQuery
                        ? "No related pages found for that search."
                        : `Start typing a provider name, location, ZIP code, or article topic.`}
                  </div>
                )}

                {hasSearchQuery ? (
                  <Link
                    className={styles.searchAllResults}
                    href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
                    onClick={() => setIsSearchOpen(false)}
                  >
                    View all search results
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {headerActionExternal ? (
            <a className={styles.headerAction} href={headerActionHref} rel="noopener noreferrer" target="_blank">
              {headerActionLabel}
            </a>
          ) : (
            <Link className={styles.headerAction} href={headerActionHref}>
              {headerActionLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
