const MAIN_PHONE = "301-515-2901";

export const AI_SEARCH_KNOWLEDGE_VERSION = "2026-07-23.4";

export const AI_SEARCH_POLICY_DOCUMENTS = Object.freeze([
  {
    id: "late-arrival-policy",
    type: "policy",
    title: "Late Arrival Policy",
    category: "Appointments",
    sourceUrl:
      "https://drsfirst.com/wp-content/uploads/2026/07/Late-Arrival-Policy-FMA_07-17-2026.docx-2.pdf",
    sourceVersion: "Updated 07/17/2026",
    verifiedAt: "2026-07-23",
    status: "active",
    aliases: [
      "late arrival",
      "arriving late",
      "grace period",
      "late appointment",
      "late fee",
      "new patient arrival",
      "new patient",
      "not been seen",
      "not been seen in three years",
      "not been seen in 36 months",
      "am i a new patient",
      "established patient arrival",
      "established patient",
      "returning patient",
      "returning patient arrival",
      "minutes late",
      "alternate provider",
    ],
    facts: [
      {
        id: "late-arrival.new-patient-arrival",
        text: "New patients who have not been seen by an FMA provider within the past 36 months must arrive 30 minutes before their first scheduled appointment.",
      },
      {
        id: "late-arrival.established-patient-arrival",
        text: "Established patients who have been seen by an FMA provider within the past 36 months must arrive 15 minutes before their scheduled appointment.",
      },
      {
        id: "late-arrival.established-grace-period",
        text: "Established-patient appointments have a 5-minute grace period after the scheduled appointment time.",
      },
      {
        id: "late-arrival.within-grace-period",
        text: "Within the 5-minute grace period, staff will do their best to accommodate the patient immediately if the schedule allows.",
      },
      {
        id: "late-arrival.rescheduling",
        text: "If the patient arrives more than 5 minutes late, or the provider is fully booked and cannot see the patient without significantly delaying others, the appointment must be rescheduled.",
      },
      {
        id: "late-arrival.rescheduling-options",
        text: "Staff may check whether another provider has immediate availability or reschedule the appointment for another convenient date and time.",
      },
      {
        id: "late-arrival.call-ahead",
        text: `Patients who expect to be late should call ${MAIN_PHONE} as soon as possible.`,
      },
      {
        id: "late-arrival.not-specified",
        text: "The document does not state that lateness alone is a missed appointment and does not list a late-arrival fee.",
      },
    ],
  },
  {
    id: "appointment-attendance-fees",
    type: "policy",
    title: "Appointment Cancellation and No-Show Fees",
    category: "Appointments",
    sourceUrl: "/patient-resources/patients",
    sourceVersion: "Contact Center Operations Script",
    verifiedAt: "2026-07-23",
    status: "active",
    aliases: [
      "no show fee",
      "no show charge",
      "miss appointment",
      "missed appointment",
      "missed appointment fee",
      "same day cancellation fee",
      "same day rescheduling fee",
      "don t show up",
      "do not show up",
      "fail to show",
      "forgot appointment charge",
      "forgot appointment",
      "forgot about appointment",
      "forgot visit",
      "appointment charge after missing",
      "reschedule same day",
    ],
    facts: [
      {
        id: "attendance.no-show-fee",
        text: "A no-show or missed appointment incurs a $50 missed-appointment fee.",
      },
      {
        id: "attendance.same-day-change-fee",
        text: "A same-day cancellation or same-day rescheduling incurs a $50 administrative fee.",
      },
      {
        id: "attendance.late-arrival-distinction",
        text: "The Late Arrival Policy does not state that lateness alone is automatically a missed appointment.",
      },
      {
        id: "attendance.call-office",
        text: `Patients with questions about an appointment fee should call ${MAIN_PHONE}.`,
      },
    ],
  },
  {
    id: "fmla-disability-forms-policy",
    type: "policy",
    title: "FMA Patient Forms and Records Policy",
    category: "Forms and records",
    sourceUrl: "https://drsfirst.com/wp-content/uploads/2025/03/FMLA-Disability-and-Other-Forms.docx.pdf",
    sourceVersion: "2025-03/FMLA-Disability-and-Other-Forms.docx.pdf",
    verifiedAt: "2026-07-23",
    status: "active",
    aliases: [
      "fmla",
      "disability form",
      "jury duty letter",
      "workplace accommodation",
      "metro access",
      "transportation form",
      "form fee",
      "medical records fee",
      "encrypted email records",
      "faxed records",
      "fax records",
    ],
    facts: [
      {
        id: "forms.additional-fees",
        text: "FMLA paperwork, disability assessments, jury-duty letters, workplace accommodations, general-purpose letters, and transportation or Metro Access documentation may have additional fees.",
      },
      {
        id: "forms.appointment-may-be-required",
        text: "An appointment may be required before a provider can complete a form.",
      },
      {
        id: "forms.fee-varies",
        text: `Fees vary based on complexity and time. Patients should call ${MAIN_PHONE} to confirm the exact fee.`,
      },
      {
        id: "forms.eligibility",
        text: "For disability or FMLA paperwork, the policy says patients must have been seen at least six times or have been under care for more than one year, with at least one visit in the past six months.",
      },
      {
        id: "forms.visit-fees",
        text: "A fee may still apply when forms are completed during a visit depending on complexity, and a fee applies when forms are completed outside a visit.",
      },
      {
        id: "records.processing-fees",
        text: "Paper records mailed to the patient incur postage if the total exceeds $3; encrypted-email records have a flat $50 fee; faxed records up to 80 pages are free; and records over 80 pages must be picked up or mailed with a $0.75-per-page printing charge.",
      },
    ],
  },
  {
    id: "glp1-weight-loss-policy",
    type: "policy",
    title: "Policy Regarding GLP-1 and Weight Loss Medications",
    category: "Medication policy",
    sourceUrl: "https://drsfirst.com/wp-content/uploads/2026/03/Policy-Regarding-GLP-1-Weight-Loss-Medications-.docx.pdf",
    sourceVersion: "2026-03/Policy-Regarding-GLP-1-Weight-Loss-Medications-.docx.pdf",
    verifiedAt: "2026-07-23",
    status: "active",
    aliases: [
      "glp-1 weight loss",
      "glp1 weight loss",
      "wegovy",
      "zepbound",
      "mounjaro",
      "ozempic weight loss",
      "weight loss medication",
      "weight management",
      "temporary refill",
      "bridge prescription",
      "30 day prescription",
      "finding a specialist",
      "transitioning to a specialist",
      "transition care to a specialist",
      "glp1 appeal prior authorization",
      "appeal denied glp1 prior authorization",
      "appeal glp1 insurance denial",
      "weight loss prior authorization appeal",
      "glp1 prior authorization",
      "glp 1 prior authorization",
      "bmi glp1 prior authorization",
    ],
    facts: [
      {
        id: "glp1.weight-loss-scope",
        text: "FMA does not initiate or manage long-term GLP-1 prescriptions for weight loss.",
      },
      {
        id: "glp1.bridge-prescription",
        text: "For existing patients previously prescribed these medications through FMA, the policy provides a one-time 30-day bridge prescription to transition care to a specialist.",
      },
      {
        id: "glp1.weight-loss-prior-authorizations",
        text: "FMA does not process or appeal prior authorizations for GLP-1 medications used for weight loss.",
      },
      {
        id: "glp1.referrals",
        text: "FMA can provide a referral to an endocrinology or bariatric specialist for specialized weight-management care.",
      },
    ],
  },
  {
    id: "glp1-insurance-coverage",
    type: "policy",
    title: "Understanding GLP-1 Medications and Insurance Coverage",
    category: "Medication coverage",
    sourceUrl: "https://drsfirst.com/wp-content/uploads/2026/02/GLP-1-Medications-Insurance-Coverage.pdf",
    sourceVersion: "2026-02/GLP-1-Medications-Insurance-Coverage.pdf",
    verifiedAt: "2026-07-23",
    status: "active",
    aliases: [
      "glp-1 insurance",
      "glp1 insurance",
      "glp-1 coverage",
      "prior authorization",
      "insurance denial",
      "bmi requirement",
    ],
    facts: [
      {
        id: "glp1.coverage-criteria",
        text: "The coverage guide says insurers commonly require a BMI of at least 30, or at least 27 with certain health conditions, but coverage may still be denied.",
      },
      {
        id: "glp1.prior-authorization-definition",
        text: "A prior authorization is a request in which the medical office sends supporting records to the insurer, and the insurer decides whether it will cover the medication.",
      },
      {
        id: "glp1.coverage-pa-criteria",
        text: "The coverage guide says FMA submits a prior authorization only when the medical record clearly shows that the insurer's criteria are met.",
      },
      {
        id: "glp1.coverage-options",
        text: "The coverage guide lists lifestyle and nutrition support, self-pay or manufacturer resources, and other medications as possible options when insurance criteria are not met.",
      },
      {
        id: "glp1.weight-loss-policy-controls",
        text: "For questions about prescribing or prior authorizations specifically for weight loss, the March 2026 GLP-1 and Weight Loss Medications policy is the controlling source.",
      },
    ],
  },
]);

function normalizePolicyText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPolicyDocumentRelevant(document, normalized) {
  if (document.id === "late-arrival-policy") {
    return (
      /\b(late|lateness|arrive|arrival|grace period|minutes late|36 months|not been seen)\b/.test(
        normalized
      ) ||
      /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+minutes?\s+grace\b/.test(
        normalized
      ) ||
      /\bnew patients?\b.{0,30}\bgrace\b|\bgrace\b.{0,30}\bnew patients?\b/.test(normalized) ||
      /\b(?:am i|would i be|considered)\b.{0,40}\bnew patient\b/.test(normalized)
    );
  }
  if (document.id === "appointment-attendance-fees") {
    return /\b(no show|fail to show|don t show)\b|\b(?:miss|missed|forgot)\b.{0,40}\b(?:appointment|visit)\b|\bsame day\b.{0,30}\b(?:cancel|reschedul)\b|\b(?:cancel|reschedul)\b.{0,30}\bsame day\b/.test(
      normalized
    );
  }
  if (document.id === "fmla-disability-forms-policy") {
    return (
      /\b(fmla|disability|jury duty|workplace accommodation|metro access|transportation form|medical records|encrypted email|fax records|faxed records)\b/.test(
        normalized
      ) || /\brecords?\b.{0,30}\bfax\b|\bfax\b.{0,30}\brecords?\b/.test(normalized)
    );
  }
  if (document.id === "glp1-weight-loss-policy") {
    return /\b(glp 1|glp1|wegovy|zepbound|ozempic|mounjaro|weight loss|weight management|bridge prescription|temporary refill|specialist|endocrinolog|bariatric)\b/.test(
      normalized
    );
  }
  if (document.id === "glp1-insurance-coverage") {
    return /\b(glp 1|glp1|wegovy|zepbound|ozempic|mounjaro|bmi|prior authorization|insurance denial)\b/.test(
      normalized
    );
  }
  return true;
}

const POLICY_NUMBER_WORDS = Object.freeze({
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
});

function parsePolicyNumber(value = "") {
  const normalized = String(value || "").toLowerCase();
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10);
  return POLICY_NUMBER_WORDS[normalized] ?? null;
}

function getMinutesLate(normalized = "") {
  const match = normalized.match(
    /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty)\s+minutes?\s+late\b/
  );
  return match ? parsePolicyNumber(match[1]) : null;
}

function getMonthsSinceSeen(normalized = "") {
  const match = normalized.match(
    /\b(?:haven t|hasn t|hadn t|have not|has not|not)\s+been\s+seen\b.{0,40}\b(\d+|one|two|three|four|five)\s+(years?|months?)\b/
  );
  if (!match) return null;
  const amount = parsePolicyNumber(match[1]);
  if (!Number.isFinite(amount)) return null;
  return match[2].startsWith("year") ? amount * 12 : amount;
}

export function getActivePolicyDocuments() {
  return AI_SEARCH_POLICY_DOCUMENTS.filter((document) => document.status === "active");
}

export function getPolicyEmbeddingId(document) {
  return `policy-${document.id}`;
}

export function getPolicyDocumentContent(document) {
  return [
    `Policy: ${document.title}`,
    `Category: ${document.category}`,
    `Source version: ${document.sourceVersion}`,
    `Verified: ${document.verifiedAt}`,
    ...document.facts.map((fact) => `[${fact.id}] ${fact.text}`),
  ].join("\n");
}

export function findPolicyDocumentsForQuery(query = "") {
  const normalized = normalizePolicyText(query);
  if (!normalized) return [];

  return getActivePolicyDocuments()
    .map((document) => {
      if (!isPolicyDocumentRelevant(document, normalized)) {
        return { document, score: 0 };
      }
      const aliases = [document.title, ...document.aliases].map(normalizePolicyText).filter(Boolean);
      const score = Math.max(
        0,
        ...aliases.map((alias) => {
          if (normalized.includes(alias)) {
            return Math.max(alias.split(" ").length * 20, 20);
          }

          const aliasTokens = alias.split(" ").filter((token) => token.length >= 3);
          if (aliasTokens.length < 2) return 0;
          const matchedTokens = aliasTokens.filter((token) => normalized.includes(token)).length;
          if (matchedTokens < 2) return 0;

          return Math.round((matchedTokens / aliasTokens.length) * 20);
        })
      );

      return { document, score };
    })
    .filter((entry) => entry.score >= 15)
    .sort((first, second) => second.score - first.score)
    .map((entry) => entry.document);
}

export function formatPolicyDocumentsForPrompt(documents = []) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return "No versioned FMA policy document matched this question.";
  }

  return documents
    .map(
      (document) =>
        `${getPolicyDocumentContent(document)}\nExact source URL: ${document.sourceUrl}\nAuthority: Use these versioned facts instead of conflicting or undated context.`
    )
    .join("\n\n---\n\n");
}

export function formatPolicyDocumentSources(documents = []) {
  return documents.slice(0, 3).map((document) => ({
    id: document.id,
    title: document.title,
    url: document.sourceUrl,
    type: "policy",
    category: document.category,
    sourceVersion: document.sourceVersion,
  }));
}

function buildLateArrivalPolicyAnswer(query, document) {
  const normalized = normalizePolicyText(query);
  const asksAboutFee = /\b(fee|fees|charge|charges|pay|payment)\b/.test(normalized);
  const monthsSinceSeen = getMonthsSinceSeen(normalized);
  const minutesLate = getMinutesLate(normalized);
  const asksHowEarlyForEstablished =
    /\b(established|existing|returning)\b/.test(normalized) &&
    /\b(how early|arrive early|arrival time|when should)\b/.test(normalized);
  const asksAboutNewPatient =
    /\bnew patients?\b/.test(normalized) &&
    !Number.isFinite(monthsSinceSeen);
  const asksAboutGrace = /\bgrace\b/.test(normalized);

  let answer;

  if (Number.isFinite(monthsSinceSeen)) {
    answer =
      monthsSinceSeen >= 36
        ? `Under the Late Arrival Policy updated July 17, 2026, someone who has not been seen by an FMA provider within the past 36 months is treated as a new patient and must arrive 30 minutes before the first scheduled appointment. Established patients seen within the past 36 months must arrive 15 minutes before the scheduled appointment.`
        : `Under the Late Arrival Policy updated July 17, 2026, someone seen by an FMA provider within the past 36 months is an established patient and must arrive 15 minutes before the scheduled appointment. Established-patient appointments also have a 5-minute grace period.`;
  } else if (asksHowEarlyForEstablished) {
    answer =
      `Established patients who have been seen by an FMA provider within the past 36 months must arrive 15 minutes before their scheduled appointment. ` +
      `The policy also allows established patients a 5-minute grace period after the scheduled appointment time.`;
  } else if (asksAboutNewPatient && asksAboutGrace) {
    answer =
      `The policy gives a 5-minute grace period only for established-patient appointments. It requires new patients who have not been seen by an FMA provider within the past 36 months to arrive 30 minutes before the first scheduled appointment, and it does not state a separate new-patient grace period. If you expect to be late, call ${MAIN_PHONE} as soon as possible.`;
  } else if (Number.isFinite(minutesLate)) {
    answer =
      minutesLate <= 5
        ? `For an established-patient appointment, ${minutesLate} ${minutesLate === 1 ? "minute" : "minutes"} late is within the 5-minute grace period. Staff will do their best to accommodate the patient immediately if the schedule allows. The policy does not list a late-arrival fee.`
        : `Established-patient appointments have a 5-minute grace period. More than 5 minutes late may require seeing another immediately available provider or rescheduling, especially when the scheduled provider is fully booked. The policy does not say that lateness alone is automatically a missed appointment and does not list a late-arrival fee. If you expect to be late, call ${MAIN_PHONE}.`;
  } else if (asksAboutFee) {
    answer =
      `The current Late Arrival Policy does not list a late-arrival fee. It says that arrivals more than 5 minutes late may need to be rescheduled, ` +
      `or staff may check another provider's immediate availability. Call us at ${MAIN_PHONE} to confirm whether any separate cancellation or no-show policy applies.`;
  } else if (asksAboutNewPatient) {
    answer =
      `New patients who have not been seen by an FMA provider within the past 36 months must arrive 30 minutes before their first scheduled appointment. ` +
      `If you expect to be late, call us at ${MAIN_PHONE} as soon as possible.`;
  } else {
    answer =
      `Established patients who have been seen by an FMA provider within the past 36 months must arrive 15 minutes before their scheduled appointment. FMA also allows established patients a 5-minute grace period after the scheduled appointment time. ` +
      `Within that period, staff will do their best to accommodate you if the schedule allows. More than 5 minutes late, or a fully booked provider, may require seeing an alternate available provider or rescheduling. ` +
      `New patients who have not been seen by an FMA provider within the past 36 months must arrive 30 minutes before their first scheduled appointment. If you expect to be late, call ${MAIN_PHONE}.`;
  }

  return {
    ok: true,
    code: "policy_exact_match",
    answer,
    confidence: 1,
    aiConfidence: "high",
    grounded: true,
    disclaimer: false,
    citations: [`${document.title} (${document.sourceVersion})`],
    sources: formatPolicyDocumentSources([document]),
    factIds: document.facts.map((fact) => fact.id),
    knowledgeVersion: AI_SEARCH_KNOWLEDGE_VERSION,
  };
}

function buildPolicyResult(answer, documents, factIds = null) {
  return {
    ok: true,
    code: "policy_exact_match",
    answer,
    confidence: 1,
    aiConfidence: "high",
    grounded: true,
    disclaimer: false,
    citations: documents.map((document) => `${document.title} (${document.sourceVersion})`),
    sources: formatPolicyDocumentSources(documents),
    factIds:
      factIds ||
      documents.flatMap((document) => document.facts.map((fact) => fact.id)),
    knowledgeVersion: AI_SEARCH_KNOWLEDGE_VERSION,
  };
}

function buildAttendanceFeePolicyAnswer(query, document) {
  const normalized = normalizePolicyText(query);
  const asksAboutSameDayChange =
    /\b(same day)\b/.test(normalized) &&
    /\b(cancel|cancellation|reschedule|rescheduling)\b/.test(normalized);

  if (asksAboutSameDayChange) {
    return buildPolicyResult(
      `A same-day cancellation or same-day rescheduling incurs a $50 administrative fee. If you have questions about a specific appointment charge, call ${MAIN_PHONE}.`,
      [document],
      ["attendance.same-day-change-fee", "attendance.call-office"]
    );
  }

  return buildPolicyResult(
    `Yes. A no-show or missed appointment incurs a $50 missed-appointment fee. If you need help with a specific appointment charge, call ${MAIN_PHONE}.`,
    [document],
    ["attendance.no-show-fee", "attendance.call-office"]
  );
}

function buildFormsPolicyAnswer(query, document) {
  const normalized = normalizePolicyText(query);
  const asksAboutRecords = /\b(records?|fax|email|postage|pages?|copies)\b/.test(normalized);
  const asksAboutEligibility = /\b(eligible|eligibility|qualify|requirement|how many visits)\b/.test(
    normalized
  );

  if (asksAboutRecords) {
    return buildPolicyResult(
      "For medical records, paper copies mailed to the patient have postage costs if the total exceeds $3. Encrypted-email requests have a flat $50 fee. Faxed records up to 80 pages are free; records over 80 pages must be picked up or mailed, with a $0.75-per-page printing charge.",
      [document],
      ["records.processing-fees"]
    );
  }

  if (asksAboutEligibility) {
    return buildPolicyResult(
      "To be eligible for disability forms or FMLA paperwork, the policy requires that a patient has been seen at least six times or has been under FMA care for more than one year, with at least one visit in the past six months. An evaluation appointment may still be required before the forms can be completed.",
      [document],
      ["forms.eligibility", "forms.appointment-may-be-required"]
    );
  }

  return buildPolicyResult(
    `FMLA paperwork, disability forms, jury-duty letters, workplace accommodations, general-purpose letters, and transportation or Metro Access documents may have additional fees. Fees vary with complexity and time, and an evaluation appointment may be required. Call ${MAIN_PHONE} to confirm the exact fee.`,
    [document],
    ["forms.additional-fees", "forms.appointment-may-be-required", "forms.fee-varies"]
  );
}

function buildGlpPolicyAnswer(query, weightLossDocument, coverageDocument) {
  const normalized = normalizePolicyText(query);
  const asksAboutDiabetesUse =
    /\b(diabetes|type 2|type ii|rather than weight loss|not for weight loss)\b/.test(normalized);
  const asksAboutGenericMedication =
    /\b(ozempic|mounjaro)\b/.test(normalized) &&
    !/\b(weight loss|weight management|obesity)\b/.test(normalized);
  const asksAboutWeightLoss =
    /\b(weight loss|weight management|wegovy|zepbound|ozempic|prescribe|prescription|refill|bridge|specialist|endocrinolog(?:ist|y)?|bariatric|referral)\b/.test(
      normalized
    );
  const asksAboutPriorAuthorization = /\b(prior authorization|pa|appeal)\b/.test(normalized);

  if (weightLossDocument && (asksAboutDiabetesUse || asksAboutGenericMedication)) {
    return buildPolicyResult(
      `The March 2026 GLP-1 policy applies specifically when these medications are used for weight loss; it does not publish a blanket prescribing rule for diabetes or other uses. For a medication-specific question, use the patient portal or call ${MAIN_PHONE} rather than entering medical details in AI search.`,
      [weightLossDocument],
      ["glp1.weight-loss-scope"]
    );
  }

  if (weightLossDocument && (asksAboutWeightLoss || asksAboutPriorAuthorization)) {
    return buildPolicyResult(
      "For weight loss, FMA does not initiate or manage long-term GLP-1 prescriptions and does not process or appeal prior authorizations for these medications. Existing patients who previously received them through FMA may receive a one-time 30-day bridge prescription while transitioning to an endocrinology or bariatric specialist, and FMA can provide a referral.",
      [weightLossDocument],
      [
        "glp1.weight-loss-scope",
        "glp1.bridge-prescription",
        "glp1.weight-loss-prior-authorizations",
        "glp1.referrals",
      ]
    );
  }

  if (coverageDocument) {
    return buildPolicyResult(
      "The GLP-1 insurance guide says insurers commonly require a BMI of at least 30, or at least 27 with certain health conditions, but coverage can still be denied. A prior authorization sends supporting medical records to the insurer, which makes the coverage decision. FMA submits one only when the medical record clearly meets the insurer's criteria.",
      [coverageDocument],
      [
        "glp1.coverage-criteria",
        "glp1.prior-authorization-definition",
        "glp1.coverage-pa-criteria",
      ]
    );
  }

  return null;
}

export function buildDeterministicPolicyAnswer(query = "", documents = []) {
  const attendanceFeePolicy = documents.find(
    (document) => document.id === "appointment-attendance-fees"
  );
  const lateArrivalPolicy = documents.find((document) => document.id === "late-arrival-policy");
  const normalized = normalizePolicyText(query);
  const hasDirectLateArrivalSignal =
    /\b(late|lateness|arrive|arrival|grace period|minutes late)\b/.test(normalized);

  // When a question contrasts lateness with a missed appointment, the
  // versioned late-arrival policy is the controlling source.
  if (lateArrivalPolicy && hasDirectLateArrivalSignal) {
    return buildLateArrivalPolicyAnswer(query, lateArrivalPolicy);
  }

  if (attendanceFeePolicy) {
    return buildAttendanceFeePolicyAnswer(query, attendanceFeePolicy);
  }

  if (lateArrivalPolicy) return buildLateArrivalPolicyAnswer(query, lateArrivalPolicy);

  const formsPolicy = documents.find(
    (document) => document.id === "fmla-disability-forms-policy"
  );
  if (formsPolicy) return buildFormsPolicyAnswer(query, formsPolicy);

  const weightLossPolicy = documents.find(
    (document) => document.id === "glp1-weight-loss-policy"
  );
  const coveragePolicy = documents.find(
    (document) => document.id === "glp1-insurance-coverage"
  );
  const glpPolicyAnswer = buildGlpPolicyAnswer(query, weightLossPolicy, coveragePolicy);
  if (glpPolicyAnswer) return glpPolicyAnswer;

  return null;
}
