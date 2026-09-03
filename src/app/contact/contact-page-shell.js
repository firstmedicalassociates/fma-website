"use client";

import Link from "next/link";
import { useState } from "react";
import HeroEyebrow from "../components/hero-eyebrow";
import {
  PATIENT_PORTAL_URL,
  SITE_CALL_HREF,
  SITE_CALL_LABEL,
  normalizeInternalPageHref,
} from "../lib/config/site";
import { NO_PHI_NOTICE } from "../lib/no-phi-guard";
import styles from "./contact-page-shell.module.css";

const INITIAL_FORM_VALUES = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

function isExternalUrl(value = "") {
  const normalized = String(value || "").trim();
  return /^[a-z][a-z\d+\-.]*:/i.test(normalized) || normalized.startsWith("//");
}

function ActionLink({ href, className, children, external = false }) {
  if (!href) {
    return <span className={`${className} ${styles.actionDisabled}`}>{children}</span>;
  }

  if (external || isExternalUrl(href)) {
    return (
      <a
        className={className}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={normalizeInternalPageHref(href)}>
      {children}
    </Link>
  );
}

export default function ContactPageShell() {
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES);
  const [formStatus, setFormStatus] = useState("idle");
  const [formMessage, setFormMessage] = useState("");

  const callHref = SITE_CALL_HREF || "/locations/";
  const callLabel = SITE_CALL_HREF ? SITE_CALL_LABEL : "Call our team";
  const portalHref = PATIENT_PORTAL_URL !== "#" ? PATIENT_PORTAL_URL : "";
  const portalExternal = PATIENT_PORTAL_URL !== "#";

  async function handleSubmit(event) {
    event.preventDefault();
    setFormStatus("sending");
    setFormMessage("");
    const submittedFirstName = formValues.firstName.trim();
    const submittedEmail = formValues.email.trim();

    try {
      const response = await fetch("/api/location-info-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formValues,
          locationTitle: "Website Contact",
          locationSlug: "/contact",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        setFormStatus("error");
        setFormMessage(payload.error || "Unable to send your message right now.");
        return;
      }

      setFormStatus("success");
      setFormMessage(
        payload.confirmationSent
          ? `Thanks, ${submittedFirstName}. Your message has been sent, and a confirmation email is on its way to ${submittedEmail}.`
          : "Your message was received, but we could not send the confirmation email. Our team will still follow up."
      );
      setFormValues(INITIAL_FORM_VALUES);
    } catch {
      setFormStatus("error");
      setFormMessage("Unable to send your message right now.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <HeroEyebrow>Contact First Medical Associates</HeroEyebrow>
          <h1>Let&apos;s Get You Connected to Care</h1>
          <p>
            Whether you need help finding a location, booking an appointment, or reaching
            your care team, send us a message and we&apos;ll point you to the right next step.
          </p>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.layout}>
          <aside className={styles.infoColumn}>
            <article className={styles.infoCard}>
              <h2>Call</h2>
              <p>Speak with our support team for appointment and clinic questions.</p>
              <ActionLink className={styles.infoAction} href={callHref} external={isExternalUrl(callHref)}>
                {callLabel}
              </ActionLink>
            </article>

            <article className={styles.infoCard}>
              <h2>Patient Portal</h2>
              <p>Use your portal to review records, manage follow-ups, and message your team.</p>
              <ActionLink className={styles.infoAction} href={portalHref} external={portalExternal}>
                Open Patient Portal
              </ActionLink>
            </article>

            <article className={styles.infoCard}>
              <h2>Find A Location</h2>
              <p>Explore Maryland clinics and choose the office that works best for you.</p>
              <ActionLink className={styles.infoAction} href="/locations/">
                Browse Locations
              </ActionLink>
            </article>

            <article className={styles.infoCard}>
              <h2>Find a Doctor</h2>
              <p>Review provider profiles and choose the right clinician for your care needs.</p>
              <ActionLink className={styles.infoAction} href="/providers/">
                Browse Providers
              </ActionLink>
            </article>

            <article className={styles.infoCard}>
              <h2>Browse Services</h2>
              <p>Compare primary care, specialized care, chronic care, and telehealth services.</p>
              <ActionLink className={styles.infoAction} href="/services/">
                View Services
              </ActionLink>
            </article>
          </aside>

          <section className={styles.formCard}>
            <div className={styles.formIntro}>
              <h2>Send a Message</h2>
              <p>We usually respond within one business day.</p>
            </div>

            <div className={styles.privacyNotice}>
              <strong>Please keep this message general.</strong>
              <span>{NO_PHI_NOTICE}</span>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>First Name</span>
                <input
                  type="text"
                  required
                  value={formValues.firstName}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Last Name</span>
                <input
                  type="text"
                  required
                  value={formValues.lastName}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={formValues.email}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Phone</span>
                <input
                  type="tel"
                  required
                  value={formValues.phone}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Message</span>
                <textarea
                  rows={6}
                  required
                  aria-describedby="contactNoPhiHelp"
                  placeholder="Example: I need help finding the right office or appointment path."
                  value={formValues.message}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, message: event.target.value }))
                  }
                />
                <small id="contactNoPhiHelp">
                  For symptoms, records, prescriptions, results, or urgent concerns, use the patient portal or call.
                </small>
              </label>

              <button
                className={styles.submit}
                type="submit"
                disabled={formStatus === "sending"}
              >
                {formStatus === "sending" ? "Sending..." : "Send Message"}
              </button>
            </form>

            {formMessage ? (
              <p
                className={`${styles.status} ${
                  formStatus === "error" ? styles.statusError : styles.statusSuccess
                }`}
              >
                {formMessage}
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
