"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "../lib/config/site";
import styles from "./site-chrome.module.css";

const NAV_LINKS = [
  { href: "/locations", label: "Locations" },
  { href: "/providers", label: "Providers" },
  { href: "/blog", label: "Blog" },
];

function isActivePath(pathname, href) {
  if (!pathname) return false;
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

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerInner}>
        <div className={styles.brandBlock}>
          <Link className={styles.brandLink} href="/">
            <span className={styles.brandMark}>F</span>
            <div>
              <p className={styles.brandName}>{SITE_NAME}</p>
              <p className={styles.brandTag}>Primary care locations</p>
            </div>
          </Link>
        </div>

        <nav className={styles.utilityNav} aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              className={`${styles.navLink} ${isActivePath(pathname, link.href) ? styles.navLinkActive : ""}`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link className={styles.headerAction} href="/locations">
          Find a Location
        </Link>
      </div>
    </header>
  );
}
