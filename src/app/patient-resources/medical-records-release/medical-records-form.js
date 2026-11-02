"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, Download, Send } from "lucide-react";
import { AUTHORIZATION_TEXT, ELECTRONIC_SIGNATURE_TEXT, EXPIRATION_TEXT, MEDICAL_RECORDS_PDF_PATH, MEDICAL_RECORDS_RECIPIENT, SENSITIVE_AUTHORIZATIONS, STD_DEFINITION } from "../../lib/medical-records-release.mjs";
import { SITE_CALL_HREF, SITE_CALL_LABEL } from "../../lib/config/site";
import styles from "./medical-records.module.css";

function Field({ name, label, errors, type = "text", required = true, maxLength = 80, autoComplete = "off", ...props }) {
  return <label className={styles.field} htmlFor={`mr-${name}`}>
    <span>{label}{required ? " *" : " (optional)"}</span>
    <input id={`mr-${name}`} name={name} type={type} required={required} maxLength={maxLength} autoComplete={autoComplete} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `mr-${name}-error` : undefined} {...props} />
    {errors[name] && <span className={styles.fieldError} id={`mr-${name}-error`}>{errors[name]}</span>}
  </label>;
}

export default function MedicalRecordsForm({ available, signatureDate }) {
  const [selected, setSelected] = useState({ releaseSpecific: false, releaseOther: false });
  const [status, setStatus] = useState("idle");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const submitting = useRef(false);
  const resultRef = useRef(null);
  const formRef = useRef(null);
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current || !available) return;
    submitting.current = true;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    for (const key of ["releaseAll", "releaseSpecific", "releaseOther", "releaseStdHiv", "releaseMentalHealth", "signatureConsent"]) values[key] = values[key] === "on";
    setStatus("sending");
    setMessage("");
    setErrors({});
    try {
      const response = await fetch("/api/medical-records-release", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values), cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setErrors(result.errors || {});
        setReference(result.reference || "");
        throw new Error(result.error || "We could not confirm submission. Please call our team before submitting again.");
      }
      setReference(result.reference);
      // Decode in memory only; no patient information is placed in URLs or browser storage.
      try {
        const bytes = Uint8Array.from(atob(result.pdf), char => char.charCodeAt(0));
        setDownloadUrl(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      } catch { /* Delivery succeeded even if this browser cannot prepare a download. */ }
      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof TypeError || error instanceof SyntaxError ? "We could not confirm submission. Please call our team before submitting again." : error.message);
    } finally {
      submitting.current = false;
      requestAnimationFrame(() => resultRef.current?.focus());
    }
  }

  if (status === "success") return <div className={styles.success} ref={resultRef} tabIndex={-1} role="status">
    <CircleCheck size={42} aria-hidden="true" /><h3>Your authorization has been submitted.</h3>
    <p>Our medical records team will review your authorization and may contact you to verify your identity or request additional information.</p>
    <p className={styles.reference}>Submission reference: {reference}</p>
    {downloadUrl && <a className={styles.primaryButton} href={downloadUrl} download="medical-records-release.pdf"><Download size={18} aria-hidden="true" /> Download your completed form</a>}
    <p>Questions? Call <a href={SITE_CALL_HREF}>{SITE_CALL_LABEL}</a>.</p>
  </div>;

  const checkbox = (name, label) => <label className={styles.choice} key={name}>
    <input type="checkbox" name={name} onChange={name in selected ? event => setSelected(current => ({ ...current, [name]: event.target.checked })) : undefined} />
    <span>{label}</span>
  </label>;

  return <>
    {!available && <div className={styles.notice} role="status"><strong>Online submission is currently unavailable.</strong><p>You can <a href={MEDICAL_RECORDS_PDF_PATH} download>download the fillable PDF</a> and call <a href={SITE_CALL_HREF}>{SITE_CALL_LABEL}</a> for return instructions.</p></div>}
    <noscript><p className={styles.notice}>Enable JavaScript to submit online, or download the fillable PDF and contact our team.</p></noscript>
    <form ref={formRef} className={styles.form} method="post" action="/api/medical-records-release" onSubmit={handleSubmit} autoComplete="off" aria-busy={status === "sending"}>
      <p className={styles.help}>Fields marked * are required. Completed authorizations are sent to {MEDICAL_RECORDS_RECIPIENT}.</p>
      <fieldset disabled={!available || status === "sending"} className={styles.section}>
        <legend>1. Patient information</legend>
        <div className={styles.grid}>
          <Field name="patientName" label="Patient full name" errors={errors} />
          <Field name="dateOfBirth" label="Date of birth" errors={errors} type="date" min="1900-01-01" max={signatureDate} maxLength={10} />
        </div>
      </fieldset>
      <fieldset disabled={!available || status === "sending"} className={styles.section}>
        <legend>2. Where should we send your records?</legend>
        <p>{AUTHORIZATION_TEXT}</p>
        <div className={styles.grid}>
          <div className={styles.full}><Field name="recipientName" label="Practice / physician's name" errors={errors} maxLength={120} /></div>
          <Field name="recipientPhone" label="Practice phone" errors={errors} type="tel" required={false} maxLength={40} />
          <Field name="recipientFax" label="Practice fax" errors={errors} type="tel" required={false} maxLength={40} />
          <div className={styles.full}><Field name="recipientAddress" label="Practice street address" errors={errors} maxLength={160} /></div>
          <Field name="recipientCity" label="City" errors={errors} />
          <div className={styles.grid}><Field name="recipientState" label="State" errors={errors} maxLength={60} /><Field name="recipientZip" label="ZIP code" errors={errors} maxLength={20} /></div>
        </div>
      </fieldset>
      <fieldset disabled={!available || status === "sending"} className={styles.section} aria-describedby="mr-scope-help">
        <legend>3. Information to release</legend>
        <p id="mr-scope-help">This request and authorization applies to the following. Select at least one option. *</p>
        {errors.recordsScope && <p className={styles.fieldError}>{errors.recordsScope}</p>}
        {checkbox("releaseAll", "All healthcare information")}
        {checkbox("releaseSpecific", "Healthcare information relating to a specific treatment, condition or dates")}
        {selected.releaseSpecific && <label className={styles.field} htmlFor="mr-treatmentDetails"><span>Treatment, condition or dates *</span><textarea id="mr-treatmentDetails" name="treatmentDetails" required maxLength={600} rows={3} aria-invalid={Boolean(errors.treatmentDetails)} aria-describedby={errors.treatmentDetails ? "mr-treatmentDetails-error" : undefined} />{errors.treatmentDetails && <span className={styles.fieldError} id="mr-treatmentDetails-error">{errors.treatmentDetails}</span>}</label>}
        {checkbox("releaseOther", "Other healthcare information")}
        {selected.releaseOther && <label className={styles.field} htmlFor="mr-otherDetails"><span>Describe other records *</span><textarea id="mr-otherDetails" name="otherDetails" required maxLength={600} rows={3} aria-invalid={Boolean(errors.otherDetails)} aria-describedby={errors.otherDetails ? "mr-otherDetails-error" : undefined} />{errors.otherDetails && <span className={styles.fieldError} id="mr-otherDetails-error">{errors.otherDetails}</span>}</label>}
        <div className={styles.permissions}><h3>Additional permissions (optional)</h3><p>These permissions are separate choices. Check only those you authorize.</p>
          {Object.entries(SENSITIVE_AUTHORIZATIONS).map(([name, label]) => checkbox(name, label))}
          <details className={styles.definition}><summary>STD definition from the original form</summary><p>{STD_DEFINITION}</p></details>
        </div>
      </fieldset>
      <fieldset disabled={!available || status === "sending"} className={styles.section}>
        <legend>4. Sign your authorization</legend>
        <p>{EXPIRATION_TEXT}</p>
        <div className={styles.grid}>
          <Field name="signerName" label="Electronic signature (full name)" errors={errors} />
          <label className={styles.field} htmlFor="mr-signerRole"><span>I am signing as *</span><select id="mr-signerRole" name="signerRole" required defaultValue="" aria-invalid={Boolean(errors.signerRole)} aria-describedby={errors.signerRole ? "mr-signerRole-error" : undefined}><option value="">Select your relationship</option><option value="patient">Patient</option><option value="parent-guardian">Parent / legal guardian</option></select>{errors.signerRole && <span className={styles.fieldError} id="mr-signerRole-error">{errors.signerRole}</span>}</label>
        </div>
        <p className={styles.help}>The signature date is recorded automatically when you submit.</p>
        <label className={styles.choice}><input type="checkbox" name="signatureConsent" required aria-invalid={Boolean(errors.signatureConsent)} aria-describedby={errors.signatureConsent ? "mr-signatureConsent-error" : undefined} /><span>{ELECTRONIC_SIGNATURE_TEXT} *</span></label>
        {errors.signatureConsent && <p className={styles.fieldError} id="mr-signatureConsent-error">{errors.signatureConsent}</p>}
      </fieldset>
      <div className={styles.honeypot} aria-hidden="true"><label htmlFor="mr-website">Leave this field empty</label><input id="mr-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {status === "error" && <div className={styles.error} tabIndex={-1} ref={resultRef} role="alert"><p>{message}</p>{Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([name, error]) => <li key={name}><a href={name === "recordsScope" ? "#mr-scope-help" : `#mr-${name}`}>{error}</a></li>)}</ul>}{reference && <p>Submission reference: {reference}</p>}<a href={SITE_CALL_HREF}>Call {SITE_CALL_LABEL}</a></div>}
      <button className={styles.primaryButton} type="submit" disabled={!available || status === "sending"}><Send size={18} aria-hidden="true" />{status === "sending" ? "Submitting your authorization…" : "Submit authorization"}</button>
      <p className={styles.help}>Please review your entries before submitting. Our records team reviews the authorization before releasing records. <Link href="/privacy-policy/">Privacy Policy</Link></p>
    </form>
  </>;
}
