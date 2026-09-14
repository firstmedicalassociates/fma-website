import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Users, Stethoscope, Building2, Plus } from "lucide-react";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import HeroEyebrow from "../components/hero-eyebrow";
import { buildStaticMetadata } from "../lib/seo";
import PracticeInquiryForm from "./practice-inquiry-form";
import styles from "./practice-transition.module.css";

export const metadata = buildStaticMetadata({
  title: "Sell Your Medical Practice | First Medical Associates",
  description: "Considering selling your medical practice? Connect with First Medical Associates to explore your next chapter with a patient-first primary care network.",
  pathname: "/sell-your-practice",
  image: { pathname: "/images/practice-transition/physician-partnership.webp", alt: "Two physicians sharing a handshake in a bright medical office" },
});

const priorities = [
  { icon: HeartHandshake, title: "The Patients Who Trust You", text: "Continuity of care starts with understanding the relationships you have built and the needs of your community." },
  { icon: Users, title: "The People Behind Your Practice", text: "Your team knows your patients. Their experience and role in a potential transition deserve a thoughtful conversation." },
  { icon: Stethoscope, title: "Your Next Chapter In Medicine", text: "Planning retirement, hoping to keep practicing, or looking for operational support? Tell us what you want your future to look like." },
  { icon: Building2, title: "A Shared Commitment To Care", text: "Explore a relationship with a regional primary care network grounded in compassion, integrity, and clinical excellence." },
];
const questions = [
  ["Do I Need To Be Ready To Sell Right Now?", "No. An introductory conversation is a chance to ask questions and share your goals, even if you are just starting to explore a future sale."],
  ["What Types Of Practices Should Reach Out?", "FMA is a primary care network serving Maryland and Northern Virginia. If you own or represent a medical practice and are considering a sale or partnership, share your specialty and location so our team can discuss whether there may be a fit."],
  ["Can I Discuss Continuing To Practice After A Sale?", "Yes. Let us know whether you hope to continue caring for patients, reduce your responsibilities, or plan for retirement. Your preferred role and timing are part of the conversation; any arrangement would depend on a mutually agreed plan."],
  ["What Should I Share In The First Inquiry?", "Start with your contact information, practice name, location, and goals. Patient information, financial statements, and other sensitive documents are not needed for this initial introduction. Our team can discuss appropriate next steps with you directly."],
];

export default function SellYourPracticePage() {
  return <>
    <SiteHeader />
    <main className={styles.page} id="main-content">
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="transition-title">
        <div className={styles.heroCopy}>
          <HeroEyebrow className={styles.eyebrow} dotClassName={styles.noDot}>Sell Your Practice. Shape Your Future.</HeroEyebrow>
          <h1 id="transition-title">The Right Transition Starts With The <span>Right Partner.</span></h1>
          <p>First Medical Associates offers a tailored transition plan that prioritizes continuity of care for your patients, stability for your team, and alignment with your long-term goals.</p>
          <a className={styles.primaryButton} href="#connect">Connect with FMA <ArrowRight size={19} aria-hidden="true" /></a>
        </div>
        <div className={styles.heroPhoto}>
          <Image src="/images/practice-transition/physician-partnership.webp" alt="Two physicians sharing a welcoming handshake in a medical office" width={1536} height={1024} sizes="(max-width: 800px) 100vw, 55vw" priority />
        </div>
      </section>

      <section className={`${styles.container} ${styles.connect}`} aria-labelledby="connect-title">
        <div className={styles.connectCopy}>
          <h2 id="connect-title">Your Next Chapter<br /><span>Starts With A Conversation.</span></h2>
          <p>Tell us a little about yourself and your practice. We will use your inquiry to begin a discussion about your goals and a potential fit with FMA.</p>
          <ol className={styles.steps}>
            <li><span>01</span><div><h3>Make An Introduction</h3><p>Share your practice details and what you are considering.</p></div></li>
            <li><span>02</span><div><h3>Talk Through Your Goals</h3><p>Our team will follow up to learn more about your priorities and timing.</p></div></li>
            <li><span>03</span><div><h3>Explore A Path Forward</h3><p>If there is a fit, discuss the next steps together, at a pace that makes sense.</p></div></li>
          </ol>
          <p className={styles.personalNote}>An introduction is simply a place to start. You do not need to have every answer today.</p>
        </div>
        <PracticeInquiryForm />
      </section>

      <section className={`${styles.container} ${styles.introduction}`} aria-labelledby="intro-title">
        <div><h2 id="intro-title">You Built More Than A Practice.<br /><span>You Built Trust.</span></h2></div>
        <div><p>Selling your practice is a personal decision as much as a business one. Whether you are planning for retirement, ready to step back from day-to-day operations, or exploring what comes next, start with a partner who understands what matters to you.</p><p>At First Medical Associates, our mission is to improve the health of our communities through high-quality, accessible care. That patient-first purpose guides how we approach relationships with practices like yours.</p></div>
      </section>

      <section className={`${styles.container} ${styles.priorities}`} aria-labelledby="priorities-title">
        <div className={styles.sectionHeading}><h2 id="priorities-title">What Matters To You<br />Matters To The Conversation.</h2><p>A thoughtful transition begins with listening.</p></div>
        <div className={styles.priorityGrid}>{priorities.map(({ icon: Icon, title, text }) => <article key={title} className={styles.priority}><Icon size={28} strokeWidth={1.7} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={`${styles.container} ${styles.about}`} aria-labelledby="about-fma-title">
        <div className={styles.aboutMark}><Stethoscope size={42} strokeWidth={1.4} aria-hidden="true" /><span>Rooted In Primary Care.<br />Connected By Purpose.</span></div>
        <div><h2 id="about-fma-title">Get To Know First Medical Associates.</h2><p>From our beginnings in Maryland to our regional presence across Maryland and Northern Virginia, FMA brings physicians and advanced care practitioners together around more personal, connected care.</p><p>Our values are simple: patient focus, excellence, integrity, compassion, and accountability. We welcome conversations with practice owners who share them.</p><Link href="/about/" className={styles.textLink}>Meet FMA <ArrowRight size={18} aria-hidden="true" /></Link></div>
      </section>

      <section className={`${styles.container} ${styles.faq}`} aria-labelledby="faq-title"><h2 id="faq-title">A Few Questions You May Have.</h2><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
    </main>
    <SiteFooter />
  </>;
}
