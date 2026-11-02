// Explicit smoke test only: no submitted patient data or production recipient lists.
import { sendFormEmail } from "../src/app/lib/ses-email.mjs";
import { buildCompletedMedicalRecordsPdf } from "../src/app/lib/medical-records-pdf.mjs";
import { medicalRecordsDate } from "../src/app/lib/medical-records-release.mjs";
import { randomUUID } from "node:crypto";

if (!process.argv.includes("--send")) {
  console.log("To send one synthetic email/PDF to SES_TEST_TO_EMAIL, run: npm run ses:test -- --send");
  process.exit(0);
}
const recipient = process.env.SES_TEST_TO_EMAIL?.trim();
if (!recipient || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)) throw new Error("Set SES_TEST_TO_EMAIL to the verified test mailbox.");
const now = new Date();
const reference = randomUUID();
const pdf = await buildCompletedMedicalRecordsPdf({
  patientName: "SYNTHETIC TEST - No Real Patient", dateOfBirth: "1980-01-01",
  recipientName: "Example Test Practice", recipientPhone: "301-555-0100", recipientFax: "",
  recipientAddress: "123 Example Street", recipientCity: "Example City", recipientState: "MD", recipientZip: "00000",
  releaseAll: true, releaseSpecific: false, releaseOther: false, treatmentDetails: "", otherDetails: "",
  releaseStdHiv: false, releaseMentalHealth: false,
  signerName: "Synthetic Test", signerRole: "patient", signatureConsent: true,
}, { reference, submittedAt: now.toISOString(), signatureDate: medicalRecordsDate(now) });
try {
  const messageId = await sendFormEmail({
    To: [{ email: recipient }], Subject: "FMA Amazon SES test — synthetic data only",
    PlainContent: `This verifies the shared FMA form email transport and PDF attachment. No real patient data is included.\nReference: ${reference}`,
    HTMLContent: `<p>This verifies the shared FMA form email transport and PDF attachment.</p><p><strong>No real patient data is included.</strong></p><p>Reference: ${reference}</p>`,
    Attachments: [{ Content: pdf.toString("base64"), Type: "application/pdf", Filename: "synthetic-medical-records-test.pdf" }],
    Tags: ["ses-smoke-test"],
  });
  console.log(`SES accepted the synthetic test for ${recipient}. Message ID: ${messageId}`);
  console.log("Check the inbox and open the PDF to confirm delivery.");
} catch (error) {
  console.error(error.message, { status: error.status || 0 });
  process.exitCode = 1;
}
