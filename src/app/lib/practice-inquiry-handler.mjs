import { buildPracticeEmails, isValidEmail, parseRecipients, validatePracticeInquiry } from "./practice-inquiry.mjs";

// Dependencies are supplied by the route so delivery can be exercised without sending live mail.
export function createPracticeInquiryHandler({ checkLimit, hasPotentialPhi, send, env = process.env, logError = console.error }) {
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
    const { data, error } = validatePracticeInquiry(payload);
    if (error) return Response.json({ ok: false, error }, { status: 400 });
    if (hasPotentialPhi(data.message)) return Response.json({ ok: false, error: "Please remove personal medical details, patient information, and sensitive identifiers from your message." }, { status: 400 });

    const fromEmail = (env.SENDLAYER_FROM_EMAIL || "").trim().toLowerCase();
    const fromName = (env.SENDLAYER_FROM_NAME || "First Medical Associates").replace(/[\r\n]/g, " ");
    const recipients = parseRecipients(env.SENDLAYER_PRACTICE_TO_EMAILS || env.SENDLAYER_TO_EMAILS || env.SENDLAYER_TO_EMAIL);
    if (!env.SENDLAYER_API_KEY || !isValidEmail(fromEmail) || recipients.length === 0 || (env.NODE_ENV === "production" && env.CONTACT_FORM_VENDOR_REVIEWED !== "true")) {
      return Response.json({ ok: false, error: "The inquiry form is temporarily unavailable. Please call our team." }, { status: 503 });
    }
    const { team, welcome } = buildPracticeEmails(data);
    const fullName = `${data.firstName} ${data.lastName}`;
    const base = { From: { email: fromEmail, name: fromName }, ContentType: "HTML" };
    try {
      await send(env.SENDLAYER_API_KEY, { ...base, To: recipients.map(email => ({ email, name: "FMA Practice Inquiries" })), Subject: team.subject, HTMLContent: team.html, PlainContent: team.text, ReplyTo: [{ email: data.email, name: fullName }], Tags: ["practice-inquiry", "team-notification"] });
    } catch (error) {
      logError("Practice inquiry team notification failed", { status: error?.status || 0 });
      return Response.json({ ok: false, error: "We could not deliver your inquiry. Please try again or call our team." }, { status: 502 });
    }
    let confirmationSent = true;
    try {
      await send(env.SENDLAYER_API_KEY, { ...base, To: [{ email: data.email, name: fullName }], Subject: welcome.subject, HTMLContent: welcome.html, PlainContent: welcome.text, ReplyTo: [{ email: recipients[0], name: "First Medical Associates" }], Tags: ["practice-inquiry", "visitor-welcome"] });
    } catch (error) {
      confirmationSent = false;
      logError("Practice inquiry welcome email failed", { status: error?.status || 0 });
    }
    return Response.json({ ok: true, confirmationSent });
  };
}
