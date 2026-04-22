import Link from "next/link";
import { SITE_NAME } from "../lib/config/site";
import styles from "./site-chrome.module.css";

const FOOTER_LINKS = [
  { href: "/locations", label: "Locations" },
  { href: "/providers", label: "Providers" },
  { href: "/blog", label: "Blog" },
];

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.footerCopy}>
          {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>

        <div className={styles.footerMeta}>
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} className={styles.footerLink} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
