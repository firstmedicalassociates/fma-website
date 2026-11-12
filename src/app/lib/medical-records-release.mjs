import { emailDeliveryConfigured } from "./email-config.mjs";

export const MEDICAL_RECORDS_RECIPIENT = "medicalrecords@drsfirst.com";
export const MEDICAL_RECORDS_FORM_PATH = "/patient-resources/medical-records-release/";
export const MEDICAL_RECORDS_PDF_PATH = "/wp-content/uploads/2023/04/FMA-MR-release-4.18.23.pdf";
export const AUTHORIZATION_TEXT = "I request and authorize FIRST MEDICAL ASSOCIATES to release my healthcare information to the person/practice listed above.";
export const SENSITIVE_AUTHORIZATIONS = {
  releaseStdHiv: "I authorize the release of my STD, HIV/AIDS results, whether they are negative or positive, to the person/practice listed above.",
  releaseMentalHealth: "I authorize the release of any records regarding drug, alcohol, or mental health treatment to the person/practice listed above.",
};
export const STD_DEFINITION = "Definition: Sexually Transmitted Diseases (STD) as defined by law, RCW 70.24 et seq, including herpes, herpes simplex, human papillomavirus, wart, genital wart, condyloma, Chlamydia, nonspecific urethritis, syphilis, VDRL, lymphogranuloma venereum, HIV, AIDS & gonorrhea.";
export const EXPIRATION_TEXT = "If younger than 18, parent/guardian must sign. This authorization expires one year after it is signed and may be revoked by patient at any time.";
export const ELECTRONIC_SIGNATURE_TEXT = "By checking this box and typing my full name, I intend to electronically sign this authorization. I confirm that I am the patient or the patient's parent/legal guardian and authorize First Medical Associates to process this request.";
export const FORM_VERSION = "FMA-MR-release-4.18.23-web-v1";

export function medicalRecordsDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function medicalRecordsDeliveryReady(env = process.env) {
  return env.MEDICAL_RECORDS_VENDOR_REVIEWED === "true"
    && emailDeliveryConfigured(env);
}

const textFields = {
  patientName: ["Patient name", 80, true],
  dateOfBirth: ["Date of birth", 10, true],
  recipientName: ["Practice/physician's name", 120, true],
  recipientPhone: ["Practice phone", 40, false],
  recipientFax: ["Practice fax", 40, false],
  recipientAddress: ["Practice address", 160, true],
  recipientCity: ["Practice city", 80, true],
  recipientState: ["Practice state", 60, true],
  recipientZip: ["Practice ZIP code", 20, true],
  treatmentDetails: ["Treatment, condition or dates", 600, false],
  otherDetails: ["Other records", 600, false],
  signerName: ["Signature (full name)", 80, true],
  signerRole: ["Signer relationship", 20, true],
};
const booleanFields = ["releaseAll", "releaseSpecific", "releaseOther", "releaseStdHiv", "releaseMentalHealth", "signatureConsent"];

export function validateMedicalRecordsRelease(payload, now = new Date()) {
  const errors = {};
  const data = {};
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { errors: { form: "Please complete the authorization form." } };
  for (const [name, [label, limit, required]] of Object.entries(textFields)) {
    const value = payload[name] ?? "";
    if (typeof value !== "string" || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
      errors[name] = `Please enter a valid ${label.toLowerCase()} (up to ${limit} characters).`;
      continue;
    }
    data[name] = value.trim().replace(/\s+/g, " ");
    if (required && !data[name]) errors[name] = `${label} is required.`;
  }
  for (const name of booleanFields) {
    if (payload[name] !== undefined && typeof payload[name] !== "boolean") errors[name] = "Please use the checkbox to make your selection.";
    data[name] = payload[name] === true;
  }
  const today = medicalRecordsDate(now);
  const dob = data.dateOfBirth || "";
  const parsedDob = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T12:00:00Z`) : null;
  if (!parsedDob || !Number.isFinite(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== dob || dob > today || dob < "1900-01-01") errors.dateOfBirth = "Enter a valid date of birth that is not in the future.";
  if (!data.releaseAll && !data.releaseSpecific && !data.releaseOther) errors.recordsScope = "Select at least one type of healthcare information to release.";
  if (data.releaseSpecific && !data.treatmentDetails) errors.treatmentDetails = "Describe the treatment, condition or dates to release.";
  if (data.releaseOther && !data.otherDetails) errors.otherDetails = "Describe the other records to release.";
  if (!["patient", "parent-guardian"].includes(data.signerRole)) errors.signerRole = "Select patient or parent/legal guardian.";
  if (!errors.dateOfBirth) {
    const [year, month, day] = today.split("-").map(Number);
    const [birthYear, birthMonth, birthDay] = dob.split("-").map(Number);
    const age = year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
    if (age < 18 && data.signerRole !== "parent-guardian") errors.signerRole = "A parent or legal guardian must sign for a patient younger than 18.";
  }
  if (!data.signatureConsent) errors.signatureConsent = "Please confirm your electronic signature to submit this authorization.";
  // Ignore unselected details and every unknown property, including forged recipients/dates.
  if (!data.releaseSpecific) data.treatmentDetails = "";
  if (!data.releaseOther) data.otherDetails = "";
  return Object.keys(errors).length ? { errors } : { data, errors: {} };
}
