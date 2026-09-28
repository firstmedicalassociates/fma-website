import { emailFrame, escapeHtml, isValidEmail, paragraphStyle } from "./practice-inquiry.mjs";
import { PARTNERSHIP_LIMITS, PARTNERSHIP_TYPES } from "./partnership-options.mjs";

// These inquiries belong to the partnership team, independent of patient/practice routing.
export const PARTNERSHIP_RECIPIENTS = ["Partnerships@drsfirst.com", "citryn.contactforms@gmail.com"];
const REQUIRED = ["firstName", "lastName", "email", "phone", "organization", "partnershipType", "message"];

export function validatePartnershipInquiry(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Please provide your organization and contact details." };
  }
  const data = {};
  for (const [key, max] of Object.entries(PARTNERSHIP_LIMITS)) {
    if (payload[key] != null && typeof payload[key] !== "string") {
      return { error: "Please check your contact and organization details." };
    }
    const value = (payload[key] || "").trim();
    if (value.length > max) return { error: "Please shorten your contact details or message." };
    data[key] = key === "message" ? value : value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ");
  }
  data.email = data.email.toLowerCase();
  if (REQUIRED.some(key => !data[key])) return { error: "Please complete all required fields." };
  if (!isValidEmail(data.email)) return { error: "Please provide a valid email address." };
  if (!/^[+\d\s().x-]+$/i.test(data.phone) || data.phone.replace(/\D/g, "").length < 10) {
    return { error: "Please provide a valid phone number, including area code." };
  }
  if (!PARTNERSHIP_TYPES.includes(data.partnershipType)) return { error: "Please choose one of the listed partnership types." };
  if (payload.consent !== true) return { error: "Please confirm that FMA may contact you about your partnership inquiry." };
  return { data };
}

export function buildPartnershipEmails(data) {
  const fields = [
    ["Name", `${data.firstName} ${data.lastName}`],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Organization", data.organization],
    ["Role / title", data.role || "Not specified"],
    ["Partnership type", data.partnershipType],
    ["Source page", "/partner-with-us/"],
    ["Contact consent", "Yes, for this partnership inquiry"],
  ];
  const frame = content => emailFrame({ ...content, eyebrow: "Partnerships &amp; collaboration" });
  const team = {
    subject: "New partnership inquiry | First Medical Associates",
    html: frame({
      title: "A new partnership conversation.",
      preheader: "A prospective partner has reached out to First Medical Associates.",
      body: `<p style="${paragraphStyle}">A new partnership inquiry has been submitted. Please review the introduction below and reply to the sender to continue the conversation.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">${fields.map(([label, value]) => `<tr><td width="38%" style="vertical-align:top;padding:10px 8px 10px 0;border-bottom:1px solid #e5edf5;color:#53647a;font-size:13px;">${escapeHtml(label)}</td><td style="vertical-align:top;padding:10px 0;border-bottom:1px solid #e5edf5;font-size:14px;color:#18355a;overflow-wrap:anywhere;">${escapeHtml(value)}</td></tr>`).join("")}</table>
        <h2 style="font-size:17px;color:#001c55;margin:26px 0 10px;">Partnership goals</h2>
        <p style="${paragraphStyle}overflow-wrap:anywhere;">${escapeHtml(data.message).replace(/\n/g, "<br>")}</p>`,
    }),
    text: ["New FMA partnership inquiry", ...fields.map(([label, value]) => `${label}: ${value}`), "", "Partnership goals:", data.message].join("\n"),
  };
  const introduction = "Thank you for your interest in partnering with First Medical Associates. We welcome the opportunity to connect with organizations that share our commitment to expanding access to care, improving health outcomes, and strengthening the communities we serve.";
  const nextStep = "We have received your inquiry. Our partnerships team will review your introduction and follow up to learn more about your organization, your goals, and opportunities to work together.";
  const conversation = "Every meaningful partnership starts with listening. Our first conversation is an opportunity to understand your priorities, answer your questions, and explore where our missions align.";
  const welcome = {
    subject: "Thank you for connecting with FMA | Partnership inquiry received",
    html: frame({
      title: "Better care begins with a conversation.",
      preheader: "Your partnership inquiry has been received. We look forward to learning more about your goals.",
      body: `<p style="${paragraphStyle}">Dear ${escapeHtml(data.firstName)},</p>
        <p style="${paragraphStyle}">${introduction}</p>
        <p style="${paragraphStyle}">${nextStep}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 26px;background:#f0f5fc;border-left:4px solid #418fca;"><tr><td style="padding:22px;"><h2 style="margin:0 0 12px;color:#001c55;font-size:18px;">What happens next</h2><p style="margin:0;color:#34435d;font-size:15px;line-height:1.75;">${conversation}</p></td></tr></table>
        <p style="${paragraphStyle}">If you have a general question in the meantime, simply reply to this email to reach our partnerships team.</p>
        <a href="https://drsfirst.com/about/partners/" style="display:inline-block;padding:15px 24px;background:#001c55;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">Explore our approach to partnerships</a>
        <p style="margin:28px 0 0;font-size:15px;line-height:1.7;color:#34435d;">Warm regards,<br><strong style="color:#001c55;">The Partnerships Team</strong><br>First Medical Associates</p>
        <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#53647a;">You received this email because you submitted a partnership inquiry to FMA. For your privacy, your submission details are not included in this confirmation. Please do not send patient information or medical records by email.</p>`,
    }),
    text: [`Dear ${data.firstName},`, "", introduction, "", nextStep, "", "What happens next", conversation, "", "If you have a general question in the meantime, simply reply to this email to reach our partnerships team.", "", "Explore our approach to partnerships: https://drsfirst.com/about/partners/", "", "Warm regards,", "The Partnerships Team", "First Medical Associates", "", "You received this email because you submitted a partnership inquiry to FMA. For your privacy, your submission details are not included in this confirmation. Please do not send patient information or medical records by email."].join("\n"),
  };
  return { team, welcome };
}
