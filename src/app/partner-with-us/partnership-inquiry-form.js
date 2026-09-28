"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { PARTNERSHIP_LIMITS, PARTNERSHIP_TYPES } from "../lib/partnership-options.mjs";
import styles from "../contact/contact-page-shell.module.css";
import partnerStyles from "./partnership-inquiry.module.css";

function Field({ name, label, type = "text", autoComplete, required = true }) {
  return <label className={styles.field} htmlFor={`partner-${name}`}>
    <span>{label}{required ? " *" : " (optional)"}</span>
    <input id={`partner-${name}`} name={name} type={type} required={required} autoComplete={autoComplete} maxLength={PARTNERSHIP_LIMITS[name]} />
  </label>;
}

export default function PartnershipInquiryForm() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const resultRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/partnership-inquiry", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, consent: values.consent === "on" }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "We could not send your inquiry. Please try again.");
      setStatus("success");
      setMessage(result.confirmationSent
        ? "Your inquiry has reached our partnerships team, and a welcome email is on its way. We look forward to learning more about your organization and your goals."
        : "Your inquiry has reached our partnerships team. We could not send your welcome email, but our team will still follow up. You do not need to submit again.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof TypeError || error instanceof SyntaxError
        ? "We could not confirm delivery. Please try again or email our partnerships team for help."
        : error.message);
    } finally {
      submitting.current = false;
      requestAnimationFrame(() => resultRef.current?.focus());
    }
  }

  return <section className={styles.formCard} aria-labelledby="partner-form-title">
    {status === "success" ? <div className={partnerStyles.success} role="status" tabIndex={-1} ref={resultRef}>
      <CircleCheck size={44} strokeWidth={1.5} aria-hidden="true" />
      <h2 id="partner-form-title">Thank You for Connecting</h2>
      <p>{message}</p>
      <Link className={styles.infoAction} href="/about/partners/">Explore Our Partnerships</Link>
    </div> : <>
      <div className={styles.formIntro}>
        <h2 id="partner-form-title">Start a Partnership Conversation</h2>
        <p>Share a little about your organization and what you have in mind. Fields marked * are required.</p>
      </div>
      <noscript><p>Please enable JavaScript to send an inquiry, or email <a href="mailto:Partnerships@drsfirst.com">Partnerships@drsfirst.com</a>.</p></noscript>
      <form className={styles.form} method="post" action="/api/partnership-inquiry" onSubmit={handleSubmit} aria-busy={status === "sending"}>
        <Field name="firstName" label="First name" autoComplete="given-name" />
        <Field name="lastName" label="Last name" autoComplete="family-name" />
        <Field name="email" label="Email address" type="email" autoComplete="email" />
        <Field name="phone" label="Phone number" type="tel" autoComplete="tel" />
        <Field name="organization" label="Organization" autoComplete="organization" />
        <Field name="role" label="Your role / title" autoComplete="organization-title" required={false} />
        <label className={`${styles.field} ${styles.fieldFull}`} htmlFor="partner-partnershipType">
          <span>Partnership type *</span>
          <select id="partner-partnershipType" name="partnershipType" required defaultValue="">
            <option value="">Select your organization type</option>
            {PARTNERSHIP_TYPES.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className={`${styles.field} ${styles.fieldFull}`} htmlFor="partner-message">
          <span>How would you like to work together? *</span>
          <textarea id="partner-message" name="message" required rows={5} maxLength={PARTNERSHIP_LIMITS.message} aria-describedby="partner-message-help" placeholder="Tell us about your organization, your goals, and the partnership opportunity you would like to explore." />
          <small id="partner-message-help">Please share business goals only. Do not include patient information, medical details, or sensitive documents.</small>
        </label>
        <label className={`${partnerStyles.consent} ${styles.fieldFull}`}>
          <input type="checkbox" name="consent" required />
          <span>I agree that First Medical Associates may contact me by email or phone about this partnership inquiry. View our <Link href="/privacy-policy/">Privacy Policy</Link>. *</span>
        </label>
        <div className={partnerStyles.honeypot} aria-hidden="true"><label htmlFor="partner-website">Leave this field empty</label><input id="partner-website" name="website" tabIndex={-1} autoComplete="off" /></div>
        {status === "error" && <p className={`${styles.status} ${styles.statusError} ${styles.fieldFull}`} role="alert" tabIndex={-1} ref={resultRef}>{message}</p>}
        <button className={styles.submit} type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending Your Inquiry…" : "Send Partnership Inquiry"}</button>
      </form>
    </>}
  </section>;
}
