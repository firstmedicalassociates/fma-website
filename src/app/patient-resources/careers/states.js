import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import styles from "./careers.module.css";

const ADP_CAREERS_URL = "https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?client=DOCTORS1&ccId=19000101_000001&cid=7ee8b673-7155-41a3-9ef1-249815a30f92&lang=en_US&source=CC2&selectedMenuKey=CurrentOpenings";

export function CareersUnavailable({ heading: Heading = "h2" }) {
  return <section className={`${styles.section} ${styles.state}`}>
    <Briefcase size={32} aria-hidden="true" />
    <Heading>Job openings are temporarily unavailable</Heading>
    <p>We couldn’t load our current opportunities here. You can still view openings and apply through our ADP career center.</p>
    <a className={styles.primaryButton} href={ADP_CAREERS_URL}>View openings on ADP</a>
    <br />
    {/* A full reload retries the server feed instead of reusing the client router cache. */}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a className={styles.backLink} href="/patient-resources/careers/">Try again</a>
  </section>;
}

export function CareersBackLink() {
  return <Link href="/patient-resources/careers/" className={styles.backLink}>
    <ArrowLeft size={17} aria-hidden="true" /> All careers
  </Link>;
}
