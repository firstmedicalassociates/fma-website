"use client";

import { PATIENT_AGE_POLICY } from "../../lib/patient-age-policy";
import { useState } from "react";
import Link from "next/link";
import { GENERAL_BOOK_APPOINTMENT_URL, PATIENT_PORTAL_URL, SITE_CALL_HREF } from "../../lib/config/site";
import styles from "./faq.module.css";

const faqs = [
  { question: "What ages do you treat?", answer: PATIENT_AGE_POLICY, links: [{ label: "Patient policies", href: "/patient-resources/patients/" }] },
  { question: "How do I schedule an appointment?", answer: "Book online, use the patient portal, or call our office for help scheduling.", links: [{ label: "Book an appointment", href: GENERAL_BOOK_APPOINTMENT_URL }, { label: "Patient portal", href: PATIENT_PORTAL_URL }] },
  { question: "What should I bring to my first visit?", answer: "Please bring a photo ID, your insurance card, and any current medications.", links: [{ label: "Patient forms and visit information", href: "/patient-resources/patients/" }] },
  { question: "Do you offer telemedicine?", answer: "Yes, we provide virtual consultations for select services and follow-up appointments.", links: [{ label: "Telemedicine information", href: "/service/telemedicine/" }] },
];

export default function FaqContent() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const matches = faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(normalized));
  return (
    <div className={styles.content}>
      <label className={styles.label} htmlFor="faq-search">Search help topics</label>
      <input id="faq-search" className={styles.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try appointments, first visit, or telemedicine" />
      <p className={styles.status} role="status">{matches.length} matching question{matches.length === 1 ? "" : "s"}</p>
      <div className={styles.questions}>
        {matches.map((faq) => (
          <section className={styles.card} key={faq.question}>
            <h2>{faq.question}</h2>
            <p>{faq.answer}</p>
            <div className={styles.links}>{faq.links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
          </section>
        ))}
        {matches.length === 0 ? <p>No questions matched. Try a broader topic or contact our team below.</p> : null}
      </div>
      <section className={styles.contact}>
        <div><h2>Still have questions?</h2><p>Contact our team for help with appointments and visits.</p></div>
        <div className={styles.actions}>
          <Link href="/contact/">Contact us</Link>
          <a href={SITE_CALL_HREF}>Call us</a>
        </div>
      </section>
    </div>
  );
}
