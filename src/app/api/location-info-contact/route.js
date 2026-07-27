import { NextResponse } from "next/server";
import { getNoPhiError, hasPotentialPhi } from "../../lib/no-phi-guard";
import { checkRateLimit, getRateLimitHeaders, getRateLimitIdentity } from "../../lib/rate-limit";

export const runtime = "nodejs";

const SENDLAYER_ENDPOINT = "https://console.sendlayer.com/api/v1/email";
const CONTACT_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 8,
  requireShared: process.env.NODE_ENV === "production",
};
const MAX_FIELD_LENGTHS = {
  firstName: 80,
  lastName: 80,
  email: 160,
  phone: 40,
  message: 1000,
  locationTitle: 160,
  locationSlug: 220,
};

function cleanText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

function cleanSingleLine(value) {
  return cleanText(value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ");
}

function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseRecipientEmails(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[,;\n]/)
        .map(cleanEmail)
        .filter(isValidEmail)
    ),
  ];
}

function buildBrandedEmail({ preheader, eyebrow, title, content }) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:#eef3f8;color:#122038;font-family:Arial,Helvetica,sans-serif;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(preheader)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef3f8;">
        <tr>
          <td align="center" style="padding:32px 14px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe5f1;border-radius:24px;overflow:hidden;box-shadow:0 18px 44px rgba(15,31,87,0.10);">
              <tr>
                <td style="padding:28px 34px;background:#001662;border-bottom:5px solid #11a5cf;">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.05;font-weight:700;letter-spacing:0.02em;color:#ffffff;">
                    FIRST MEDICAL<br />ASSOCIATES
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:34px;">
                  <p style="margin:0 0 10px;color:#0f7eaa;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
                    ${escapeHtml(eyebrow)}
                  </p>
                  <h1 style="margin:0 0 22px;color:#001662;font-size:28px;line-height:1.18;letter-spacing:-0.03em;">
                    ${escapeHtml(title)}
                  </h1>
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="padding:22px 34px;background:#f4f8fc;border-top:1px solid #dbe5f1;color:#5a6880;font-size:12px;line-height:1.6;">
                  First Medical Associates &nbsp;•&nbsp;
                  <a href="tel:3012843181" style="color:#001662;text-decoration:none;font-weight:700;">301-284-3181</a>
                  &nbsp;•&nbsp;
                  <a href="https://www.drsfirst.com" style="color:#001662;text-decoration:none;font-weight:700;">DrsFirst.com</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

async function sendWithSendLayer(apiKey, message) {
  const response = await fetch(SENDLAYER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result?.MessageID) {
    const error = new Error("SendLayer rejected the email request.");
    error.status = response.status;
    throw error;
  }

  return result.MessageID;
}

export async function POST(request) {
  const rateLimit = await checkRateLimit(
    getRateLimitIdentity(request, "api-location-info-contact"),
    CONTACT_RATE_LIMIT
  );
  if (!rateLimit.ok) {
    const limiterUnavailable = rateLimit.unavailable === true;
    return NextResponse.json(
      {
        ok: false,
        error: limiterUnavailable
          ? "Contact form is temporarily unavailable. Please call the office."
          : "Too many contact requests. Please wait a moment and try again.",
      },
      {
        status: limiterUnavailable ? 503 : 429,
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const firstName = cleanSingleLine(payload?.firstName);
  const lastName = cleanSingleLine(payload?.lastName);
  const email = cleanEmail(payload?.email);
  const phone = cleanSingleLine(payload?.phone);
  const message = cleanText(payload?.message);
  const locationTitle = cleanSingleLine(payload?.locationTitle);
  const locationSlug = cleanSingleLine(payload?.locationSlug);

  if (!firstName || !lastName || !email || !phone || !message) {
    return NextResponse.json(
      { ok: false, error: "First name, last name, email, phone, and message are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email address." }, { status: 400 });
  }

  if (
    firstName.length > MAX_FIELD_LENGTHS.firstName ||
    lastName.length > MAX_FIELD_LENGTHS.lastName ||
    email.length > MAX_FIELD_LENGTHS.email ||
    phone.length > MAX_FIELD_LENGTHS.phone ||
    message.length > MAX_FIELD_LENGTHS.message ||
    locationTitle.length > MAX_FIELD_LENGTHS.locationTitle ||
    locationSlug.length > MAX_FIELD_LENGTHS.locationSlug
  ) {
    return NextResponse.json(
      { ok: false, error: "Please shorten your message and contact details." },
      { status: 400 }
    );
  }

  if (hasPotentialPhi(message)) {
    return NextResponse.json(
      { ok: false, error: getNoPhiError("the contact form") },
      { status: 400 }
    );
  }

  const sendLayerApiKey = process.env.SENDLAYER_API_KEY;
  const fromEmail = cleanEmail(process.env.SENDLAYER_FROM_EMAIL);
  const fromName = cleanSingleLine(
    process.env.SENDLAYER_FROM_NAME || "First Medical Associates"
  );
  const contactRecipientEmails = parseRecipientEmails(
    process.env.SENDLAYER_TO_EMAILS || process.env.SENDLAYER_TO_EMAIL
  );
  const vendorReviewed = process.env.CONTACT_FORM_VENDOR_REVIEWED === "true";

  if (process.env.NODE_ENV === "production" && !vendorReviewed) {
    return NextResponse.json(
      { ok: false, error: "Contact form is temporarily unavailable. Please call the office." },
      { status: 503 }
    );
  }

  if (!sendLayerApiKey || !isValidEmail(fromEmail) || contactRecipientEmails.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "production"
            ? "Contact form is temporarily unavailable. Please call the office."
            : "Contact form is not configured. Set SENDLAYER_API_KEY, SENDLAYER_FROM_EMAIL, and SENDLAYER_TO_EMAILS.",
      },
      { status: 500 }
    );
  }

  const fullName = `${firstName} ${lastName}`;
  const sourceTitle = locationTitle || "Website Contact";
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  const teamHtmlContent = buildBrandedEmail({
    preheader: `New website message from ${fullName}`,
    eyebrow: "Website Contact",
    title: `New message from ${fullName}`,
    content: `
      <p style="margin:0 0 22px;color:#5a6880;font-size:15px;line-height:1.7;">
        A new general inquiry was submitted through the First Medical Associates website.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:separate;border-spacing:0 8px;">
        <tr><td style="width:120px;color:#6b7890;font-size:13px;font-weight:700;">Source</td><td style="color:#122038;font-size:14px;">${escapeHtml(sourceTitle)}</td></tr>
        <tr><td style="color:#6b7890;font-size:13px;font-weight:700;">Page</td><td style="color:#122038;font-size:14px;">${escapeHtml(locationSlug || "/contact")}</td></tr>
        <tr><td style="color:#6b7890;font-size:13px;font-weight:700;">Name</td><td style="color:#122038;font-size:14px;">${escapeHtml(fullName)}</td></tr>
        <tr><td style="color:#6b7890;font-size:13px;font-weight:700;">Email</td><td style="color:#122038;font-size:14px;"><a href="mailto:${escapeHtml(email)}" style="color:#0f7eaa;font-weight:700;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="color:#6b7890;font-size:13px;font-weight:700;">Phone</td><td style="color:#122038;font-size:14px;">${escapeHtml(phone)}</td></tr>
      </table>
      <div style="padding:20px;border:1px solid #dbe5f1;border-radius:16px;background:#f8fbfe;">
        <p style="margin:0 0 8px;color:#001662;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">Message</p>
        <p style="margin:0;color:#34435d;font-size:15px;line-height:1.7;">${safeMessage}</p>
      </div>
    `,
  });
  const teamTextContent = [
    "New First Medical Associates website message",
    `Source: ${sourceTitle}`,
    `Page: ${locationSlug || "/contact"}`,
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    "",
    "Message:",
    message,
  ].join("\n");
  const confirmationHtmlContent = buildBrandedEmail({
    preheader: "We received your message and will follow up shortly.",
    eyebrow: "Message Received",
    title: "Thank you for contacting us",
    content: `
      <p style="margin:0 0 18px;color:#34435d;font-size:16px;line-height:1.75;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:0 0 22px;color:#34435d;font-size:16px;line-height:1.75;">
        We received your message and a member of the First Medical Associates team will review it. We typically respond within one business day.
      </p>
      <div style="margin:0 0 24px;padding:20px;border-left:4px solid #11a5cf;border-radius:12px;background:#f4f8fc;">
        <p style="margin:0 0 6px;color:#001662;font-size:15px;font-weight:800;">Need help sooner?</p>
        <p style="margin:0;color:#5a6880;font-size:14px;line-height:1.65;">
          For appointment or clinic questions, call or text
          <a href="tel:3012843181" style="color:#0f7eaa;font-weight:800;text-decoration:none;">301-284-3181</a>.
          For medical records, prescriptions, results, or care-team messages, please use the patient portal.
        </p>
      </div>
      <a href="https://www.drsfirst.com/locations" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#001662;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">
        View FMA Locations
      </a>
      <p style="margin:26px 0 0;color:#7a879d;font-size:12px;line-height:1.6;">
        This automated confirmation does not include the contents of your message for your privacy.
      </p>
    `,
  });
  const confirmationTextContent = [
    `Hi ${firstName},`,
    "",
    "We received your message. A member of the First Medical Associates team will review it, and we typically respond within one business day.",
    "",
    "For appointment or clinic questions, call or text 301-284-3181. For medical records, prescriptions, results, or care-team messages, please use the patient portal.",
    "",
    "First Medical Associates",
    "https://www.drsfirst.com",
  ].join("\n");

  try {
    await sendWithSendLayer(sendLayerApiKey, {
      From: {
        email: fromEmail,
        name: fromName,
      },
      To: contactRecipientEmails.map((recipientEmail) => ({
        email: recipientEmail,
        name: recipientEmail === "info@drsfirst.com" ? "FMA Contact Team" : "FMA Contact Archive",
      })),
      Subject: `Website contact: ${sourceTitle}`,
      ContentType: "HTML",
      HTMLContent: teamHtmlContent,
      PlainContent: teamTextContent,
      ReplyTo: [{ email, name: fullName }],
      Tags: ["website-contact", "team-notification"],
    });
  } catch (error) {
    console.error("SendLayer team notification failed", { status: error?.status || 0 });
    return NextResponse.json(
      { ok: false, error: "Unable to deliver your message right now." },
      { status: 502 }
    );
  }

  let confirmationSent = true;

  try {
    await sendWithSendLayer(sendLayerApiKey, {
      From: {
        email: fromEmail,
        name: fromName,
      },
      To: [{ email, name: fullName }],
      Subject: "We received your message | First Medical Associates",
      ContentType: "HTML",
      HTMLContent: confirmationHtmlContent,
      PlainContent: confirmationTextContent,
      ReplyTo: [{ email: fromEmail, name: fromName }],
      Tags: ["website-contact", "visitor-confirmation"],
    });
  } catch (error) {
    confirmationSent = false;
    console.error("SendLayer visitor confirmation failed", { status: error?.status || 0 });
  }

  return NextResponse.json({
    ok: true,
    confirmationSent,
  });
}
