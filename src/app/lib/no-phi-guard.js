export const NO_PHI_NOTICE =
  "Do not include symptoms, diagnoses, medications, test results, dates of birth, insurance ID numbers, or other medical details. For medical questions, use the patient portal or call 301-515-2901.";

export const PUBLIC_SEARCH_MIN_CHARACTERS = 2;
export const PUBLIC_SEARCH_MAX_CHARACTERS = 300;

const SELF_REFERENCE_PATTERN =
  /\b(i|i'm|i am|i've|i have|me|my|mine|we|we're|we are|our|patient|my child|my son|my daughter|my wife|my husband|my mother|my father|my mom|my dad|my parent|my spouse|my partner)\b/i;

const MEDICAL_DETAIL_PATTERN =
  /\b(symptoms?|conditions?|illness|sick|diagnosed|diagnosis|test result|lab result|blood work|x-?ray|mri|ct scan|medications?|medicine|prescriptions?|refills?|dosage|dose|blood pressure|heart rate|glucose|a1c|cholesterol|pain|rash|fever|infection|uti|strep throat|sore throat|cough|covid|flu|influenza|bronchitis|sinus infection|ear infection|vomiting|diarrhea|migraine|chest pain|shortness of breath|allergic reaction|wound|injury|bleeding|dizziness|fatigue|nausea|abdominal pain|back pain|pregnant|pregnancy|depression|anxiety|suicidal|self-harm|ozempic|wegovy|mounjaro|insulin)\b/i;

const DIRECT_IDENTIFIER_PATTERNS = [
  { category: "date_of_birth", pattern: /\b(date of birth|dob|birthdate|birthday)\b/i },
  {
    category: "date_of_birth",
    pattern:
      /\b(?:born|birth(?:day|date)?|dob)\b.{0,40}\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
  },
  { category: "address", pattern: /\b(my address is|home address|i live at|patient address)\b/i },
  {
    category: "address",
    pattern:
      /\b\d{1,6}\s+[a-z0-9.' -]{2,80}\s+(?:street|st|road|rd|avenue|ave|boulevard|blvd|drive|dr|lane|ln|court|ct|circle|cir|way|place|pl|terrace|ter)\b/i,
  },
  {
    category: "geographic_identifier",
    pattern:
      /\b(?:my|our|patient|home|residential|i live in|i am in|i'm in)\b.{0,30}\b(?:zip(?: code)?|postal code)\b.{0,20}\b\d{5}(?:-\d{4})?\b/i,
  },
  { category: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/i },
  { category: "ssn", pattern: /\b(ssn|social security)\b/i },
  {
    category: "insurance_or_record_id",
    pattern: /\b(member id|insurance id|policy number|claim number|medical record number|mrn)\b/i,
  },
  { category: "account_number", pattern: /\b(account number|account #|acct number|acct #)\b/i },
  { category: "license_or_certificate", pattern: /\b(license number|license #|certificate number|certificate #)\b/i },
  { category: "vehicle_identifier", pattern: /\b(license plate|vin number|vehicle identification number)\b/i },
  { category: "device_identifier", pattern: /\b(device id|device serial|serial number)\b/i },
  { category: "device_identifier", pattern: /\b(?:sn|serial)\s*[:#-]?\s*[a-z0-9-]{6,}\b/i },
  { category: "personal_name", pattern: /\b(my name is|name is)\s+[a-z][a-z' -]{1,60}\b/i },
  { category: "email_address", pattern: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  { category: "phone_number", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/i },
  { category: "url", pattern: /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+\.[^\s]+/i },
  { category: "ip_address", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/i },
];

const HEALTH_VALUE_PATTERNS = [
  { category: "medication_dose", pattern: /\b\d+(?:\.\d+)?\s*(mg|mcg|g|units?|iu|ml|puffs?)\b/i },
  { category: "vital_or_lab_value", pattern: /\b\d{2,3}\s*\/\s*\d{2,3}\b/i },
  { category: "vital_or_lab_value", pattern: /\b(a1c|glucose|cholesterol|blood pressure|heart rate)\b.{0,40}\d/i },
  {
    category: "age_89_or_older",
    pattern:
      /\b(i am|i'm|my mother is|my father is|my parent is|my wife is|my husband is|patient is)\s+(?:89|9\d|1\d{2})\b/i,
  },
];

const RELATION_HEALTH_STATEMENT_PATTERN =
  /\b(?:my\s+(?:son|daughter|child|wife|husband|mother|father|mom|dad|parent|spouse|partner|friend)|patient)\s+(?:has|had|needs|takes|is taking|was diagnosed with|is diagnosed with)\s+([^?.!,;]{0,80})/i;
const APPOINTMENT_DETAIL_PATTERN =
  /\b(?:my|our|i|we|patient)\b.{0,40}\b(?:appointment|appt|visit|scheduled|booking)\b.{0,80}\b(?:today|tomorrow|yesterday|tonight|(?:next|this)\s+(?:week|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)|(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}|\d{1,2}(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?))\b/i;
const GENERIC_APPOINTMENT_BOOKING_REQUEST_PATTERN =
  /\b(?:can|could|may|how|where|when|do|does|is|are)\b.{0,50}\b(?:book|schedule|make|get|find|see|visit)\b.{0,60}\b(?:appointment|appt|visit|doctor|provider)\b|\b(?:i|we)\b.{0,30}\b(?:want|need|would like|can|could|may)\b.{0,40}\b(?:book|schedule|make|get)\b.{0,50}\b(?:appointment|appt|visit)\b/i;
const EXISTING_APPOINTMENT_REFERENCE_PATTERN =
  /\b(?:my|our|patient)\b.{0,20}\b(?:appointment|appt|visit|booking)\b/i;

const NAMED_HEALTH_STATEMENT_PATTERN =
  /\b([a-z][a-z' -]{1,40})\s+(?:has|had|needs|takes|is taking|was diagnosed with|is diagnosed with)\s+([^?.!,;]{0,80})/gi;

const NON_PATIENT_SUBJECT_PATTERN =
  /\b(fma|drsfirst|doctors first|first medical|medical associates|doctor|doctors|provider|providers|clinic|office|location|locations|service|services|appointment|appointments|team|staff)\b/i;

export function normalizePublicSearchQuery(value = "") {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectPatternMatches(text, entries) {
  return entries
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.category);
}

function hasThirdPartyMedicalDetail(text) {
  if (!MEDICAL_DETAIL_PATTERN.test(text)) return false;

  const relationMatch = text.match(RELATION_HEALTH_STATEMENT_PATTERN);
  if (relationMatch && MEDICAL_DETAIL_PATTERN.test(relationMatch[1] || "")) {
    return true;
  }

  NAMED_HEALTH_STATEMENT_PATTERN.lastIndex = 0;
  let match;
  while ((match = NAMED_HEALTH_STATEMENT_PATTERN.exec(text)) !== null) {
    const subject = String(match[1] || "").trim();
    const detail = String(match[2] || "");
    if (!subject || NON_PATIENT_SUBJECT_PATTERN.test(subject)) continue;
    if (MEDICAL_DETAIL_PATTERN.test(detail)) return true;
  }

  return false;
}

function hasAppointmentDetail(text) {
  if (!APPOINTMENT_DETAIL_PATTERN.test(text)) return false;

  const isGenericBookingRequest =
    GENERIC_APPOINTMENT_BOOKING_REQUEST_PATTERN.test(text) &&
    !EXISTING_APPOINTMENT_REFERENCE_PATTERN.test(text);

  return !isGenericBookingRequest;
}

export function getPhiRisk(value = "") {
  const text = normalizePublicSearchQuery(value);
  if (!text) {
    return {
      hasPotentialPhi: false,
      categories: [],
      severity: "none",
    };
  }

  const directIdentifierCategories = collectPatternMatches(text, DIRECT_IDENTIFIER_PATTERNS);
  const healthValueCategories = collectPatternMatches(text, HEALTH_VALUE_PATTERNS);
  const hasPatientSpecificMedicalDetail =
    SELF_REFERENCE_PATTERN.test(text) && MEDICAL_DETAIL_PATTERN.test(text);
  const hasNamedOrThirdPartyMedicalDetail = hasThirdPartyMedicalDetail(text);
  const hasAppointmentDetailRisk = hasAppointmentDetail(text);

  const categories = [
    ...directIdentifierCategories,
    ...healthValueCategories,
    ...(hasPatientSpecificMedicalDetail ? ["patient_specific_medical_detail"] : []),
    ...(hasNamedOrThirdPartyMedicalDetail ? ["third_party_medical_detail"] : []),
    ...(hasAppointmentDetailRisk ? ["appointment_detail"] : []),
  ];
  const uniqueCategories = [...new Set(categories)];

  return {
    hasPotentialPhi: uniqueCategories.length > 0,
    categories: uniqueCategories,
    severity:
      uniqueCategories.length === 0
        ? "none"
        : directIdentifierCategories.length > 0 || healthValueCategories.length > 0
          ? "high"
          : "medium",
  };
}

export function getPublicContentPhiRisk(value = "") {
  const risk = getPhiRisk(value);
  const categories = risk.categories.filter(
    (category) => !["address", "phone_number", "url"].includes(category)
  );

  return {
    hasPotentialPhi: categories.length > 0,
    categories,
    severity: categories.length === 0 ? "none" : risk.severity,
  };
}

export function hasPotentialPhi(value = "") {
  return getPhiRisk(value).hasPotentialPhi;
}

export function redactPotentialPhi(value = "") {
  return normalizePublicSearchQuery(value)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]")
    .replace(/\b(my name is|name is)\s+[a-z][a-z' -]{1,60}\b/gi, "$1 [redacted-name]")
    .replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, "[redacted-phone]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-ip]")
    .replace(/\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+\.[^\s]+/gi, "[redacted-url]")
    .replace(/\b\d+(?:\.\d+)?\s*(mg|mcg|g|units?|iu|ml|puffs?)\b/gi, "[redacted-dose]");
}

export function getNoPhiError(surface = "this feature") {
  return `Please do not include medical details in ${surface}. ${NO_PHI_NOTICE}`;
}
