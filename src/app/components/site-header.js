"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  GENERAL_BOOK_APPOINTMENT_URL,
  PATIENT_PORTAL_URL,
  SITE_CALL_HREF,
  SITE_CALL_LABEL,
  SITE_NAME,
} from "../lib/config/site";
import AiSearchModal from "./ai-search-modal";
import styles from "./site-chrome.module.css";

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
  const [mobileMenuState, setMobileMenuState] = useState({
    isOpen: false,
    pathname: null,
  });
  const isMobileMenuOpen =
    mobileMenuState.isOpen && mobileMenuState.pathname === pathname;

  const headerActionHref = GENERAL_BOOK_APPOINTMENT_URL;
  const headerActionExternal = isExternalUrl(headerActionHref);
  const headerActionLabel = "Book Appointment";

  const navLinks = [
    { href: "/providers", label: "Find a Provider" },
    { href: "/locations", label: "Locations" },
    { href: "/services", label: "Services" },
    { href: "/patient-resources", label: "Resources" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const patientPortalHref = PATIENT_PORTAL_URL !== "#" ? PATIENT_PORTAL_URL : "/patient-resources";
  const patientPortalExternal = PATIENT_PORTAL_URL !== "#";

  const mobileQuickActions = [
    {
      key: "call",
      label: "Call",
      href: SITE_CALL_HREF,
      external: true,
      newTab: false,
      icon: "phone",
    },
    {
      key: "portal",
      label: "Patient Portal",
      href: patientPortalHref,
      external: patientPortalExternal,
      newTab: patientPortalExternal,
      icon: "users",
    },
    {
      key: "book",
      label: "Book Online",
      href: GENERAL_BOOK_APPOINTMENT_URL,
      external: true,
      newTab: true,
      icon: "calendar",
    },
  ];

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMobileMenuState((current) => ({ ...current, isOpen: false }));
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  function toggleMobileMenu() {
    setMobileMenuState((current) => ({
      isOpen: current.pathname === pathname ? !current.isOpen : true,
      pathname,
    }));
  }

  function closeMobileMenu() {
    setMobileMenuState((current) => ({ ...current, isOpen: false }));
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
          <AiSearchModal />

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
          <div className={styles.mobileAiSearchWrap}>
            <AiSearchModal
              className={styles.mobileAiSearchTrigger}
              listenForExternalRequests={false}
            />
          </div>

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
                  rel={action.newTab ? "noopener noreferrer" : undefined}
                  target={action.newTab ? "_blank" : undefined}
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
