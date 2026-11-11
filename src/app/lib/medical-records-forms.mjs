import { AUTHORIZATION_TEXT, FORM_VERSION, MEDICAL_RECORDS_PDF_PATH } from "./medical-records-release.mjs";

// Selected by the page/route, never by submitted form data.
const forms = {
  release: {
    id: "medical-records-release",
    title: "Medical Records Release",
    authorizationText: AUTHORIZATION_TEXT,
    practiceHeading: "Where should we send your records?",
    practiceLabel: "Receiving practice/physician",
    description: "Tell us where to send your records, choose what to release, and sign below.",
    subject: "Medical records release authorization",
    version: FORM_VERSION,
    pdfPath: MEDICAL_RECORDS_PDF_PATH,
  },
  request: {
    id: "medical-records-request",
    title: "Medical Records Request",
    authorizationText: "I request and authorize the physician/practice below to release my healthcare information to First Medical Associates.",
    practiceHeading: "Which practice should send your records to FMA?",
    practiceLabel: "Practice/physician providing records to FMA",
    description: "Tell us which practice has your records, choose what to request, and sign below. Your authorization allows that practice to send your records to First Medical Associates.",
    subject: "Medical records request authorization",
    version: "FMA-MR-request-4.18.23-web-v1",
    pdfPath: "/wp-content/uploads/2023/04/FMA-MR-request-4.18.23.pdf",
  },
};

export function getMedicalRecordsForm(type = "release") {
  if (!Object.hasOwn(forms, type)) throw new Error("Unknown medical records form.");
  return forms[type];
}

export function isMedicalRecordsPage(pathname = "") {
  const normalized = pathname.replace(/\/+$/, "");
  return Object.values(forms).some(form => normalized === `/patient-resources/${form.id}`);
}
