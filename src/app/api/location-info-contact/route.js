import { NextResponse } from "next/server";
import { getNoPhiError, hasPotentialPhi } from "../../lib/no-phi-guard";

export const runtime = "nodejs";

const SENDLAYER_ENDPOINT = "https://console.sendlayer.com/api/v1/email";

function cleanText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "";
}

function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }

  const firstName = cleanText(payload?.firstName);
  const lastName = cleanText(payload?.lastName);
  const email = cleanEmail(payload?.email);
  const phone = cleanText(payload?.phone);
  const message = cleanText(payload?.message);
  const locationTitle = cleanText(payload?.locationTitle);
  const locationSlug = cleanText(payload?.locationSlug);

  if (!firstName || !lastName || !email || !phone || !message) {
    return NextResponse.json(
      { ok: false, error: "First name, last name, email, phone, and message are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email address." }, { status: 400 });
  }

  if (hasPotentialPhi(message)) {
    return NextResponse.json(
      { ok: false, error: getNoPhiError("the contact form") },
      { status: 400 }
    );
  }

  const sendLayerApiKey = process.env.SENDLAYER_API_KEY;
  const fromEmail = process.env.SENDLAYER_FROM_EMAIL;
  const fromName = process.env.SENDLAYER_FROM_NAME || "First Medical Associates";
  const toEmail = process.env.SENDLAYER_TO_EMAIL;

  if (!sendLayerApiKey || !fromEmail || !toEmail) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Contact form is not configured. Set SENDLAYER_API_KEY, SENDLAYER_FROM_EMAIL, and SENDLAYER_TO_EMAIL.",
      },
      { status: 500 }
    );
  }

  const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const subject = `Location info form: ${locationTitle || "Location"}`;

  const htmlContent = `
    <h2>Location Info Form Submission</h2>
    <p><strong>Location:</strong> ${locationTitle || "N/A"}</p>
    <p><strong>Location Slug:</strong> ${locationSlug || "N/A"}</p>
    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Message:</strong></p>
    <p>${safeMessage.replace(/\n/g, "<br />")}</p>
  `;

  const textContent = [
    "Location Info Form Submission",
    `Location: ${locationTitle || "N/A"}`,
    `Location Slug: ${locationSlug || "N/A"}`,
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    "Message:",
    message,
  ].join("\n");

  try {
    const response = await fetch(SENDLAYER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendLayerApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        From: {
          email: fromEmail,
          name: fromName,
        },
        To: [{
          email: toEmail,
          name: "Location Team",
        }],
        Subject: subject,
        ContentType: "HTML",
        HTMLContent: htmlContent,
        PlainContent: textContent,
        ReplyTo: [{ email, name: `${firstName} ${lastName}` }],
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.status === "error") {
      return NextResponse.json(
        { ok: false, error: "Unable to deliver your message right now." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("SendLayer request failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to deliver your message right now." },
      { status: 502 }
    );
  }
}
