const MEDICAL_WEIGHT_LOSS_SLUG = "glp-1-medical-weight-loss-management";
const SEVERNA_PARK_SLUG = "/location/severna-park";

const SERVICE_LOCATION_RESTRICTIONS = Object.freeze({
  [MEDICAL_WEIGHT_LOSS_SLUG]: Object.freeze([SEVERNA_PARK_SLUG]),
});

function getServiceLocationSlugs(serviceSlug = "") {
  const slug = String(serviceSlug).trim().toLowerCase();
  return Object.hasOwn(SERVICE_LOCATION_RESTRICTIONS, slug)
    ? SERVICE_LOCATION_RESTRICTIONS[slug]
    : null;
}

function filterServicesForLocation(services = [], locationSlug = "") {
  const normalizedLocationSlug = String(locationSlug).trim().replace(/\/+$/, "");
  return services.filter((service) => {
    // Legacy location service entries may have a title without a global slug.
    const slug = String(service?.slug || service?.title || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const allowedLocations = getServiceLocationSlugs(slug);
    return !allowedLocations || allowedLocations.includes(normalizedLocationSlug);
  });
}

function isMedicalWeightLossServiceQuery(query = "") {
  const normalized = String(query).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!/\b(glp 1|glp1|medical weight loss|weight loss management|weight management)\b/.test(normalized)) return false;
  // Availability questions must not override medication, clinical, or insurance policies.
  if (/\b(medications?|prescribe|prescribing|prescriptions?|refills?|doses?|dosage|injections?|treatments?|prior authorizations?|insurance|coverage|appeals?|diabetes|wegovy|zepbound|ozempic|mounjaro|semaglutide|tirzepatide|side effects?|policy|policies)\b/.test(normalized)) return false;
  return /\b(offer|offers|offered|services?|where|offices?|locations?|schedule|scheduling|book|booking|appointments?|available|availability)\b/.test(normalized)
    || /^(glp 1|glp1|medical weight loss(?: management)?|weight loss management|weight management)( medical weight loss management)?$/.test(normalized);
}

module.exports = {
  MEDICAL_WEIGHT_LOSS_SLUG,
  SEVERNA_PARK_SLUG,
  getServiceLocationSlugs,
  filterServicesForLocation,
  isMedicalWeightLossServiceQuery,
};
