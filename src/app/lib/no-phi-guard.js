export const NO_PHI_NOTICE =
  "Do not include symptoms, diagnoses, medications, test results, dates of birth, insurance ID numbers, or other medical details. For medical questions, use the patient portal or call 301-515-2901.";

const PHI_PATTERNS = [
  /\b(date of birth|dob|birthdate|birthday)\b/i,
  /\b(ssn|social security|member id|insurance id|policy number|claim number|medical record number|mrn)\b/i,
  /\b(diagnosed|diagnosis|symptom|symptoms|test result|lab result|blood work|x-?ray|mri|ct scan)\b/i,
  /\b(medication|medicine|prescription|refill|dosage|dose|mg|ozempic|wegovy|mounjaro|insulin)\b/i,
  /\b(blood pressure|heart rate|glucose|a1c|cholesterol|pain|rash|fever|infection|uti)\b/i,
  /\b(pregnant|pregnancy|mental health|depression|anxiety|suicidal|self-harm)\b/i,
];

export function hasPotentialPhi(value = "") {
  const text = String(value || "").trim();
  if (!text) return false;
  return PHI_PATTERNS.some((pattern) => pattern.test(text));
}

export function getNoPhiError(surface = "this feature") {
  return `Please do not include medical details in ${surface}. ${NO_PHI_NOTICE}`;
}
