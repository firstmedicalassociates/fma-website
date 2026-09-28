import { isValidEmail } from "./practice-inquiry.mjs";
import { buildPartnershipEmails, PARTNERSHIP_RECIPIENTS, validatePartnershipInquiry } from "./partnership-inquiry.mjs";

// Inject delivery so the complete flow can be tested without sending live email.
export function createPartnershipInquiryHandler({ checkLimit, hasPotentialPhi, send, env = process.env, logError = console.error }) {
  return async function POST(request) {
    const limited = await checkLimit(request);
    if (limited) return limited;
    let payload;
    try {
      const raw = await request.text();
      if (raw.length > 16000) return Response.json({ ok: false, error: "Your inquiry is too long." }, { status: 413 });
      payload = JSON.parse(raw);
    } catch {
      return Response.json({ ok: false, error: "Please submit a valid inquiry." }, { status: 400 });
    }
    if (payload?.website) return Response.json({ ok: false, error: "Unable to accept this inquiry." }, { status: 400 });
    const { data, error } = validatePartnershipInquiry(payload);
    if (error) return Response.json({ ok: false, error }, { status: 400 });
    if (hasPotentialPhi(data.message)) {
      return Response.json({ ok: false, error: "Please share business goals only. Remove patient information, medical details, and sensitive identifiers from your message." }, { status: 400 });
    }

    const fromEmail = (env.SENDLAYER_FROM_EMAIL || "").trim().toLowerCase();
    const fromName = (env.SENDLAYER_FROM_NAME || "First Medical Associates").replace(/[\r\n]/g, " ");
    if (!env.SENDLAYER_API_KEY || !isValidEmail(fromEmail) || (env.NODE_ENV === "production" && env.CONTACT_FORM_VENDOR_REVIEWED !== "true")) {
      return Response.json({ ok: false, error: "The inquiry form is temporarily unavailable. Please email Partnerships@drsfirst.com." }, { status: 503 });
    }
    const { team, welcome } = buildPartnershipEmails(data);
    const fullName = `${data.firstName} ${data.lastName}`;
    const base = { From: { email: fromEmail, name: fromName }, ContentType: "HTML" };
    try {
      await send(env.SENDLAYER_API_KEY, {
        ...base, To: PARTNERSHIP_RECIPIENTS.map(email => ({ email, name: "FMA Partnerships" })),
        Subject: team.subject, HTMLContent: team.html, PlainContent: team.text,
        ReplyTo: [{ email: data.email, name: fullName }], Tags: ["partnership-inquiry", "team-notification"],
      });
    } catch (error) {
      logError("Partnership inquiry team notification failed", { status: error?.status || 0 });
      return Response.json({ ok: false, error: "We could not deliver your inquiry. Please try again or email Partnerships@drsfirst.com." }, { status: 502 });
    }
    let confirmationSent = true;
    try {
      await send(env.SENDLAYER_API_KEY, {
        ...base, To: [{ email: data.email, name: fullName }],
        Subject: welcome.subject, HTMLContent: welcome.html, PlainContent: welcome.text,
        ReplyTo: [{ email: PARTNERSHIP_RECIPIENTS[0], name: "FMA Partnerships" }], Tags: ["partnership-inquiry", "visitor-welcome"],
      });
    } catch (error) {
      confirmationSent = false;
      logError("Partnership inquiry welcome email failed", { status: error?.status || 0 });
    }
    return Response.json({ ok: true, confirmationSent });
  };
}
