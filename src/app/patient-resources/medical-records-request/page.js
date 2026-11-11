import { buildStaticMetadata } from "../../lib/seo";
import { medicalRecordsDate, medicalRecordsDeliveryReady } from "../../lib/medical-records-release.mjs";
import { getMedicalRecordsForm } from "../../lib/medical-records-forms.mjs";
import MedicalRecordsForm from "../medical-records-release/medical-records-form";
import styles from "../medical-records-release/medical-records.module.css";

export const dynamic = "force-dynamic";
export const metadata = buildStaticMetadata({
  title: "Request Medical Records | First Medical Associates",
  description: "Complete and electronically sign an authorization for another practice to send your medical records to First Medical Associates.",
  pathname: "/patient-resources/medical-records-request",
});

export default function MedicalRecordsRequestPage() {
  const form = getMedicalRecordsForm("request");
  return <section className={styles.page}>
    <div className={styles.intro}>
      <div><h2>Authorization to request healthcare information</h2><p>{form.description}</p></div>
      <a className={styles.download} href={form.pdfPath} download>Download fillable PDF</a>
    </div>
    <MedicalRecordsForm formType="request" available={medicalRecordsDeliveryReady()} signatureDate={medicalRecordsDate()} />
  </section>;
}
