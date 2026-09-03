import { prisma } from "./prisma.js";
import { VISIBLE_LOCATION_WHERE } from "./locations.js";
import { normalizeInternalPageHref } from "./config/site.js";

export const AI_SEARCH_COMMON_KNOWLEDGE_VERSION = "2026-07-23.2";

const MAIN_PHONE = "301-515-2901";
const MAIN_FAX = "866-701-4905";
const MAIN_EMAIL = "info@DrsFirst.com";
const PATIENT_PORTAL_URL = "https://4332.portal.athenahealth.com/";
const BOOKING_URL = "https://first-medical-associates.inquicker.com/";

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function locationUrl(value = "") {
  const text = String(value || "").trim();
  if (!text) return "/locations/";
  if (text.startsWith("/location/")) return normalizeInternalPageHref(text);
  return normalizeInternalPageHref(
    `/location/${text.replace(/^\/+/, "").replace(/^locations?\//, "")}`
  );
}

function buildSource(title, url, type = "page", category = null) {
  return { title, url, type, category };
}

function buildCommonResult(answer, sources, factIds = []) {
  return {
    ok: true,
    code: "verified_fma_fact",
    answer,
    confidence: 1,
    aiConfidence: "high",
    grounded: true,
    disclaimer: false,
    citations: sources.map((source) => source.title),
    sources,
    factIds,
    knowledgeVersion: AI_SEARCH_COMMON_KNOWLEDGE_VERSION,
  };
}

function formatOfficeHours(officeHours = []) {
  if (!Array.isArray(officeHours) || officeHours.length === 0) {
    return "Monday through Friday, 8:00 AM to 5:00 PM; Saturday and Sunday are closed";
  }

  const weekdays = officeHours.filter(
    (entry) => !entry?.closed && !["Saturday", "Sunday"].includes(entry?.day)
  );
  const allStandardWeekdays =
    weekdays.length === 5 &&
    weekdays.every((entry) => entry.startTime === "08:00" && entry.endTime === "17:00");
  if (allStandardWeekdays) {
    return "Monday through Friday, 8:00 AM to 5:00 PM; Saturday and Sunday are closed";
  }

  return officeHours
    .map((entry) => {
      if (!entry?.day) return "";
      if (entry.closed) return `${entry.day}: closed`;
      return `${entry.day}: ${entry.startTime || "hours not listed"}-${entry.endTime || "hours not listed"}`;
    })
    .filter(Boolean)
    .join("; ");
}

async function buildLocationFactAnswer(normalized) {
  if (
    !/\b(address|phone|telephone|call|number|hours|open|close|closed|located|directions|cigna|unitedhealthcare|united healthcare|uhc)\b/.test(
      normalized
    )
  ) {
    return null;
  }

  const locations = await prisma.location.findMany({
    where: VISIBLE_LOCATION_WHERE,
    select: {
      slug: true,
      title: true,
      address: true,
      displayAddress: true,
      addressCity: true,
      phone: true,
      officeHours: true,
    },
  });
  const matches = locations.filter((location) => {
    const candidates = [
      location.title,
      location.addressCity,
      String(location.slug || "").replace(/^\/?locations?\//, "").replace(/-/g, " "),
    ]
      .map(normalizeText)
      .filter((value) => value.length >= 3);
    return candidates.some((candidate) => normalized.includes(candidate));
  });
  if (matches.length !== 1) return null;

  const location = matches[0];
  const source = buildSource(location.title, locationUrl(location.slug), "location");
  const cigna = /\bcigna\b/.test(normalized);
  const united = /\b(unitedhealthcare|united healthcare|uhc)\b/.test(normalized);
  if (cigna || united) {
    const carrier = cigna ? "Cigna" : "UnitedHealthcare";
    return buildCommonResult(
      `The current ${location.title} page states that ${carrier} commercial plans are not accepted. Medicare and Medicaid versions are accepted. Because plan details can change, call ${location.phone || MAIN_PHONE} to verify the exact plan before the visit.`,
      [source],
      ["insurance.location-commercial-exclusions"]
    );
  }
  if (/\b(phone|telephone|call|number)\b/.test(normalized)) {
    const phone = location.phone || MAIN_PHONE;
    return buildCommonResult(
      `The ${location.title} office phone number is ${phone}.`,
      [source],
      ["location.phone"]
    );
  }
  if (/\b(address|located|directions|where)\b/.test(normalized)) {
    const address = String(location.displayAddress || location.address || "")
      .replace(/\s*\n+\s*/g, ", ")
      .trim();
    return buildCommonResult(
      `The ${location.title} office is located at ${address}.`,
      [source],
      ["location.address"]
    );
  }
  if (/\b(hours|open|close|closed)\b/.test(normalized)) {
    return buildCommonResult(
      `The ${location.title} office hours are ${formatOfficeHours(location.officeHours)}.`,
      [source],
      ["location.hours"]
    );
  }

  return null;
}

function buildSelfPayAnswer(normalized) {
  const explicitlySelfPay =
    /\b(self pay|selfpay|without insurance|uninsured|cash price|cash rate)\b/.test(normalized);
  const asksTelemedicinePrice =
    /\b(telemedicine|telehealth|virtual)\b/.test(normalized) &&
    /\b(cost|price|pricing|rate|150|180)\b/.test(normalized) &&
    !/\b(insurance|copay|deductible)\b/.test(normalized);
  if (!explicitlySelfPay && !asksTelemedicinePrice) {
    return null;
  }

  if (/\b(telemedicine|telehealth|virtual)\b/.test(normalized)) {
    return buildCommonResult(
      "The current FMA Telemedicine page lists self-pay telemedicine at $180 per consultation.",
      [buildSource("Telemedicine", "/service/telemedicine", "service", "General Services")],
      ["self-pay.telemedicine"]
    );
  }

  const source = buildSource("Insurance and Self-Pay", "/patient-resources/insurance");
  if (/\bnew patient\b/.test(normalized)) {
    return buildCommonResult(
      "The current FMA Insurance page lists self-pay at $180 per consultation; it does not publish a separate new-patient rate.",
      [source],
      ["self-pay.new-patient"]
    );
  }
  if (/\b(existing|established|returning) patient\b/.test(normalized)) {
    return buildCommonResult(
      "The current FMA Insurance page lists self-pay at $180 per consultation; it does not publish a separate existing-patient rate.",
      [source],
      ["self-pay.existing-patient"]
    );
  }
  return buildCommonResult(
    "The current FMA Insurance and Telemedicine pages list self-pay at $180 per consultation. They do not publish separate new- and existing-patient rates.",
    [
      source,
      buildSource("Telemedicine", "/service/telemedicine", "service", "General Services"),
    ],
    ["self-pay.consultation", "self-pay.telemedicine"]
  );
}

function buildHoursAnswer(normalized) {
  const asksHours =
    /\b(office|offices|clinic|clinics|location|locations)\b.{0,50}\b(hours|open|closed|close|weekends?|saturday|sunday|24 7|always open)\b/.test(
      normalized
    ) ||
    /\b(hours|open|closed|close|weekends?|saturday|sunday|24 7|always open)\b.{0,50}\b(office|offices|clinic|clinics|location|locations)\b/.test(
      normalized
    ) ||
    /\b(?:see|reach|call|contact)\b.{0,30}\b(?:a\s+)?(?:provider|doctor|fma)\b.{0,20}\b24 7\b/.test(
      normalized
    ) ||
    /\b(?:call|reach|contact|phone)\b.{0,35}\b(?:after hours|midnight|overnight)\b|\b(?:after hours|midnight|overnight)\b.{0,35}\b(?:call|reach|contact|phone)\b/.test(
      normalized
    ) ||
    /\b24 7\b/.test(normalized);
  if (!asksHours) return null;

  return buildCommonResult(
    `FMA clinic offices are open Monday through Friday, 8:00 AM to 5:00 PM, and are closed Saturday and Sunday. “Available 24/7” refers to after-hours support by phone at ${MAIN_PHONE}; it does not mean the clinics are always open or that an immediate provider visit is guaranteed.`,
    [buildSource("Locations and Hours", "/locations", "location")],
    ["hours.office", "hours.after-hours"]
  );
}

function buildInsuranceAnswer(normalized) {
  if (
    !/\b(insurance|cigna|unitedhealthcare|united healthcare|uhc|medicare|medicaid|secondary|aetna|blue choice|blue cross|carefirst|humana|johns hopkins health|kaiser|tricare|oscar|magellan|beacon)\b/.test(
      normalized
    )
  ) {
    return null;
  }
  const source = buildSource("Insurance", "/patient-resources/insurance");
  const telemedicine = /\b(telemedicine|telehealth|virtual)\b/.test(normalized);
  const cigna = /\bcigna\b/.test(normalized);
  const united = /\b(unitedhealthcare|united healthcare|uhc)\b/.test(normalized);

  if (telemedicine && (cigna || united)) {
    const carrier = cigna ? "Cigna" : "UnitedHealthcare";
    return buildCommonResult(
      `${carrier} commercial plans are not accepted for FMA telemedicine visits. Medicare or Medicaid versions of ${carrier} are accepted. Call ${MAIN_PHONE} to verify the exact plan before scheduling.`,
      [source, buildSource("Telemedicine", "/service/telemedicine", "service")],
      ["insurance.telemedicine-commercial-exclusions"]
    );
  }
  if ((cigna || united) && /\b(office|in person|general|accept|accepted|take)\b/.test(normalized)) {
    const carrier = cigna ? "Cigna" : "UnitedHealthcare";
    return buildCommonResult(
      `FMA’s current individual location pages state that ${carrier} commercial plans are not accepted, while the general insurance directory still lists ${carrier}. Because the public pages conflict, call ${MAIN_PHONE} to verify the exact plan, location, and visit type. Medicare and Medicaid versions are listed as accepted.`,
      [source],
      ["insurance.public-page-conflict", "insurance.location-commercial-exclusions"]
    );
  }
  if (/\bmedicare advantage\b/.test(normalized)) {
    return buildCommonResult(
      "Yes. FMA accepts Medicare, including Medicare Advantage plans from UnitedHealthcare, CareFirst, Johns Hopkins, and Aetna.",
      [source],
      ["insurance.medicare-advantage"]
    );
  }
  if (/\bsecondary\b/.test(normalized)) {
    return buildCommonResult(
      `The current FMA insurance page states that all secondary insurances are accepted. Call ${MAIN_PHONE} to verify coordination for your exact plans.`,
      [source],
      ["insurance.secondary"]
    );
  }
  const supportedCommercialPlans = [
    ["aetna", "Aetna"],
    ["blue choice", "Blue Choice"],
    ["blue cross", "Blue Cross Blue Shield"],
    ["carefirst", "CareFirst"],
    ["humana", "Humana"],
    ["johns hopkins health", "Johns Hopkins Health"],
  ];
  const supportedCommercialPlan = supportedCommercialPlans.find(([token]) =>
    normalized.includes(token)
  );
  if (supportedCommercialPlan) {
    return buildCommonResult(
      `The current FMA Insurance page lists ${supportedCommercialPlan[1]} as accepted. Call ${MAIN_PHONE} to verify the exact plan, location, and visit type before scheduling.`,
      [source],
      ["insurance.accepted-commercial"]
    );
  }
  const unlistedPlans = [
    ["kaiser", "Kaiser Permanente"],
    ["tricare", "TRICARE"],
    ["oscar", "Oscar Health"],
    ["magellan", "Magellan"],
    ["beacon", "Beacon Health"],
  ];
  const unlistedPlan = unlistedPlans.find(([token]) => normalized.includes(token));
  if (unlistedPlan) {
    return buildCommonResult(
      `${unlistedPlan[1]} is not listed on the current FMA accepted-insurance page. That does not prove the plan is denied, so call ${MAIN_PHONE} to verify the exact plan, location, and visit type before scheduling.`,
      [source],
      ["insurance.not-publicly-listed"]
    );
  }
  return null;
}

function buildContactAnswer(normalized) {
  const source = buildSource("Contact First Medical Associates", "/contact");
  if (/\bfax\b/.test(normalized)) {
    return buildCommonResult(`The FMA fax number is ${MAIN_FAX}.`, [source], ["contact.fax"]);
  }
  if (/\bemail\b/.test(normalized)) {
    if (!/\b(encrypted|medical|records?|fee|cost|price)\b/.test(normalized)) {
      return buildCommonResult(`The main FMA email address is ${MAIN_EMAIL}.`, [source], ["contact.email"]);
    }
  }
  if (/\b(patient portal|portal link|athena portal)\b/.test(normalized)) {
    return buildCommonResult(
      `The FMA Patient Portal is ${PATIENT_PORTAL_URL}`,
      [buildSource("Patient Portal", PATIENT_PORTAL_URL)],
      ["contact.patient-portal"]
    );
  }
  if (/\b(main|general|fma|office)\b.{0,30}\b(phone|telephone|number)\b|\bphone number\b/.test(normalized)) {
    return buildCommonResult(`The main FMA phone number is ${MAIN_PHONE}.`, [source], ["contact.phone"]);
  }
  return null;
}

function buildWalkInAnswer(normalized) {
  if (
    !(
      /\b(walk in|walk ins|walkin|walkins|walk into|walking into|without an appointment)\b/.test(normalized) ||
      /\bneed\b.{0,25}\bappointment\b.{0,35}\bsame day\b|\bsame day\b.{0,35}\bneed\b.{0,25}\bappointment\b/.test(
        normalized
      ) ||
      /\bsame day\b.{0,40}\b(guaranteed|guarantee|always available|definite|definitely)\b|\b(guaranteed|guarantee)\b.{0,40}\bsame day\b/.test(
        normalized
      ) ||
      /\b(?:two|2)\s+hours?\b.{0,30}\bnotice\b|\bnotice\b.{0,30}\b(?:two|2)\s+hours?\b/.test(
        normalized
      ) ||
      /\b(?:call|contact|notify)\b.{0,30}\b(?:two|2)\s+hours?\b.{0,40}\bsame day\b|\bsame day\b.{0,40}\b(?:call|contact|notify)\b.{0,30}\b(?:two|2)\s+hours?\b/.test(
        normalized
      )
    )
  ) {
    return null;
  }
  return buildCommonResult(
    `FMA’s current public site says same-day walk-in services are offered at most locations, while all clinics offer same-day care for non-emergency issues. Same-day and walk-in capacity are not guaranteed at every office; the same-day page asks patients to give at least two hours' notice. Call ${MAIN_PHONE} before traveling.`,
    [buildSource("Same-Day Care", "/service/same-day-care", "service", "Primary Care")],
    ["same-day.walk-in", "same-day.non-emergency"]
  );
}

function buildUrgentCareAnswer(normalized) {
  const asksEmergencyScope =
    /\b(same day|urgent care|walk in)\b.{0,50}\b(emergency|emergencies)\b/.test(normalized) ||
    /\b(emergency|emergencies)\b.{0,50}\b(same day|urgent care|walk in)\b/.test(normalized) ||
    /\burgent care (?:center|clinic)\b/.test(normalized) ||
    /\b(schedule|book|appointment|visit|clinic|office|fma)\b.{0,50}\b(emergency|emergencies)\b/.test(normalized) ||
    /\b(emergency|emergencies)\b.{0,50}\b(schedule|book|appointment|visit|clinic|office|fma)\b/.test(
      normalized
    );
  if (!asksEmergencyScope) return null;

  return buildCommonResult(
    `FMA offers same-day primary care for non-emergency illnesses and minor injuries; it is not an emergency department. For a medical emergency, call 911 or go to the nearest emergency department. For non-emergency same-day availability, call ${MAIN_PHONE}.`,
    [buildSource("Same-Day Care", "/service/same-day-care", "service", "Primary Care")],
    ["same-day.non-emergency", "safety.emergency"]
  );
}

function buildOperationalScopeAnswer(normalized) {
  if (
    /\b(treat|see|accept|schedule|book|care for|offer)\b.{0,35}\b(children|child|pediatric|pediatrics|under 18|minors?|\d{1,2} year old)\b/.test(
      normalized
    ) ||
    /\b(minimum patient age|minimum age|patient age|age requirement|pediatric care|pediatrics)\b/.test(
      normalized
    ) ||
    /\b(?:under 18|1[0-7] year old)\b.{0,35}\b(appointment|book|schedule|patient|care)\b/.test(
      normalized
    )
  ) {
    return buildCommonResult(
      `FMA’s operational scheduling rules in this site require patients to be age 18 or older. The live public site also contains general family-medicine language about caring for all ages, so do not rely on AI search to book someone under 18; call ${MAIN_PHONE} to confirm whether an appropriate provider and appointment type are available.`,
      [buildSource("Patient Scheduling Resources", "/patient-resources/patients")],
      ["scheduling.minimum-age", "scheduling.public-age-conflict"]
    );
  }
  if (
    /\b(vaccine|vaccines|vaccination|immunization|immunizations|flu shots?|tetanus boosters?)\b/.test(
      normalized
    )
  ) {
    return buildCommonResult(
      `FMA can provide routine vaccination updates during annual physicals, including flu shots and tetanus boosters. FMA does not provide specialized exotic travel vaccines such as Yellow Fever. Call ${MAIN_PHONE} to confirm availability for a specific routine vaccine.`,
      [buildSource("Annual Physicals", "/service/annual-physicals", "service", "Primary Care")],
      ["services.routine-vaccines", "services.no-exotic-travel-vaccines"]
    );
  }
  if (
    /\b(on site|onsite|in house|inhouse)\b.{0,30}\b(labs?|laborator(?:y|ies))\b|\b(labs?|laborator(?:y|ies))\b.{0,30}\b(on site|onsite|in house|inhouse)\b|\b(all|every|each)\b.{0,25}\b(office|offices|clinic|clinics|location|locations)\b.{0,25}\b(?:have|has|with)?\s*(?:an?\s+)?\b(labs?|laborator(?:y|ies))\b/.test(
      normalized
    )
  ) {
    return buildCommonResult(
      "FMA states that each facility has on-site laboratory and diagnostic tools. Call the preferred office to confirm that a specific test is available there.",
      [buildSource("Locations", "/locations", "location")],
      ["services.on-site-lab"]
    );
  }
  if (
    /\bnew patients?\b.{0,40}\b(telemedicine|telehealth|virtual)\b|\b(telemedicine|telehealth|virtual)\b.{0,40}\bnew patients?\b/.test(
      normalized
    )
  ) {
    return buildCommonResult(
      `Yes. FMA’s current public location pages state that telehealth is available to new patients. Schedule online at ${BOOKING_URL} or call ${MAIN_PHONE}; the team can confirm the appropriate new-patient appointment type.`,
      [buildSource("Telemedicine", "/service/telemedicine", "service", "General Services")],
      ["telemedicine.new-patients"]
    );
  }
  return null;
}

function buildGlpOperationalAnswer(normalized) {
  if (
    /\b(glp 1|glp1|ozempic|mounjaro|wegovy|zepbound)\b/.test(normalized) &&
    /\b(diabetes|type 2|type ii|rather than weight loss|not for weight loss)\b/.test(normalized)
  ) {
    return buildCommonResult(
      `FMA’s operational guidance says GLP-1 refills or prior authorizations are handled only when the medication is explicitly used to treat Type II Diabetes. The March 2026 policy separately says FMA does not initiate or manage long-term GLP-1 therapy for weight loss. This does not confirm a new prescription or an individual medication decision; use the patient portal or call ${MAIN_PHONE}.`,
      [
        buildSource("Patient Scheduling Resources", "/patient-resources/patients"),
        buildSource(
          "GLP-1 and Weight Loss Medications Policy",
          "https://drsfirst.com/wp-content/uploads/2026/03/Policy-Regarding-GLP-1-Weight-Loss-Medications-.docx.pdf",
          "policy"
        ),
      ],
      ["glp1.diabetes-operational-scope", "glp1.weight-loss-scope"]
    );
  }
  return null;
}

function buildOrganizationAnswer(normalized) {
  if (/\b(ceo|chief executive|chief executive officer)\b/.test(normalized)) {
    return buildCommonResult(
      `The current FMA public site does not identify a chief executive officer. Call ${MAIN_PHONE} or email ${MAIN_EMAIL} for verified organization leadership information.`,
      [buildSource("About First Medical Associates", "/about")],
      ["organization.ceo-not-published"]
    );
  }
  if (/\b(who founded|founder of|founded)\b.{0,30}\b(doctors first|first medical associates|fma)\b|\b(doctors first|first medical associates|fma)\b.{0,30}\b(founder|founded)\b/.test(normalized)) {
    return buildCommonResult(
      "Rakesh Malik, M.D., founded Doctors First in 2008; the practice later became First Medical Associates.",
      [buildSource("Rakesh Malik, M.D.", "/providers/rakesh-malik", "provider")],
      ["organization.founder"]
    );
  }
  return null;
}

export async function buildDeterministicCommonAnswer(query = "") {
  const normalized = normalizeText(query);
  if (!normalized) return null;

  return (
    buildSelfPayAnswer(normalized) ||
    (await buildLocationFactAnswer(normalized)) ||
    buildHoursAnswer(normalized) ||
    buildInsuranceAnswer(normalized) ||
    buildContactAnswer(normalized) ||
    buildUrgentCareAnswer(normalized) ||
    buildWalkInAnswer(normalized) ||
    buildGlpOperationalAnswer(normalized) ||
    buildOrganizationAnswer(normalized) ||
    buildOperationalScopeAnswer(normalized)
  );
}
