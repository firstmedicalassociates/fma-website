import { randomUUID } from "node:crypto";
import { FORM_VERSION, MEDICAL_RECORDS_RECIPIENT, medicalRecordsDate, medicalRecordsDeliveryReady, validateMedicalRecordsRelease } from "./medical-records-release.mjs";

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" };
const unavailable = "Online submission is temporarily unavailable. Please download the fillable PDF or call our team for help.";
const json = (body, status = 200, extraHeaders = {}) => Response.json(body, { status, headers: { ...responseHeaders, ...extraHeaders } });

function isSameOrigin(request) {
  try {
    const url = new URL(request.url);
    // Next's production server may use an internal hostname in request.url.
    // The browser-controlled Origin must match the actual HTTP Host instead.
    const host = request.headers.get("host");
    if (host) url.host = host;
    return request.headers.get("origin") === url.origin;
  } catch { return false; }
}

async function readPayload(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 20000) { await reader.cancel(); throw new Error("too-large"); }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}

export function createMedicalRecordsHandler({ checkLimit, buildPdf, send, env = process.env, now = () => new Date(), uuid = randomUUID, logError = console.error }) {
  return async function POST(request) {
    if (!isSameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") return json({ ok: false, error: "Please submit the form from this website." }, 403);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ ok: false, error: "Please submit a valid form." }, 415);
    // Fail before reading patient information when the delivery service has not been configured/reviewed.
    if (!medicalRecordsDeliveryReady(env)) return json({ ok: false, error: unavailable }, 503);
    const limited = await checkLimit(request);
    if (limited) return json({ ok: false, error: limited.unavailable ? unavailable : "Too many submissions. Please wait a few minutes before trying again." }, limited.unavailable ? 503 : 429, limited.headers);
    let payload;
    try { payload = await readPayload(request); }
    catch (error) { return json({ ok: false, error: error.message === "too-large" ? "The form is too long." : "Please submit a valid form." }, error.message === "too-large" ? 413 : 400); }
    if (payload?.website) return json({ ok: false, error: "Unable to accept this submission." }, 400);
    const received = now();
    const { data, errors } = validateMedicalRecordsRelease(payload, received);
    if (!data) return json({ ok: false, error: "Please review the highlighted fields.", errors }, 400);
    const reference = uuid();
    const submittedAt = received.toISOString();
    const signatureDate = medicalRecordsDate(received);
    let stage = "pdf";
    try {
      const pdf = await buildPdf(data, { reference, submittedAt, signatureDate });
      const content = pdf.toString("base64");
      const message = {
        From: { email: env.SENDLAYER_FROM_EMAIL.trim(), name: "First Medical Associates" },
        To: [{ email: MEDICAL_RECORDS_RECIPIENT, name: "FMA Medical Records" }],
        Subject: `Medical records release authorization | ${reference}`,
        ContentType: "HTML",
        HTMLContent: `<p>A medical records release authorization has been submitted through the FMA website.</p><p>Reference: ${reference}<br>Received (UTC): ${submittedAt}<br>Form version: ${FORM_VERSION}</p><p>The completed authorization and electronic signature attestation are attached as a PDF. Verify the submitter's identity and authority before releasing records.</p>`,
        PlainContent: `A medical records release authorization has been submitted through the FMA website.\nReference: ${reference}\nReceived (UTC): ${submittedAt}\nForm version: ${FORM_VERSION}\nThe completed authorization and electronic signature attestation are attached as a PDF. Verify the submitter's identity and authority before releasing records.`,
        Attachments: [{ Content: content, Type: "application/pdf", Filename: "medical-records-release.pdf" }],
        Tags: ["medical-records-release"],
      };
      stage = "delivery";
      await send(env.SENDLAYER_API_KEY, message);
      return json({ ok: true, reference, pdf: content });
    } catch (error) {
      // Provider errors may contain the complete message or patient data. Never log them.
      const reason = error?.name === "TimeoutError" ? "timeout" : "failed";
      logError("Medical records submission failed", { reference, stage, reason });
      return json({ ok: false, error: "We could not confirm submission. Please contact our team before submitting again.", reference }, 502);
    }
  };
}
