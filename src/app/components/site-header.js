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

function QuickActionIcon({ name }) {
  if (name === "phone") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.7 3.8h3.1l1.3 4.2-2.1 1.7a15.4 15.4 0 0 0 5.3 5.3l1.7-2.1 4.2 1.3v3.1c0 .8-.6 1.4-1.4 1.4A16.8 16.8 0 0 1 5.3 5.2c0-.8.6-1.4 1.4-1.4Z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <path d="M4 9h16" />
        <rect x="4" y="5" width="16" height="16" rx="3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const trimmedQuery = query.trim();
  const hasSearchQuery = trimmedQuery.length >= SEARCH_MIN_CHARACTERS;
  const showSearchPanel = isSearchOpen && (hasSearchQuery || searchStatus === "loading");
  const headerActionHref = SITE_CALL_HREF || "/locations";
  const headerActionExternal = isExternalUrl(headerActionHref);
  const headerActionLabel = SITE_CALL_HREF ? SITE_CALL_LABEL : "Call now";
  const navLinks = [
    { href: "/about", label: "About" },
    { href: "/providers", label: "Find a Doctor" },
    { href: "/services", label: "Services" },
    { href: "/locations", label: "Locations" },
    { href: "/patient-resources", label: "Patient Resources" },
    ...(PATIENT_PORTAL_URL !== "#"
      ? [{ href: PATIENT_PORTAL_URL, label: "Patient Portal", external: true }]
      : []),
  ];
  const patientPortalHref = PATIENT_PORTAL_URL !== "#" ? PATIENT_PORTAL_URL : "/patient-resources";
  const patientPortalExternal = PATIENT_PORTAL_URL !== "#";
  const mobileQuickActions = [
    {
      key: "call",
      label: "Call",
      href: headerActionHref,
      external: headerActionExternal,
      icon: "phone",
    },
    {
      key: "portal",
      label: "Patient Portal",
      href: patientPortalHref,
      external: patientPortalExternal,
      icon: "users",
    },
    {
      key: "book",
      label: "Book Online",
      href: "/locations",
      external: false,
      icon: "calendar",
    },
  ];

  const searchSummary = useMemo(() => {
    if (searchStatus === "loading") return "Searching the site...";
    if (!hasSearchQuery) return `Type at least ${SEARCH_MIN_CHARACTERS} characters to search.`;
    if (results.length === 0) return "No matching pages found.";
    return `${results.length} matching page${results.length === 1 ? "" : "s"}`;
  }, [hasSearchQuery, results.length, searchStatus]);

  useEffect(() => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

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

  function toggleMobileMenu() {
    setIsMobileMenuOpen((current) => !current);
    setIsSearchOpen(false);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  const headerClassName = `${styles.siteHeader}${isMobileMenuOpen ? ` ${styles.siteHeaderMenuOpen}` : ""}`;
  const mobileBurgerClassName = `${styles.mobileBurger}${isMobileMenuOpen ? ` ${styles.mobileBurgerToggled}` : ""}`;
  const mobileNavClassName = `${styles.mobileNav}${isMobileMenuOpen ? ` ${styles.mobileNavOpen}` : ""}`;

  return (
    <header className={headerClassName}>
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

        <button
          aria-controls="mobile-primary-nav"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          className={mobileBurgerClassName}
          onClick={toggleMobileMenu}
          type="button"
        >
          <span className={styles.mobileBurgerBuns} aria-hidden="true">
            <span className={styles.mobileBurgerBun} />
            <span className={styles.mobileBurgerBun} />
          </span>
        </button>

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

      <nav
        aria-label="Mobile navigation"
        className={mobileNavClassName}
        id="mobile-primary-nav"
        role="navigation"
      >
        <div className={styles.mobileNavInner}>
          <ul className={styles.mobileNavList}>
            {navLinks.map((link) => (
              <li className={styles.mobileNavItem} key={`${link.label}-${link.href}`}>
                {link.external ? (
                  <a
                    className={styles.mobileNavLink}
                    href={link.href}
                    onClick={closeMobileMenu}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span>{link.label}</span>
                  </a>
                ) : (
                  <Link
                    className={`${styles.mobileNavLink} ${isActivePath(pathname, link.href) ? styles.mobileNavLinkActive : ""}`}
                    href={link.href}
                    onClick={closeMobileMenu}
                  >
                    <span>{link.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className={styles.mobileQuickActions}>
            {mobileQuickActions.map((action) =>
              action.external ? (
                <a
                  key={action.key}
                  className={styles.mobileQuickAction}
                  href={action.href}
                  onClick={closeMobileMenu}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className={styles.mobileQuickActionButton}>
                    <QuickActionIcon name={action.icon} />
                  </span>
                  <span className={styles.mobileQuickActionLabel}>{action.label}</span>
                </a>
              ) : (
                <Link
                  key={action.key}
                  className={styles.mobileQuickAction}
                  href={action.href}
                  onClick={closeMobileMenu}
                >
                  <span className={styles.mobileQuickActionButton}>
                    <QuickActionIcon name={action.icon} />
                  </span>
                  <span className={styles.mobileQuickActionLabel}>{action.label}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
