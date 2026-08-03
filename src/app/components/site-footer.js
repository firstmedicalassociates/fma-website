import Image from "next/image";
import Link from "next/link";
import {
  BILL_PAY_URL,
  GENERAL_BOOK_APPOINTMENT_URL,
  PATIENT_PORTAL_URL,
} from "../lib/config/site";
import styles from "./site-footer.module.css";

const NAV_COLUMNS = [
  {
    title: "Explore",
    icon: "explore",
    links: [
      { href: "/providers", label: "Find a Provider", icon: "user" },
      { href: "/services", label: "Services", icon: "heart" },
      { href: "/locations", label: "Locations", icon: "pin" },
      { href: "/patient-resources", label: "Patient Resources", icon: "doc" },
    ],
  },
  {
    title: "Company",
    icon: "building",
    links: [
      { href: "/about", label: "About Us", icon: "users" },
      { href: "/providers", label: "Providers", icon: "stethoscope" },
      { href: "/about/careers", label: "Careers", icon: "briefcase" },
      { href: "/contact", label: "Contact Us", icon: "mail" },
    ],
  },
  {
    title: "Patient Support",
    icon: "shield",
    links: [
      { href: "/patient-resources/patients", label: "Policies & Forms", icon: "policy" },
      { href: "/privacy-policy", label: "Privacy Policy", icon: "shield" },
      { href: GENERAL_BOOK_APPOINTMENT_URL, label: "Book Online", icon: "calendar" },
      { href: BILL_PAY_URL, label: "Pay Bill", icon: "card" },
    ],
  },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/hipaa-notice", label: "HIPAA Notice" },
  { href: "/accessibility", label: "Accessibility" },
];

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/FirstMedicalAssociates", label: "Facebook", glyph: "f" },
  { href: "https://www.instagram.com/firstmedicalassociates/", label: "Instagram", icon: "instagram" },
  { href: "https://www.linkedin.com/company/first-medical-associates/", label: "LinkedIn", glyph: "in" },
  { href: "https://twitter.com/1stMedicalAssoc", label: "X", glyph: "𝕏" },
];

function isExternalUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

function SocialIcon({ name, glyph }) {
  if (name === "instagram") {
    return (
      <svg className={styles.socialIcon} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle className={styles.socialIconDot} cx="17.4" cy="6.6" r="1" />
      </svg>
    );
  }

  return glyph;
}

function FooterIcon({ name, className }) {
  switch (name) {
    case "phone":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.7 3.8h3.1l1.3 4.2-2.1 1.7a15.4 15.4 0 0 0 5.3 5.3l1.7-2.1 4.2 1.3v3.1c0 .8-.6 1.4-1.4 1.4A16.8 16.8 0 0 1 5.3 5.2c0-.8.6-1.4 1.4-1.4Z" />
        </svg>
      );
    case "fax":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 7V3h8v4" />
          <rect x="4" y="7" width="16" height="10" rx="2" />
          <rect x="7" y="13" width="10" height="8" rx="1" />
          <path d="M8.5 10.5h.01" />
          <path d="M12 10.5h3.5" />
        </svg>
      );
    case "mail":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "portal":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      );
    case "explore":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="m15.5 8.5-2.8 6.2-6.2 2.8 2.8-6.2z" />
          <circle cx="12" cy="12" r="1.4" />
        </svg>
      );
    case "building":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 21h18" />
          <rect x="5" y="8" width="6" height="13" rx="1" />
          <rect x="13" y="4" width="6" height="17" rx="1" />
          <path d="M7.5 11h1M7.5 14h1M7.5 17h1M15.5 7h1M15.5 10h1M15.5 13h1" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v6c0 4.5 2.8 7.8 7 9 4.2-1.2 7-4.5 7-9V6l-7-3Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <path d="M4 9h16" />
          <rect x="4" y="5" width="16" height="16" rx="3" />
        </svg>
      );
    case "user":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      );
    case "heart":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 8.2a5 5 0 0 0-8.5-3.5L12 5.2l-.5-.5A5 5 0 0 0 3 8.2c0 5.6 9 11.2 9 11.2s9-5.6 9-11.2Z" />
          <path d="M8 11h2l1.2-2.3L13 14l1.3-3H16" />
        </svg>
      );
    case "pin":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "doc":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4" />
          <path d="M10 12h5M10 16h5" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "stethoscope":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4v4a4 4 0 0 0 8 0V4" />
          <path d="M10 14v2a4 4 0 0 0 8 0v-2" />
          <circle cx="18" cy="10" r="2" />
          <path d="M6 4h4M10 4h4" />
        </svg>
      );
    case "briefcase":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case "policy":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
      );
    case "card":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "arrow":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 12h10" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "chevron":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    default:
      return null;
  }
}

function SmartFooterLink({ href, className, children }) {
  if (isExternalUrl(href)) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function BrandBlock({ portalHref }) {
  return (
    <section className={styles.brandColumn} aria-label="Contact details">
      <div className={styles.brandRow}>
        <Image alt="" aria-hidden="true" className={styles.brandMark} height={64} src="/uploads/FMAicon.svg" width={64} />
        <div className={styles.brandText}>
          <span>First</span>
          <span>Medical</span>
          <span>Associates</span>
        </div>
      </div>

      <div className={styles.brandRule} />
      <p className={styles.brandCopy}>Patient-centered care across Maryland.</p>

      <div className={styles.contactList}>
        <a className={styles.contactItem} href="tel:3012843181">
          <span className={styles.contactIconWrap}>
            <FooterIcon name="phone" className={styles.contactIcon} />
          </span>
          <span>
            <span className={styles.contactLabel}>Call or Text</span>
            <strong className={styles.contactValue}>301-284-3181</strong>
          </span>
        </a>
        <a className={styles.contactItem} href="tel:8667014905">
          <span className={styles.contactIconWrap}>
            <FooterIcon name="fax" className={styles.contactIcon} />
          </span>
          <span>
            <span className={styles.contactLabel}>Fax</span>
            <strong className={styles.contactValue}>866-701-4905</strong>
          </span>
        </a>
        <a className={styles.contactItem} href="mailto:info@DrsFirst.com">
          <span className={styles.contactIconWrap}>
            <FooterIcon name="mail" className={styles.contactIcon} />
          </span>
          <span>
            <span className={styles.contactLabel}>Email</span>
            <strong className={styles.contactValue}>info@DrsFirst.com</strong>
          </span>
        </a>
      </div>

      <SmartFooterLink href={portalHref} className={styles.portalButton}>
        <span className={styles.portalInner}>
          <span className={styles.portalIconWrap}>
            <FooterIcon name="portal" className={styles.portalIcon} />
          </span>
          Patient Portal
        </span>
        <FooterIcon name="arrow" className={styles.portalArrow} />
      </SmartFooterLink>
    </section>
  );
}

function NeedCareCard() {
  return (
    <aside className={styles.needCareCard}>
      <h2 className={styles.needCareTitle}>
        <span>Book an Appointment</span>
        <span>Now For A Healthier You.</span>
      </h2>
      <div className={styles.needCareActions}>
        <SmartFooterLink href={GENERAL_BOOK_APPOINTMENT_URL} className={`${styles.needCareAction} ${styles.needCareActionPrimary}`}>
          <span className={styles.needCareActionInner}>
            Book Appointment
          </span>
          <FooterIcon name="arrow" className={styles.needCareActionArrow} />
        </SmartFooterLink>
        <SmartFooterLink href="/providers" className={`${styles.needCareAction} ${styles.needCareActionSecondary}`}>
          <span className={styles.needCareActionInner}>
            <FooterIcon name="calendar" className={styles.needCareActionIcon} />
            Find a Provider
          </span>
          <FooterIcon name="arrow" className={styles.needCareActionArrow} />
        </SmartFooterLink>
      </div>
    </aside>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const portalHref = PATIENT_PORTAL_URL !== "#" ? PATIENT_PORTAL_URL : "/patient-resources";

  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.desktopLayout}>
          <BrandBlock portalHref={portalHref} />

          <div className={styles.footerSeparator} aria-hidden="true" />

          <nav className={styles.navColumns} aria-label="Footer navigation">
            {NAV_COLUMNS.map((column) => (
              <section key={column.title}>
                <h2 className={styles.navTitle}>
                  <span className={styles.navTitleIconWrap}>
                    <FooterIcon name={column.icon} className={styles.navTitleIcon} />
                  </span>
                  {column.title}
                </h2>

                <div className={styles.navList}>
                  {column.links.map((link) => (
                    <SmartFooterLink key={`${column.title}-${link.label}`} href={link.href} className={styles.navLink}>
                      <strong>
                        <FooterIcon name={link.icon} className={styles.navMiniIcon} />
                        {link.label}
                      </strong>
                      <FooterIcon name="arrow" className={styles.navArrow} />
                    </SmartFooterLink>
                  ))}
                </div>
              </section>
            ))}
          </nav>

          <NeedCareCard />
        </div>

        <div className={styles.mobileLayout}>
          <BrandBlock portalHref={portalHref} />

          <div className={styles.mobileAccordions}>
            {NAV_COLUMNS.map((column, index) => (
              <details className={styles.mobileAccordion} key={`mobile-${column.title}`} open={index === 0}>
                <summary className={styles.mobileAccordionSummary}>
                  <strong>
                    <span className={styles.navTitleIconWrap}>
                      <FooterIcon name={column.icon} className={styles.navTitleIcon} />
                    </span>
                    {column.title}
                  </strong>
                  <FooterIcon name="chevron" className={styles.mobileAccordionChevron} />
                </summary>

                <div className={styles.mobileAccordionPanel}>
                  {column.links.map((link) => (
                    <SmartFooterLink key={`mobile-${column.title}-${link.label}`} href={link.href} className={styles.mobileAccordionLink}>
                      <span>{link.label}</span>
                      <FooterIcon name="arrow" className={styles.navArrow} />
                    </SmartFooterLink>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <NeedCareCard />
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.footerBottomInner}>
          <div>
            <p className={styles.footerCopyright}>© {year} First Medical Associates. All rights reserved.</p>
            <div className={styles.footerLegalLinks}>
              {LEGAL_LINKS.map((link, index) => (
                <span key={link.href} className={styles.footerLegalItem}>
                  <SmartFooterLink href={link.href} className={styles.footerLegalLink}>
                    {link.label}
                  </SmartFooterLink>
                  {index < LEGAL_LINKS.length - 1 ? <span aria-hidden="true">|</span> : null}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.footerBottomLine} aria-hidden="true" />

          <div className={styles.socials}>
            <strong>Connect with us</strong>
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                className={styles.socialBubble}
                href={social.href}
                aria-label={social.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <SocialIcon name={social.icon} glyph={social.glyph} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
