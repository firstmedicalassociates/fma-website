export const SERVICE_SELECT = {
  id: true,
  slug: true,
  category: true,
  title: true,
  description: true,
  icon: true,
  pageContent: true,
  isActive: true,
  updatedAt: true,
  createdAt: true,
};

const SERVICE_ICON_VALUES = [
  "medical_services",
  "health_and_safety",
  "local_hospital",
  "emergency",
  "healing",
  "monitor_heart",
  "favorite",
  "bloodtype",
  "vaccines",
  "medication",
  "science",
  "biotech",
  "description",
  "timeline",
  "psychology",
  "dermatology",
  "air",
  "sick",
  "mood",
  "man",
  "woman",
  "male",
  "female",
  "pregnant_woman",
  "child_care",
  "groups",
  "person",
  "person_search",
  "badge",
  "location_on",
  "pin_drop",
  "map",
  "home",
  "calendar_month",
  "event_available",
  "schedule",
  "videocam",
  "video_call",
  "phone",
  "call",
  "chat",
  "forum",
  "mail",
  "search",
  "check_circle",
  "verified",
  "shield",
  "info",
  "star",
  "bolt",
  "accessible",
  "visibility",
];

function formatServiceIconLabel(value) {
  return value
    .split("_")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ""))
    .join(" ")
    .trim();
}

export const SERVICE_ICON_OPTIONS = SERVICE_ICON_VALUES.map((value) => ({
  value,
  label: formatServiceIconLabel(value),
}));

const LEGACY_ICON_ALIASES = {
  monitoring: "monitor_heart",
  gastroenterology: "medical_services",
  elderly: "groups",
  lab_research: "science",
  clinical_notes: "description",
  vaccination: "vaccines",
  dental_services: "medical_services",
  accessibility_new: "accessible",
};

const DEFAULT_FEATURES = [
  {
    title: "Connected Care",
    description:
      "Our providers share records electronically for faster treatment decisions and smoother follow-up.",
  },
  {
    title: "Local Access",
    description: "Quick referrals to specialists and hospital care when you need additional support.",
  },
  {
    title: "Convenient Appointments",
    description: "Same-day and next-day options available across First Medical Associates locations.",
  },
  {
    title: "Always Here for You",
    description: "On-call coverage helps make sure your questions are addressed after office hours.",
  },
];

const DEFAULT_INFO_PARAGRAPHS = [
  "Our care teams coordinate treatment through connected records and consistent follow-up across locations.",
  "We prioritize respectful, patient-centered care and fast access to specialists when needed.",
  "Same-day and next-day appointment availability helps you get care when concerns come up.",
];

const DEFAULT_COMMITMENT_ITEMS = [
  "Patient-centered care",
  "Respect and compassion",
  "High quality, coordinated care",
  "Better health, together",
];

const DEFAULT_DETAIL_PARAGRAPHS = [
  "Primary care physicians help manage routine wellness, preventive care, and common health concerns.",
  "Your provider can coordinate next steps, including additional testing, referrals, and long-term care plans.",
];

const DEFAULT_FAQ_ITEMS = [
  {
    question: "How does preventive care work?",
    answer:
      "Preventive visits help identify risks early through screenings, routine checkups, and personalized guidance.",
  },
  {
    question: "What if my provider recommends specialty care?",
    answer:
      "Your care team can coordinate referrals and share records with specialists to keep treatment aligned.",
  },
  {
    question: "Which services are available for this condition?",
    answer:
      "Available services vary by location and condition severity; your provider will recommend the right plan.",
  },
];

const DEFAULT_PAGE_CONTENT = {
  eyebrow: "Primary Care",
  heroSubtitle: "Your Partner in Lifelong Health",
  heroDescription:
    "Choosing a primary care physician for you and your family is an important decision. Your primary care provider is often your physician partner throughout life's health journey.",
  features: DEFAULT_FEATURES,
  infoParagraphs: DEFAULT_INFO_PARAGRAPHS,
  commitmentTitle: "Our Commitment to You",
  commitmentItems: DEFAULT_COMMITMENT_ITEMS,
  detailHeading: "What is Primary Care?",
  detailParagraphs: DEFAULT_DETAIL_PARAGRAPHS,
  detailLinkLabel: "Find a Primary Care Doctor",
  detailLinkHref: "/providers",
  faqItems: DEFAULT_FAQ_ITEMS,
  ctaTitle: "Ready to Take the Next Step?",
  ctaDescription:
    "Our team is here to help you and your family stay healthier with consistent, connected care.",
};

function cleanText(value = "") {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  const normalized = cleanText(value);
  return normalized || null;
}

function normalizeRequiredText(value) {
  return cleanText(value);
}

function normalizeList(values, fallback = []) {
  if (!Array.isArray(values)) return fallback;
  const items = values.map((value) => cleanText(value)).filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function normalizeFeatureList(values) {
  if (!Array.isArray(values)) return DEFAULT_FEATURES;

  const items = values
    .map((value) => ({
      title: cleanText(value?.title),
      description: cleanText(value?.description),
    }))
    .filter((value) => value.title && value.description);

  return items.length > 0 ? items : DEFAULT_FEATURES;
}

function normalizeFaqList(values) {
  if (!Array.isArray(values)) return DEFAULT_FAQ_ITEMS;

  const items = values
    .map((value) => ({
      question: cleanText(value?.question),
      answer: cleanText(value?.answer),
    }))
    .filter((value) => value.question && value.answer);

  return items.length > 0 ? items : DEFAULT_FAQ_ITEMS;
}

function sanitizeRelativeLink(value) {
  const normalized = cleanText(value);
  if (!normalized) return DEFAULT_PAGE_CONTENT.detailLinkHref;
  if (!normalized.startsWith("/")) return DEFAULT_PAGE_CONTENT.detailLinkHref;
  return normalized;
}

export function normalizeServiceIcon(value) {
  const normalized = cleanText(value);
  if (!normalized) return "medical_services";

  const key = normalized.toLowerCase();
  return LEGACY_ICON_ALIASES[key] || normalized;
}

export function normalizeServiceSlug(value) {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized;
}

export function normalizeServicePageContent(content = {}) {
  const source = content && typeof content === "object" ? content : {};

  return {
    eyebrow: normalizeText(source.eyebrow) || DEFAULT_PAGE_CONTENT.eyebrow,
    heroSubtitle: normalizeText(source.heroSubtitle) || DEFAULT_PAGE_CONTENT.heroSubtitle,
    heroDescription: normalizeText(source.heroDescription) || DEFAULT_PAGE_CONTENT.heroDescription,
    features: normalizeFeatureList(source.features),
    infoParagraphs: normalizeList(source.infoParagraphs, DEFAULT_PAGE_CONTENT.infoParagraphs),
    commitmentTitle: normalizeText(source.commitmentTitle) || DEFAULT_PAGE_CONTENT.commitmentTitle,
    commitmentItems: normalizeList(source.commitmentItems, DEFAULT_PAGE_CONTENT.commitmentItems),
    detailHeading: normalizeText(source.detailHeading) || DEFAULT_PAGE_CONTENT.detailHeading,
    detailParagraphs: normalizeList(source.detailParagraphs, DEFAULT_PAGE_CONTENT.detailParagraphs),
    detailLinkLabel: normalizeText(source.detailLinkLabel) || DEFAULT_PAGE_CONTENT.detailLinkLabel,
    detailLinkHref: sanitizeRelativeLink(source.detailLinkHref),
    faqItems: normalizeFaqList(source.faqItems),
    ctaTitle: normalizeText(source.ctaTitle) || DEFAULT_PAGE_CONTENT.ctaTitle,
    ctaDescription: normalizeText(source.ctaDescription) || DEFAULT_PAGE_CONTENT.ctaDescription,
  };
}

export function normalizeServicePayload(input = {}) {
  const title = normalizeRequiredText(input.title);
  const slug = normalizeServiceSlug(input.slug || title);

  return {
    category: normalizeText(input.category) || "General Care",
    slug: slug || "service",
    title,
    description: normalizeRequiredText(input.description),
    icon: normalizeServiceIcon(input.icon),
    pageContent: normalizeServicePageContent(input.pageContent),
    isActive: input.isActive ?? true,
  };
}

export function normalizeServiceIds(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

export function formatServiceLabel(service) {
  if (!service) return "";

  const category = cleanText(service.category);
  const title = cleanText(service.title);

  return category ? `${category}: ${title}` : title;
}

export function resolveServiceTitles(serviceIds = [], serviceTitleById = {}) {
  return normalizeServiceIds(serviceIds).map((serviceId) => serviceTitleById[serviceId] || serviceId);
}
