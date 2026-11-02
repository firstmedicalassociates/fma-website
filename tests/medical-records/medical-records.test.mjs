import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { MEDICAL_RECORDS_RECIPIENT, ELECTRONIC_SIGNATURE_TEXT, medicalRecordsDate, medicalRecordsDeliveryReady, validateMedicalRecordsRelease } from "../../src/app/lib/medical-records-release.mjs";
import { createMedicalRecordsHandler } from "../../src/app/lib/medical-records-handler.mjs";
import { buildCompletedMedicalRecordsPdf } from "../../src/app/lib/medical-records-pdf.mjs";
import { sendMedicalRecordsEmail } from "../../src/app/lib/medical-records-email.mjs";

const now = new Date("2026-10-24T01:30:00Z");
const reference = "0b9d1b5e-7eaf-4e77-9a9f-5138ab628219";
const env = { NODE_ENV: "production", SENDLAYER_API_KEY: "test-key", SENDLAYER_FROM_EMAIL: "forms@example.com", MEDICAL_RECORDS_VENDOR_REVIEWED: "true", SENDLAYER_TO_EMAILS: "general@example.com,unrelated@example.com" };
const sample = { patientName: "Jordan López", dateOfBirth: "1986-06-10", recipientName: "Example Family Practice", recipientPhone: "301-555-0100", recipientFax: "301-555-0101", recipientAddress: "123 Example Street", recipientCity: "Rockville", recipientState: "MD", recipientZip: "20850", releaseAll: true, releaseSpecific: false, releaseOther: false, releaseStdHiv: false, releaseMentalHealth: false, signerName: "Jordan López", signerRole: "patient", signatureConsent: true };
const request = (payload = sample, headers = {}) => new Request("https://drsfirst.com/api/medical-records-release", { method: "POST", headers: { origin: "https://drsfirst.com", "content-type": "application/json", ...headers }, body: JSON.stringify(payload) });
function setup(overrides = {}) {
  const sent = [], logs = [];
  const handler = createMedicalRecordsHandler({ env, checkLimit: async () => null, buildPdf: async () => Buffer.from("%PDF-1.7 test"), send: async (key, message) => { assert.equal(key, "test-key"); sent.push(message); }, now: () => now, uuid: () => reference, logError: (...args) => logs.push(args), ...overrides });
  return { handler, sent, logs };
}

test("routes one PDF only to the medical records inbox; ignores forged recipients and client timestamps", async () => {
  let captured;
  const { handler, sent } = setup({ buildPdf: async (data, metadata) => { captured = { data, metadata }; return Buffer.from("%PDF-test"); } });
  const response = await handler(request({ ...sample, To: ["attacker@example.com"], recipients: ["attacker@example.com"], signatureDate: "2000-01-01", submittedAt: "2000-01-01", reference: "forged" }));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(result.reference, reference);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].To.map(item => item.email), [MEDICAL_RECORDS_RECIPIENT]);
  assert.equal(sent[0].Attachments[0].Content, result.pdf);
  assert.equal(Buffer.from(result.pdf, "base64").toString(), "%PDF-test");
  assert.equal(sent[0].Attachments[0].Type, "application/pdf");
  assert.equal(captured.metadata.signatureDate, "2026-10-23");
  assert.equal(captured.metadata.submittedAt, now.toISOString());
  assert.equal(captured.data.recipients, undefined);
  assert.equal(sent[0].Cc, undefined);
  assert.equal(sent[0].Bcc, undefined);
  for (const value of [sample.patientName, sample.dateOfBirth, sample.recipientName, sample.signerName]) {
    assert.ok(!sent[0].Subject.includes(value));
    assert.ok(!sent[0].HTMLContent.includes(value));
    assert.ok(!sent[0].PlainContent.includes(value));
  }
});

test("keeps sensitive-record permissions separate, unchecked by default; drops unselected free text", () => {
  const { data, errors } = validateMedicalRecordsRelease({ ...sample, treatmentDetails: "Do not send", otherDetails: "Do not send", releaseStdHiv: true }, now);
  assert.deepEqual(errors, {});
  assert.equal(data.releaseStdHiv, true);
  assert.equal(data.releaseMentalHealth, false);
  assert.equal(data.treatmentDetails, "");
  assert.equal(data.otherDetails, "");
  const specific = validateMedicalRecordsRelease({ ...sample, releaseAll: false, releaseSpecific: true, releaseOther: true, treatmentDetails: "Visits in 2025", otherDetails: "Immunizations" }, now);
  assert.ok(specific.data);
});

test("validates required fields, scope, conditional details, explicit signature consent and field types", async () => {
  const { handler, sent } = setup();
  for (const payload of [null, [], { ...sample, patientName: " " }, { ...sample, recipientAddress: "" }, { ...sample, patientName: {} }, { ...sample, recipientName: "x".repeat(121) }, { ...sample, releaseAll: false }, { ...sample, releaseSpecific: true }, { ...sample, releaseOther: true }, { ...sample, signatureConsent: false }, { ...sample, signatureConsent: "true" }, { ...sample, releaseStdHiv: "false" }, { ...sample, signerRole: "forged" }, { ...sample, website: "spam" }]) assert.equal((await handler(request(payload))).status, 400);
  assert.equal(sent.length, 0);
});

test("rejects impossible/future birthdates and requires a guardian until the patient's eighteenth birthday", () => {
  for (const dateOfBirth of ["2025-02-30", "2026-10-24", "2030-01-01", "not a date"]) assert.ok(validateMedicalRecordsRelease({ ...sample, dateOfBirth }, now).errors.dateOfBirth);
  assert.ok(validateMedicalRecordsRelease({ ...sample, dateOfBirth: "2008-10-24" }, now).errors.signerRole);
  assert.ok(validateMedicalRecordsRelease({ ...sample, dateOfBirth: "2008-10-23" }, now).data);
  assert.ok(validateMedicalRecordsRelease({ ...sample, dateOfBirth: "2015-01-01", signerRole: "parent-guardian", signerName: "Alex López" }, now).data);
  assert.equal(medicalRecordsDate(now), "2026-10-23");
});

test("contact-form approval alone never enables patient-information delivery; disabled handler does not read the body", async () => {
  assert.equal(medicalRecordsDeliveryReady({ ...env, MEDICAL_RECORDS_VENDOR_REVIEWED: "false", CONTACT_FORM_VENDOR_REVIEWED: "true" }), false);
  for (const config of [{ ...env, MEDICAL_RECORDS_VENDOR_REVIEWED: "false" }, { ...env, SENDLAYER_API_KEY: "" }, { ...env, SENDLAYER_FROM_EMAIL: "bad" }]) {
    const { handler, sent } = setup({ env: config });
    const req = request();
    assert.equal((await handler(req)).status, 503);
    assert.equal(req.bodyUsed, false);
    assert.equal(sent.length, 0);
  }
});

test("rejects cross-origin/missing origins and non-JSON requests without delivery", async () => {
  const { handler, sent } = setup();
  for (const headers of [{ origin: "https://evil.example" }, { origin: "null" }, { "sec-fetch-site": "cross-site" }]) assert.equal((await handler(request(sample, headers))).status, 403);
  const missingOrigin = request(); missingOrigin.headers.delete("origin");
  assert.equal((await handler(missingOrigin)).status, 403);
  assert.equal((await handler(request(sample, { "content-type": "text/plain" }))).status, 415);
  assert.equal(sent.length, 0);
});

test("checks the public Host when Next uses an internal request URL in production", async () => {
  const { handler, sent } = setup();
  const proxied = new Request("https://internal-server/api/medical-records-release", { method: "POST", headers: { origin: "https://drsfirst.com", host: "drsfirst.com", "content-type": "application/json" }, body: JSON.stringify(sample) });
  assert.equal((await handler(proxied)).status, 200);
  const hostile = new Request("https://internal-server/api/medical-records-release", { method: "POST", headers: { origin: "https://internal-server", host: "drsfirst.com", "content-type": "application/json" }, body: JSON.stringify(sample) });
  assert.equal((await handler(hostile)).status, 403);
  assert.equal(sent.length, 1);
});

test("bounds request bodies and rejects malformed JSON before generating any PDF", async () => {
  const { handler, sent } = setup({ buildPdf: async () => { assert.fail("Must not build a PDF"); } });
  assert.equal((await handler(request({ extra: "x".repeat(21000) }))).status, 413);
  const malformed = new Request("https://drsfirst.com/api/medical-records-release", { method: "POST", headers: { origin: "https://drsfirst.com", "content-type": "application/json" }, body: "{" });
  assert.equal((await handler(malformed)).status, 400);
  assert.equal(sent.length, 0);
});

test("rate limits fail closed and preserve retry/security headers", async () => {
  for (const unavailable of [false, true]) {
    const { handler, sent } = setup({ checkLimit: async () => ({ unavailable, headers: { "Retry-After": "60" } }) });
    const response = await handler(request());
    assert.equal(response.status, unavailable ? 503 : 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(sent.length, 0);
  }
});

test("PDF/delivery failures never claim success, return a patient copy, or log PHI", async () => {
  for (const failedDependency of ["send", "buildPdf"]) {
    const { handler, logs } = setup({ [failedDependency]: async () => { throw new Error(JSON.stringify(sample)); } });
    const response = await handler(request());
    const result = await response.json();
    assert.equal(response.status, 502);
    assert.equal(result.ok, false);
    assert.equal(result.pdf, undefined);
    assert.equal(result.reference, reference);
    assert.ok(!JSON.stringify(logs).includes(sample.patientName));
    assert.ok(!JSON.stringify(logs).includes(sample.dateOfBirth));
  }
});

test("SendLayer transport accepts only an acknowledged message ID and uses the documented attachment schema", async () => {
  const { handler, sent } = setup(); await handler(request());
  await sendMedicalRecordsEmail("test-key", sent[0], async (url, options) => {
    assert.equal(url, "https://console.sendlayer.com/api/v1/email");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(Object.keys(JSON.parse(options.body).Attachments[0]).sort(), ["Content", "Filename", "Type"]);
    return Response.json({ MessageID: "accepted-message-id" });
  });
  for (const response of [Response.json({}, { status: 200 }), Response.json({ MessageID: "" }), Response.json({ MessageID: "id" }, { status: 500 }), new Response("invalid", { status: 502 })]) await assert.rejects(sendMedicalRecordsEmail("test", sent[0], async () => response));
});

test("blank PDF keeps all canonical fields and page widgets; completed PDF is static with a full signature audit record", async () => {
  const template = await readFile("public/wp-content/uploads/2023/04/FMA-MR-release-4.18.23.pdf");
  const blank = await PDFDocument.load(template);
  const form = blank.getForm();
  assert.equal(form.getFields().length, 18);
  assert.equal(blank.getPages()[0].node.Annots().size(), 18);
  for (const name of ["releaseAll", "releaseSpecific", "releaseOther", "releaseStdHiv", "releaseMentalHealth"]) assert.equal(form.getCheckBox(name).isChecked(), false);
  for (const name of ["patientName", "dateOfBirth", "signerName", "signatureDate"]) assert.equal(form.getTextField(name).getText(), undefined);
  const data = validateMedicalRecordsRelease({ ...sample, releaseSpecific: true, treatmentDetails: "A long description of visits, treatments and dates. ".repeat(11), releaseStdHiv: true }, now).data;
  const pdf = await buildCompletedMedicalRecordsPdf(data, { reference, submittedAt: now.toISOString(), signatureDate: "2026-10-23" });
  const completed = await PDFDocument.load(pdf);
  assert.equal(completed.getForm().getFields().length, 0);
  for (const page of completed.getPages()) {
    for (const ref of page.node.Annots()?.asArray() || []) assert.notEqual(completed.context.lookup(ref, PDFDict).get(PDFName.of("Subtype"))?.toString(), "/Widget");
  }
  assert.ok(completed.getPageCount() >= 2);
  assert.equal((await PDFDocument.load(template)).getForm().getFields().length, 18);
  await mkdir("output/playwright", { recursive: true });
  await writeFile("output/playwright/medical-records-completed-test.pdf", pdf);
  // Used by the independent pypdf extraction/rendering check.
  await writeFile("output/playwright/medical-records-expected-test.json", JSON.stringify({ patientName: sample.patientName, treatmentDetails: data.treatmentDetails, consent: ELECTRONIC_SIGNATURE_TEXT, reference }));
});
