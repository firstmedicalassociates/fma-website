export const SERVICE_SELECT = {
  id: true,
  category: true,
  title: true,
  description: true,
  isActive: true,
  updatedAt: true,
  createdAt: true,
};

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeRequiredText(value) {
  return String(value ?? "").trim();
}

export function normalizeServicePayload(input = {}) {
  return {
    category: normalizeText(input.category) || "General Care",
    title: normalizeRequiredText(input.title),
    description: normalizeRequiredText(input.description),
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
