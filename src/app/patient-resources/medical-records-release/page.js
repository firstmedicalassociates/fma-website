import { buildStaticMetadata } from "../../lib/seo";
import { MEDICAL_RECORDS_PDF_PATH, medicalRecordsDate, medicalRecordsDeliveryReady } from "../../lib/medical-records-release.mjs";
import MedicalRecordsForm from "./medical-records-form";
import styles from "./medical-records.module.css";

export const dynamic = "force-dynamic";
export const metadata = buildStaticMetadata({
  title: "Medical Records Release Authorization | First Medical Associates",
  description: "Complete and electronically sign your authorization to release medical records to another practice or physician.",
  pathname: "/patient-resources/medical-records-release",
});

export default function MedicalRecordsReleasePage() {
  return <section className={styles.page}>
    <div className={styles.intro}>
      <div><h2>Authorization to release healthcare information</h2><p>Tell us where to send your records, choose what to release, and sign below.</p></div>
      <a className={styles.download} href={MEDICAL_RECORDS_PDF_PATH} download>Download fillable PDF</a>
    </div>
    <MedicalRecordsForm available={medicalRecordsDeliveryReady()} signatureDate={medicalRecordsDate()} />
  </section>;
}
