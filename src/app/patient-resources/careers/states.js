import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import styles from "./careers.module.css";

export function CareersUnavailable({ heading: Heading = "h2" }) {
  return <section className={`${styles.section} ${styles.state}`}>
    <Briefcase size={32} aria-hidden="true" />
    <Heading>Job openings are temporarily unavailable</Heading>
    <p>We couldn’t load our current opportunities. Please try again in a moment.</p>
    {/* A full reload retries the server feed instead of reusing the client router cache. */}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a className={styles.primaryButton} href="/patient-resources/careers/">Try again</a>
  </section>;
}

export function CareersBackLink() {
  return <Link href="/patient-resources/careers/" className={styles.backLink}>
    <ArrowLeft size={17} aria-hidden="true" /> All careers
  </Link>;
}
