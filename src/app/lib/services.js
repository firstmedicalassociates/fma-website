export const SERVICE_SELECT = {
  id: true,
  category: true,
  title: true,
  description: true,
  icon: true,
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

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeRequiredText(value) {
  return String(value ?? "").trim();
}

export function normalizeServiceIcon(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "medical_services";

  const key = normalized.toLowerCase();
  return LEGACY_ICON_ALIASES[key] || normalized;
}

export function normalizeServicePayload(input = {}) {
  return {
    category: normalizeText(input.category) || "General Care",
    title: normalizeRequiredText(input.title),
    description: normalizeRequiredText(input.description),
    icon: normalizeServiceIcon(input.icon),
    isActive: input.isActive ?? true,
  };
}

export function normalizeServiceIds(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

export function formatServiceLabel(service) {
  if (!service) return "";

  const category = String(service.category || "").trim();
  const title = String(service.title || "").trim();

  return category ? `${category}: ${title}` : title;
}

export function resolveServiceTitles(serviceIds = [], serviceTitleById = {}) {
  return normalizeServiceIds(serviceIds).map((serviceId) => serviceTitleById[serviceId] || serviceId);
}
