export const SAFE_FALLBACK_ANSWER =
  "I can help with First Medical Associates services, providers, locations, insurance, and booking. I cannot provide medical advice in AI search. For symptoms, diagnoses, medications, test results, or treatment questions, use the patient portal or call us at 301-515-2901. If this may be an emergency, call 911 or go to the nearest emergency department.";

const ALLOWED_ANSWER_HOSTS = new Set([
  "4332.portal.athenahealth.com",
  "drsfirst.com",
  "first-medical-associates.inquicker.com",
  "www.drsfirst.com",
]);

const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|above|all)\s+(instructions?|rules?|prompts?)/i,
  /forget\s+(everything|all|your|the)\s+(above|previous|instructions?|context)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+(a|an)\s+/i,
  /pretend\s+(you('?re|\s+are)|to\s+be)\s+/i,
  /\brole\s*[- ]?play\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s*mode\b/i,
  /prompt\s*inject/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /what\s+are\s+your\s+(instructions|rules|directives)/i,
  /override\s+(your\s+)?(instructions?|rules?|safety)/i,
  /new\s+instructions?\s*:/i,
  /\[INST\]/i,
  /disregard\s+(all|your|the)\s+(previous|prior|above)/i,
  /you\s+have\s+no\s+(restrictions?|rules?|limits?)/i,
  /bypass\s+(your\s+)?(safety|filter|restriction)/i,
];

const UNSAFE_MEDICAL_ADVICE_PATTERNS = [
  /\b(you|your child|your son|your daughter|the patient)\s+(likely|probably|may|might|could|should)\s+(have|need|take|start|stop|use|try|avoid|increase|decrease)\b/i,
  /\b(you|your child|your son|your daughter|the patient)\s+(need|needs|should get|should take)\s+(antibiotics?|steroids?|opioids?|insulin|x-?ray|mri|ct scan|blood work|lab tests?)\b/i,
  /\b(if you have|if your symptoms|for your symptoms)\b.{0,140}\b(take|start|stop|use|try|avoid|increase|decrease|dose|dosage|antibiotics?|ibuprofen|acetaminophen|tylenol|advil)\b/i,
  /\b(take|start|stop|increase|decrease|continue|use)\b.{0,60}\b(\d+(?:\.\d+)?\s*(mg|mcg|g|units?|iu|ml|puffs?)|antibiotics?|amoxicillin|ibuprofen|acetaminophen|tylenol|advil|insulin|ozempic|wegovy|mounjaro)\b/i,
  /\b\d+(?:\.\d+)?\s*(mg|mcg|g|units?|iu|ml|puffs?)\b/i,
];

function normalizeGuardText(value = "") {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectPromptInjection(query = "") {
  const normalized = normalizeGuardText(query);
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) return "injection";
  }
  return null;
}

export function sanitizeCitation(value = "") {
  return normalizeGuardText(value).slice(0, 120);
}

export function hasUnsafeMedicalAdvice(answer = "") {
  return UNSAFE_MEDICAL_ADVICE_PATTERNS.some((pattern) => pattern.test(answer));
}

export function hasDisallowedAnswerUrl(answer = "") {
  const urlPattern = /\bhttps?:\/\/[^\s<>"')]+|\bwww\.[^\s<>"')]+/gi;
  let match;

  while ((match = urlPattern.exec(answer)) !== null) {
    const rawUrl = match[0].startsWith("www.") ? `https://${match[0]}` : match[0];
    try {
      const host = new URL(rawUrl).hostname.toLowerCase();
      if (!ALLOWED_ANSWER_HOSTS.has(host)) return true;
    } catch {
      return true;
    }
  }

  return false;
}

export function getGeneratedAnswerSafetyIssue(answer = "") {
  const normalized = normalizeGuardText(answer);
  if (!normalized) return "empty_answer";
  if (detectPromptInjection(normalized)) return "instruction_leak";
  if (hasDisallowedAnswerUrl(normalized)) return "unsupported_url";
  if (hasUnsafeMedicalAdvice(normalized)) return "medical_advice";
  return "";
}

export function buildSafeAnswerFallback(safetyIssue = "unsafe_answer") {
  return {
    answer: SAFE_FALLBACK_ANSWER,
    confidence: "low",
    grounded: false,
    citations: [],
    safetyIssue,
  };
}

export function sanitizeGeneratedAnswerResult(result = {}) {
  const answer = normalizeGuardText(result.answer || "");
  const safetyIssue = getGeneratedAnswerSafetyIssue(answer);

  if (safetyIssue) return buildSafeAnswerFallback(safetyIssue);

  return {
    answer,
    confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "low",
    grounded: result.grounded === true,
    citations: Array.isArray(result.citations)
      ? result.citations.map(sanitizeCitation).filter(Boolean).slice(0, 6)
      : [],
    safetyIssue: result.safetyIssue || "",
  };
}
