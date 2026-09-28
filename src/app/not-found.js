import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, HeartPulse, MapPin, Phone, Stethoscope } from "lucide-react";
import SiteHeader from "./components/site-header";
import SiteFooter from "./components/site-footer";
import { SITE_CALL_HREF, SITE_CALL_LABEL } from "./lib/config/site";
import styles from "./not-found.module.css";

export const metadata = {
  title: "Page Not Found | First Medical Associates",
  description: "Find your way back to First Medical Associates. Explore providers, locations, services, and patient resources, or contact our team for help.",
  robots: { index: false, follow: true },
};

const destinations = [
  { href: "/providers/", title: "Find a Provider", description: "Meet your next care partner.", icon: Stethoscope },
  { href: "/locations/", title: "Explore Locations", description: "Find an FMA office near you.", icon: MapPin },
  { href: "/services/", title: "Browse Services", description: "Explore care for your needs.", icon: HeartPulse },
  { href: "/patient-resources/", title: "Patient Resources", description: "Find forms, answers, and support.", icon: FileText },
];

export default function NotFound() {
  return <>
    <SiteHeader />
    <main className={styles.page} id="main-content">
      <div className={styles.inner}>
        <section className={styles.hero} aria-labelledby="not-found-title">
          <div className={styles.illustration} aria-hidden="true">
            <Image className={styles.errorArtwork} src="/404.svg" width={500} height={198} alt="" />
            <span className={styles.illustrationLabel}>First Medical Associates</span>
          </div>

          <div className={styles.copy}>
            <p className={styles.eyebrow}>404 / Page not found</p>
            <h1 id="not-found-title">Let&apos;s get you back to care.</h1>
            <p className={styles.description}>We couldn&apos;t find the page you were looking for. It may have moved, or the link may be out of date. We&apos;ll help you find your next step.</p>
            <div className={styles.actions}>
              <Link href="/" className={styles.primaryAction}>Back to Homepage <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/contact/" className={styles.secondaryAction}>Contact Our Team <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <nav className={styles.destinations} aria-labelledby="helpful-links-title">
          <div className={styles.sectionHeading}>
            <h2 id="helpful-links-title">Find what you need</h2>
            <p>A few helpful places to start.</p>
          </div>
          <div className={styles.linkGrid}>
            {destinations.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className={styles.destination}>
              <Icon className={styles.destinationIcon} size={26} strokeWidth={1.6} aria-hidden="true" />
              <span className={styles.destinationText}><span className={styles.destinationTitle}>{title}</span><span className={styles.destinationDescription}>{description}</span></span>
              <ArrowRight className={styles.destinationArrow} size={18} aria-hidden="true" />
            </Link>)}
          </div>
        </nav>

        <div className={styles.support}>
          <p>Prefer a little help? Our team is here for you.</p>
          <a href={SITE_CALL_HREF}><Phone size={17} aria-hidden="true" />Call {SITE_CALL_LABEL}</a>
        </div>
      </div>
    </main>
    <SiteFooter />
  </>;
}
