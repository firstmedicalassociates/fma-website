import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDict, PDFDocument, PDFName, PDFString, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ELECTRONIC_SIGNATURE_TEXT, EXPIRATION_TEXT, SENSITIVE_AUTHORIZATIONS } from "./medical-records-release.mjs";
import { getMedicalRecordsForm } from "./medical-records-forms.mjs";

const textFields = {
  patientName: [136, 622, 224, 18, 80], dateOfBirth: [401, 622, 97, 18, 10],
  recipientName: [190, 567, 375, 18, 120], recipientPhone: [80, 541, 235, 18, 40], recipientFax: [346, 541, 220, 18, 40],
  recipientAddress: [89, 516, 473, 18, 160], recipientCity: [65, 490, 215, 18, 80], recipientState: [321, 490, 110, 18, 60], recipientZip: [490, 490, 75, 18, 20],
  treatmentDetails: [72, 385, 454, 18, 600], otherDetails: [112, 359, 412, 18, 600],
  signerName: [106, 195, 216, 18, 80], signatureDate: [360, 195, 146, 18, 10],
};
const checkboxes = { releaseAll: [45, 430.7], releaseSpecific: [45, 405.9], releaseOther: [46.5, 361], releaseStdHiv: [46.5, 334.5], releaseMentalHealth: [46.5, 290.7] };

export async function buildFillableMedicalRecordsPdf(originalBytes, { formType = "release" } = {}) {
  const definition = getMedicalRecordsForm(formType);
  const doc = await PDFDocument.load(originalBytes);
  const page = doc.getPages()[0];
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [name, [x, sourceY, width, height, maxLength]] of Object.entries(textFields)) {
    // The request PDF's two-line authorization shifts the remaining fields down.
    const y = sourceY - (formType === "request" && !["patientName", "dateOfBirth"].includes(name) ? 18.4 : 0);
    page.drawRectangle({ x: x - 2, y, width: width + 5, height, color: rgb(1, 1, 1) });
    const field = form.createTextField(name);
    field.setMaxLength(maxLength);
    field.acroField.dict.set(PDFName.of("TU"), PDFString.of(name.replace(/([A-Z])/g, " $1")));
    field.addToPage(page, { x, y, width, height, borderWidth: 0, backgroundColor: rgb(0.96, 0.98, 1), font });
    field.setFontSize(0);
  }
  for (const [name, [x, sourceY]] of Object.entries(checkboxes)) {
    const y = sourceY - (formType === "request" ? 18.4 : 0);
    page.drawRectangle({ x: x - 1, y: y - 1, width: 20, height: 18, color: rgb(1, 1, 1) });
    form.createCheckBox(name).addToPage(page, { x, y, width: 18, height: 15.5, borderWidth: 0.8, borderColor: rgb(0, 0, 0), backgroundColor: rgb(1, 1, 1) });
  }
  doc.setTitle(`${definition.title} Authorization - Fillable`);
  doc.setAuthor("First Medical Associates");
  form.updateFieldAppearances(font);
  return doc.save();
}

// The attachment is generated in memory. No completed form is written to disk or public storage.
export async function buildCompletedMedicalRecordsPdf(data, { reference, submittedAt, signatureDate, formType = "release" }) {
  const definition = getMedicalRecordsForm(formType);
  const [template, fontBytes] = await Promise.all([
    readFile(path.join(process.cwd(), "public", definition.pdfPath)),
    readFile(path.join(process.cwd(), "src/assets/medical-records/NotoSans-Regular.ttf")),
  ]);
  const doc = await PDFDocument.load(template);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const form = doc.getForm();
  const formatDate = value => `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`;
  const values = { ...data, dateOfBirth: formatDate(data.dateOfBirth), signatureDate: formatDate(signatureDate) };
  for (const [name, [, , width]] of Object.entries(textFields)) {
    const value = values[name] || "";
    // Keep the source page readable; the following pages retain every complete value.
    const fitsAtMinimumSize = font.widthOfTextAtSize(value, 7) <= width - 4;
    const displayValue = fitsAtMinimumSize ? value : "See details";
    const fontSize = Math.min(10, (width - 4) / (font.widthOfTextAtSize(displayValue, 1) || 1));
    const field = form.getTextField(name);
    field.setText(displayValue);
    // The template's saved size does not automatically follow the fit calculation.
    field.setFontSize(fontSize);
  }
  for (const name of Object.keys(checkboxes)) if (data[name]) form.getCheckBox(name).check();
  form.updateFieldAppearances(font);
  // Email a static signed record, keeping the blank website download interactive.
  form.flatten();
  // pdf-lib can leave references to removed widgets in /Annots. Remove those stale
  // references as well as the now-empty field tree from the static attachment.
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    for (let i = (annots?.size() || 0) - 1; i >= 0; i--) {
      const annotation = doc.context.lookup(annots.get(i));
      if (!annotation || (annotation instanceof PDFDict && annotation.get(PDFName.of("Subtype"))?.toString() === "/Widget")) annots.remove(i);
    }
    if (annots?.size() === 0) page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));

  // Preserve long values legibly and retain the explicit electronic-signature attestation.
  let page;
  let y;
  function newPage() {
    page = doc.addPage([612, 792]);
    y = 737;
    page.drawText(`${definition.title} | Submission Details`, { x: 44, y, font, size: 15, color: rgb(0, 0.11, 0.33) });
    y -= 28;
  }
  function write(label, value) {
    const size = 10;
    const lines = [];
    let line = "";
    for (const word of `${label}: ${value}`.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= 524) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > 524) { lines.push(line); line = ""; }
        line += char;
      }
    }
    if (line) lines.push(line);
    for (const text of lines) {
      if (y < 50) newPage();
      page.drawText(text, { x: 44, y, font, size });
      y -= 15;
    }
    y -= 7;
  }
  newPage();
  const details = [
    ["Reference", reference], ["Received (UTC)", submittedAt], ["Form version", definition.version],
    ...(formType === "request" ? [["Authorization", definition.authorizationText]] : []),
    ["Patient name", data.patientName], ["Date of birth", data.dateOfBirth], [definition.practiceLabel, data.recipientName],
    ["Practice phone", data.recipientPhone || "Not provided"], ["Practice fax", data.recipientFax || "Not provided"],
    ["Practice address", `${data.recipientAddress}, ${data.recipientCity}, ${data.recipientState} ${data.recipientZip}`],
    ["All healthcare information", data.releaseAll ? "Selected" : "Not selected"],
    ["Specific treatment, condition or dates", data.releaseSpecific ? data.treatmentDetails : "Not selected"],
    ["Other records", data.releaseOther ? data.otherDetails : "Not selected"],
    ["STD / HIV / AIDS permission", data.releaseStdHiv ? SENSITIVE_AUTHORIZATIONS.releaseStdHiv : "Not authorized by this checkbox"],
    ["Drug, alcohol or mental health permission", data.releaseMentalHealth ? SENSITIVE_AUTHORIZATIONS.releaseMentalHealth : "Not authorized by this checkbox"],
    ["Electronic signature", data.signerName], ["Signer relationship", data.signerRole === "patient" ? "Patient" : "Parent / legal guardian"],
    ["Date signed", signatureDate], ["Signature consent (affirmed)", ELECTRONIC_SIGNATURE_TEXT], ["Authorization terms", EXPIRATION_TEXT],
    ["Review", "This form records the submitter's stated identity and authorization. The medical records team must verify identity and authority before releasing records."],
  ];
  for (const [label, value] of details) write(label, value);
  doc.setTitle(`Completed ${definition.title} Authorization`);
  doc.setCreationDate(new Date(submittedAt));
  return Buffer.from(await doc.save());
}
