import Link from "next/link";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import HeroEyebrow from "../components/hero-eyebrow";
import { buildStaticMetadata } from "../lib/seo";
import PartnershipInquiryForm from "./partnership-inquiry-form";
import styles from "../contact/contact-page-shell.module.css";
import partnerStyles from "./partnership-inquiry.module.css";

export const metadata = buildStaticMetadata({
  title: "Partner With Us | First Medical Associates",
  description: "Connect with the First Medical Associates partnerships team to explore collaborations that expand access, improve outcomes, and support healthier communities.",
  pathname: "/partner-with-us",
});

export default function PartnerInquiryPage() {
  return <>
    <SiteHeader />
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <HeroEyebrow>Partner With First Medical Associates</HeroEyebrow>
          <h1>Let&apos;s Build Better Care Together</h1>
          <p>Stronger partnerships start with a conversation. Tell us about your organization and how you would like to work together to improve health outcomes and strengthen our communities.</p>
        </div>
      </section>
      <section className={styles.body} aria-label="Connect with our partnerships team">
        <div className={styles.layout}>
          <aside className={`${styles.infoColumn} ${partnerStyles.infoColumn}`}>
            <article className={styles.infoCard}>
              <h2>Shared Purpose. Lasting Impact.</h2>
              <p>We collaborate with hospitals, health systems, health plans, employers, community organizations, and technology partners to expand access to high-quality, patient-first care.</p>
              <Link className={styles.infoAction} href="/about/partners/">Explore Our Partnerships</Link>
            </article>
            <article className={styles.infoCard}>
              <h2>A Conversation About Your Goals</h2>
              <p>Our team will review your introduction and follow up to learn about your priorities, answer questions, and explore opportunities that align with our shared mission.</p>
            </article>
            <article className={styles.infoCard}>
              <h2>Reach Our Partnerships Team</h2>
              <p>Prefer to connect by email? We welcome your ideas and questions.</p>
              <a className={partnerStyles.emailLink} href="mailto:Partnerships@drsfirst.com">Partnerships@drsfirst.com</a>
            </article>
          </aside>
          <PartnershipInquiryForm />
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
