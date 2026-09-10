export const PRACTICE_OPTIONS = {
  role: ["Practice owner / physician owner", "Practice administrator", "Authorized advisor / broker", "Other"],
  specialty: ["Family medicine", "Internal medicine", "Primary care / multispecialty", "Other"],
  providerCount: ["1", "2–5", "6–10", "11+"],
  goal: ["Explore selling my practice", "Plan for retirement", "Continue practicing with support", "Explore partnership options", "Just starting to explore"],
  timeline: ["As soon as practical", "Within 6 months", "6–12 months", "More than a year", "Just exploring"],
  preferredContact: ["Email", "Phone"],
};

const LIMITS = { firstName: 80, lastName: 80, email: 160, phone: 40, practiceName: 160, city: 100, state: 60, role: 80, specialty: 80, providerCount: 20, goal: 80, timeline: 60, preferredContact: 20, message: 1000 };
const REQUIRED = ["firstName", "lastName", "email", "phone", "practiceName", "city", "state", "role", "specialty", "goal"];
const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
export const isValidEmail = (value) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
export const parseRecipients = (value) => [...new Set(String(value || "").split(/[,;\n]/).map(value => value.trim().toLowerCase()).filter(isValidEmail))];

export function validatePracticeInquiry(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "Please provide your practice and contact details." };
  const data = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    if (payload[key] != null && typeof payload[key] !== "string") return { error: "Please check your contact and practice details." };
    const value = (payload[key] || "").trim();
    if (value.length > max) return { error: "Please shorten your contact details or message." };
    data[key] = key === "message" ? value : value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ");
  }
  data.email = data.email.toLowerCase();
  if (REQUIRED.some(key => !data[key])) return { error: "Please complete all required fields." };
  if (!isValidEmail(data.email)) return { error: "Please provide a valid email address." };
  if (!/^[+\d\s().x-]+$/i.test(data.phone) || data.phone.replace(/\D/g, "").length < 10) return { error: "Please provide a valid phone number, including area code." };
  for (const [key, values] of Object.entries(PRACTICE_OPTIONS)) {
    if (data[key] && !values.includes(data[key])) return { error: "Please choose one of the listed options." };
  }
  if (payload.consent !== true) return { error: "Please confirm that FMA may contact you about your inquiry." };
  data.attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = payload.attribution?.[key];
    if (typeof value === "string") data.attribution[key] = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200);
  }
  return { data };
}

function emailFrame({ title, preheader, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;padding:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#34435d;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe5f1;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:26px 30px;background:#001c55;border-bottom:5px solid #418fca;"><div style="font-family:Georgia,'Times New Roman',serif;color:#ffffff;font-size:22px;line-height:1.1;font-weight:700;">FIRST MEDICAL<br>ASSOCIATES</div></td></tr>
  <tr><td style="padding:32px 30px;"><p style="margin:0 0 14px;font-size:11px;letter-spacing:2px;font-weight:700;color:#0b4f96;text-transform:uppercase;">Practice transitions &amp; partnerships</p>
  <h1 style="margin:0 0 24px;color:#001c55;font-size:30px;line-height:1.2;letter-spacing:-.6px;">${escapeHtml(title)}</h1>${body}</td></tr>
  <tr><td style="padding:22px 30px;background:#f4f8fc;border-top:1px solid #dbe5f1;font-size:12px;line-height:1.7;color:#53647a;"><strong style="color:#001c55;">First Medical Associates</strong><br>Patient-first primary care in Maryland &amp; Northern Virginia<br><a href="https://drsfirst.com/about/" style="color:#0b4f96;">About FMA</a> &nbsp; | &nbsp; <a href="https://drsfirst.com/privacy-policy/" style="color:#0b4f96;">Privacy Policy</a></td></tr>
  </table></td></tr></table></body></html>`;
}
const paragraphStyle = "margin:0 0 20px;font-size:16px;line-height:1.75;color:#34435d;";

export function buildPracticeEmails(data) {
  const fullName = `${data.firstName} ${data.lastName}`;
  const fields = [
    ["Name", fullName], ["Email", data.email], ["Phone", data.phone], ["Role", data.role],
    ["Practice", data.practiceName], ["City", data.city], ["State / region", data.state], ["Specialty", data.specialty],
    ["Providers", data.providerCount || "Not specified"], ["Goal", data.goal], ["Timing", data.timeline || "Not specified"],
    ["Preferred contact", data.preferredContact || "Not specified"], ["Source page", "/sell-your-practice/"],
    ["Contact consent", "Yes, for this practice inquiry"], ...Object.entries(data.attribution || {}),
  ];
  const team = {
    subject: "New practice transition inquiry | FMA",
    html: emailFrame({ title: "A practice owner is ready to connect.", preheader: "New inquiry from the FMA practice transition landing page.", body: `<p style="${paragraphStyle}">A new practice transition inquiry has been submitted. Please review the details and follow up using the contact information below.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">${fields.map(([label, value]) => `<tr><td width="38%" style="vertical-align:top;padding:10px 8px 10px 0;border-bottom:1px solid #e5edf5;color:#53647a;font-size:13px;">${escapeHtml(label)}</td><td style="vertical-align:top;padding:10px 0;border-bottom:1px solid #e5edf5;font-size:14px;color:#18355a;overflow-wrap:anywhere;">${escapeHtml(value)}</td></tr>`).join("")}</table><h2 style="font-size:17px;color:#001c55;margin:26px 0 10px;">Additional context</h2><p style="${paragraphStyle}">${escapeHtml(data.message || "No additional message provided.").replace(/\n/g, "<br>")}</p>` }),
    text: ["New FMA practice transition inquiry", ...fields.map(([key, value]) => `${key}: ${value}`), "", "Additional context:", data.message || "No additional message provided."].join("\n"),
  };
  const welcome = {
    subject: "Your next chapter starts here | First Medical Associates",
    html: emailFrame({ title: "Thank you for starting the conversation.", preheader: "We received your practice inquiry. We look forward to learning what matters to you.", body: `
      <p style="${paragraphStyle}">Dear ${escapeHtml(data.firstName)},</p>
      <p style="${paragraphStyle}">Thank you for considering First Medical Associates as a potential partner for your practice. We appreciate the care, commitment, and relationships that go into building a practice, and the thought that goes into deciding what comes next.</p>
      <p style="${paragraphStyle}">Your inquiry has been received. Our team will review your introduction and follow up to learn more about your goals, your preferred timing, and what a potential transition could look like.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 26px;background:#f0f5fc;border-left:4px solid #418fca;"><tr><td style="padding:22px;"><h2 style="margin:0 0 12px;color:#001c55;font-size:18px;">A thoughtful first step</h2><p style="margin:0;color:#34435d;font-size:15px;line-height:1.75;">Our first conversation is an opportunity to listen, answer your questions, and explore whether our goals align. There is no need to send financial statements or patient information at this stage.</p></td></tr></table>
      <p style="${paragraphStyle}">Whether you are looking ahead to retirement, hoping to keep practicing with support, or simply exploring your options, we look forward to getting to know you.</p>
      <a href="https://drsfirst.com/about/" style="display:inline-block;padding:15px 24px;background:#001c55;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">Get to know FMA</a>
      <p style="margin:28px 0 0;font-size:15px;line-height:1.7;color:#34435d;">Warm regards,<br><strong style="color:#001c55;">The First Medical Associates Team</strong></p>
      <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#53647a;">You received this email because you submitted a practice inquiry to FMA. For your privacy, we have not included your practice details or message in this confirmation.</p>` }),
    text: [`Dear ${data.firstName},`, "", "Thank you for considering First Medical Associates as a potential partner for your practice. We appreciate the care, commitment, and relationships that go into building a practice, and the thought that goes into deciding what comes next.", "", "Your inquiry has been received. Our team will review your introduction and follow up to learn more about your goals, your preferred timing, and what a potential transition could look like.", "", "Our first conversation is an opportunity to listen, answer your questions, and explore whether our goals align. There is no need to send financial statements or patient information at this stage.", "", "Whether you are looking ahead to retirement, hoping to keep practicing with support, or simply exploring your options, we look forward to getting to know you.", "", "Get to know FMA: https://drsfirst.com/about/", "", "Warm regards,", "The First Medical Associates Team", "", "You received this email because you submitted a practice inquiry to FMA. For your privacy, your practice details and message are not included."].join("\n"),
  };
  return { team, welcome };
}
