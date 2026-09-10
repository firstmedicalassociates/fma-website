"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { PRACTICE_OPTIONS } from "../lib/practice-inquiry.mjs";
import { SITE_CALL_HREF, SITE_CALL_LABEL } from "../lib/config/site";
import styles from "./practice-transition.module.css";

function Field({ name, label, required = false, options, type = "text", autoComplete, maxLength = 80 }) {
  return <label className={styles.field} htmlFor={`practice-${name}`}><span>{label}{required ? " *" : " (optional)"}</span>{options
    ? <select id={`practice-${name}`} name={name} required={required} defaultValue=""><option value="">Select an option</option>{options.map(value => <option key={value}>{value}</option>)}</select>
    : <input id={`practice-${name}`} name={name} type={type} required={required} autoComplete={autoComplete} maxLength={maxLength} />}</label>;
}

export default function PracticeInquiryForm() {
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
    const params = new URLSearchParams(window.location.search);
    const attribution = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].map(key => [key, params.get(key) || ""]));
    try {
      const response = await fetch("/api/practice-inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, consent: values.consent === "on", attribution }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "We could not send your inquiry. Please try again.");
      setStatus("success");
      setMessage(result.confirmationSent ? "Your inquiry has reached our team, and a welcome email is on its way. We look forward to learning more about you and your practice." : "Your inquiry has reached our team. We could not send your welcome email, but our team will still follow up. You do not need to submit again.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof TypeError || error instanceof SyntaxError ? "We could not confirm delivery. Please try again or call our team for help." : error.message);
    } finally {
      submitting.current = false;
      requestAnimationFrame(() => resultRef.current?.focus());
    }
  }

  return <div className={styles.formCard} id="connect">
    {status === "success" ? <div className={styles.success} role="status" tabIndex={-1} ref={resultRef}><CircleCheck size={44} strokeWidth={1.5} aria-hidden="true" /><h3>Thank you for reaching out.</h3><p>{message}</p><Link className={styles.textLink} href="/about/">Get to know FMA <ArrowRight size={18} aria-hidden="true" /></Link></div> : <>
      <h3>Let&apos;s get to know your practice.</h3>
      <p className={styles.formIntro}>Fields marked * are required.</p>
      <noscript><p>Please enable JavaScript to send an inquiry, or call {SITE_CALL_LABEL}.</p></noscript>
      <form className={styles.form} method="post" action="/api/practice-inquiry" onSubmit={handleSubmit} aria-busy={status === "sending"}>
        <Field name="firstName" label="First name" required autoComplete="given-name" />
        <Field name="lastName" label="Last name" required autoComplete="family-name" />
        <Field name="email" label="Email address" type="email" required autoComplete="email" maxLength={160} />
        <Field name="phone" label="Phone number" type="tel" required autoComplete="tel" maxLength={40} />
        <Field name="practiceName" label="Practice name" required autoComplete="organization" maxLength={160} />
        <Field name="role" label="Your role" required options={PRACTICE_OPTIONS.role} />
        <Field name="city" label="Practice city" required autoComplete="address-level2" maxLength={100} />
        <Field name="state" label="Practice state / region" required autoComplete="address-level1" maxLength={60} />
        <Field name="specialty" label="Practice specialty" required options={PRACTICE_OPTIONS.specialty} />
        <Field name="providerCount" label="Number of providers" options={PRACTICE_OPTIONS.providerCount} />
        <div className={styles.full}><Field name="goal" label="What are you considering?" required options={PRACTICE_OPTIONS.goal} /></div>
        <Field name="timeline" label="Your timing" options={PRACTICE_OPTIONS.timeline} />
        <Field name="preferredContact" label="Best way to reach you" options={PRACTICE_OPTIONS.preferredContact} />
        <label className={`${styles.field} ${styles.full}`} htmlFor="practice-message"><span>What would you like us to know? (optional)</span><textarea id="practice-message" name="message" maxLength={1000} rows={4} aria-describedby="practice-privacy-note" /></label>
        <p className={`${styles.notice} ${styles.full}`} id="practice-privacy-note">Please share business goals only. Do not include patient information, medical details, financial account numbers, or sensitive documents.</p>
        <label className={`${styles.consent} ${styles.full}`}><input type="checkbox" name="consent" required /><span>I agree that First Medical Associates may contact me by email or phone about this practice inquiry. View our <Link href="/privacy-policy/">Privacy Policy</Link>. *</span></label>
        <div className={styles.honeypot} aria-hidden="true"><label htmlFor="practice-website">Leave this field empty</label><input id="practice-website" name="website" tabIndex={-1} autoComplete="off" /></div>
        {status === "error" && <div className={`${styles.status} ${styles.error}`} role="alert" tabIndex={-1} ref={resultRef}>{message} <a href={SITE_CALL_HREF}>Call {SITE_CALL_LABEL}</a>.</div>}
        <button className={`${styles.primaryButton} ${styles.full}`} type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending your inquiry…" : "Connect with FMA"}<ArrowRight size={18} aria-hidden="true" /></button>
      </form>
    </>}
  </div>;
}
