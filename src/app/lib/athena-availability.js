import { prisma } from "./prisma.js";
import { GENERAL_BOOK_APPOINTMENT_URL, normalizeInternalPageHref } from "./config/site.js";
import {
  AI_SEARCH_CORE_STOPWORDS,
  AI_SEARCH_PATTERNS,
  compactSearchText,
  normalizeSearchText,
} from "./ai-search-vocabulary.js";
import {
  buildProviderResolverEntries,
  getProviderIntentTokens as getSharedProviderIntentTokens,
  isNearProviderTokenMatch,
  resolveProviderSearch,
} from "./ai-search-provider-resolution.js";

const ATHENA_REQUEST_TIMEOUT_MS = 15000;
const TOKEN_PATH = "/oauth2/v1/token";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PROVIDER_INTENT_CACHE_TTL_MS = 5 * 60 * 1000;
const TOKEN_BUFFER_SECONDS = 60;
const DEFAULT_LOOKAHEAD_DAYS = 30;
const MAX_PROVIDER_CHECKS = 14;
const MAX_GLOBAL_PROVIDER_CHECKS = 80;
const MAX_RESULTS = 4;
const MAX_REQUESTED_RESULTS = 48;
const MAX_REQUESTED_PROVIDER_CHECKS = 80;
const OPEN_SLOT_LIMIT = 6;
const TIME_SLOT_LIMIT = 100;
const PROVIDER_SLOT_LIMIT = 4;
const PROVIDER_LOOKUP_CONCURRENCY = 3;
const AVAILABILITY_CACHE_TTL_MS = 60 * 1000;
const EXTENDED_PROVIDER_LOOKAHEAD_DAYS = 210;
const ATHENA_UNAVAILABLE_ANSWER =
  "I could not check current online appointment availability right now. Please use online booking or call 301-515-2901 so the team can confirm current appointment times.";

const APPOINTMENT_INTENT_PATTERN =
  new RegExp(
    `${AI_SEARCH_PATTERNS.appointmentTerm.source}|${AI_SEARCH_PATTERNS.bookingTerm.source}|${AI_SEARCH_PATTERNS.fastAppointment.source}|\\b(?:next|now|today|tomorrow|see\\s+a\\s+provider|see\\s+a\\s+doctor)\\b`,
    "i"
  );
const APPOINTMENT_WORD_PATTERN = AI_SEARCH_PATTERNS.appointmentTerm;
const AVAILABILITY_WORD_PATTERN =
  /\b(available|availability|availabilities|opening|openings|slot|slots|time|times)\b/i;
const AVAILABILITY_REQUEST_PATTERN =
  /\b(available\s+times?|available\b.{0,80}\btimes?|times?\b.{0,80}\bavailable|availabilit(?:y|ies)|openings?|slots?|open\s+(?:times?|slots?|appointments?))\b/i;
const PROVIDER_AVAILABILITY_LANGUAGE_PATTERN =
  new RegExp(
    `${AI_SEARCH_PATTERNS.appointmentTerm.source}|${AI_SEARCH_PATTERNS.bookingTerm.source}|${AI_SEARCH_PATTERNS.fastAppointment.source}|\\b(?:next|today|tomorrow|when)\\b`,
    "i"
  );
const PROVIDER_ACTION_LANGUAGE_PATTERN =
  /\b(when\s+(?:can|could|may)\s+i\s+(?:see|visit|book|schedule)|(?:can|could|may)\s+i\s+(?:see|visit|book|schedule)|(?:book|schedule)\s+(?:with\s+)?(?:dr\.?\s+)?)\b/i;
const PROVIDER_APPOINTMENT_REQUEST_PATTERN =
  /\b(?:what|which)\s+(?:appointments?|appts?)\s+(?:does|do)\s+(?!(?:i|we|you|they|anyone|anybody|someone|somebody|fma|first medical|first medical associates|office|clinic|location|locations)\b)(?:dr\s+)?[a-z0-9]+(?:\s+[a-z0-9]+){0,4}\s+(?:have|offer|show|take|accept)\b/i;
const PROVIDER_TIME_REQUEST_PATTERN =
  /\b(?:what|which)\s+times?\s+(?:does|do)\s+(?!(?:i|we|you|they|anyone|anybody|someone|somebody|fma|first medical|first medical associates|office|clinic|location|locations)\b)(?:dr\s+)?[a-z0-9]+(?:\s+[a-z0-9]+){0,4}\s+(?:have|offer|show|take|accept)\b/i;
const CARE_VISIT_REQUEST_PATTERN =
  /\b(?:see|visit)\s+(?:a\s+)?(?:doctor|provider|physician|clinician)\b/i;
const SERVICE_APPOINTMENT_REQUEST_PATTERN =
  /\b(primary\s+care|same[-\s]?day|annual\s+physicals?|physicals?|wellness|urgent\s+care|sick\s+visits?)\b.{0,40}\b(appointments?|schedule|scheduling|book|booking)\b|\b(appointments?|schedule|scheduling|book|booking)\b.{0,40}\b(primary\s+care|same[-\s]?day|annual\s+physicals?|physicals?|wellness|urgent\s+care|sick\s+visits?)\b/i;
const NON_APPOINTMENT_AVAILABILITY_PATTERN =
  /\b(what|which)\s+(services?|insurance|forms?|resources?|locations?)\s+(?:are|is)\s+available\b|\boffice\s+hours?\b|\bwhat\s+time\s+(?:do|does|is|are)\s+(?:you|fma|office|clinic|location|locations)\s+open\b|\b(?:office|offices|clinic|clinics|location|locations)\b.{0,50}\b(?:open|closed|hours|weekends?|saturday|sunday|24(?:\/|\s)?7|always open|after hours|midnight|overnight)\b|\b24(?:\/|\s)?7\b|\b(?:walk[-\s]?in|walk(?:ing)? into|without an appointment)\b|\bneed\b.{0,25}\bappointment\b.{0,35}\bsame[-\s]?day\b|\bsame[-\s]?day\b.{0,40}\b(?:guaranteed|guarantee|always available|definite|definitely)\b|\b(?:two|2)\s+hours?\b.{0,30}\bnotice\b|\bnotice\b.{0,30}\b(?:two|2)\s+hours?\b|\b(?:call|contact|notify)\b.{0,30}\b(?:two|2)\s+hours?\b.{0,40}\bsame[-\s]?day\b|\bsame[-\s]?day\b.{0,40}\b(?:call|contact|notify)\b.{0,30}\b(?:two|2)\s+hours?\b|\b(?:minimum patient age|minimum age|under 18|1[0-7][-\s]?year[-\s]?old)\b|\b(?:schedule|book|appointment|visit|clinic|office|fma)\b.{0,50}\bemergenc(?:y|ies)\b|\bemergenc(?:y|ies)\b.{0,50}\b(?:schedule|book|appointment|visit|clinic|office|fma)\b/i;
const APPOINTMENT_POLICY_PATTERN =
  /\b(polic(?:y|ies)|no[-\s]?shows?|missed appointments?|grace period|late arrivals?|same[-\s]?day cancellations?|cancell?(?:ation|ations|ed|ing)?|reschedul(?:e|ed|ing)|do(?:n't| not)\s+show(?:\s+up)?|fail(?:ed|ing)?\s+to\s+show|fees?|charges?)\b/i;
const FAST_APPOINTMENT_PATTERN =
  /\b(quick|quickest|fast|fastest|earliest|soonest|next|asap|now|today|tomorrow|first available)\b/i;
const EXPLICIT_GLOBAL_APPOINTMENT_PATTERN = AI_SEARCH_PATTERNS.globalAppointment;
const PROVIDER_SCOPE_LANGUAGE_PATTERN =
  /\b(?:for|with)\s+(?:dr\.?\s+)?[a-z][a-z0-9 .'-]{1,80}\b|\b(?:does|do)\s+(?!(?:i|we|you|they|anyone|anybody|someone|somebody|fma|first medical|first medical associates|office|clinic|location|locations)\b)[a-z][a-z0-9 .'-]{1,80}\s+(?:have|show|offer|take|accept|available|openings?|appointments?)\b|\bwhen\s+(?:can|could|may)\s+i\s+(?:see|visit|book|schedule)\s+(?:dr\.?\s+)?[a-z][a-z0-9 .'-]{1,80}\b|\b(?:book|schedule)\s+with\s+(?:dr\.?\s+)?[a-z][a-z0-9 .'-]{1,80}\b/i;
const DATE_OR_RANGE_LANGUAGE_PATTERN =
  /\b(today|tomorrow|this\s+week|next\s+week|next\s+\d{1,3}\s+days?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}(?:st|nd|rd|th)|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
const LOCATION_PATTERN = AI_SEARCH_PATTERNS.locationAlias;
const REQUESTED_TIME_PATTERN =
  /\b(?:at\s*)?(?:(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)|([01]?\d|2[0-3]):([0-5]\d))\b/i;
const REQUESTED_WEEKDAY_PATTERN =
  /\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
const MONTH_DAY_PATTERN =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{2,4}))?\b/i;
const DAY_MONTH_PATTERN =
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:,?\s*(\d{2,4}))?\b/i;
const NUMERIC_DATE_PATTERN = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
const ISO_DATE_PATTERN = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
const NEXT_DAYS_PATTERN = /\bnext\s+(\d{1,3})\s+days?\b/i;
const ORDINAL_DAY_OF_MONTH_PATTERN = /\b(?:on|for)?\s*(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i;
const WEEKDAY_INDEX_BY_TOKEN = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_INDEX_BY_TOKEN = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const APPOINTMENT_REASON_PRIORITY = [
  "New Patient",
  "Sick Visit",
  "Follow Up",
  "Annual Physical",
  "Problem",
  "Medication Check",
  "Wellness Visit",
];

const PROVIDER_QUERY_STOPWORDS = new Set([...AI_SEARCH_CORE_STOPWORDS, "anything", "open", "something"]);

let tokenCache = null;
let referenceCache = null;
let siteProviderIntentCache = null;
const availabilityCache = new Map();

function normalizeText(value = "") {
  return normalizeSearchText(value);
}

function normalizePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function compactText(value = "") {
  return compactSearchText(value);
}

function getProviderIntentTokens(query) {
  return getSharedProviderIntentTokens(query);
}

function hasAppointmentAvailabilityLanguage(query) {
  const normalized = normalizeText(query);
  if (
    !normalized ||
    NON_APPOINTMENT_AVAILABILITY_PATTERN.test(normalized) ||
    APPOINTMENT_POLICY_PATTERN.test(normalized)
  ) return false;
  return (
    PROVIDER_AVAILABILITY_LANGUAGE_PATTERN.test(normalized) ||
    PROVIDER_ACTION_LANGUAGE_PATTERN.test(normalized)
  );
}

function buildProviderIntentEntries(providers = []) {
  return buildProviderResolverEntries(providers);
}

async function getSiteProviderIntentEntries() {
  const now = Date.now();
  if (siteProviderIntentCache?.expiresAt > now) {
    return siteProviderIntentCache.entries;
  }

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    select: { name: true },
  });

  const entries = buildProviderIntentEntries(providers);
  siteProviderIntentCache = {
    expiresAt: now + PROVIDER_INTENT_CACHE_TTL_MS,
    entries,
  };

  return entries;
}

function queryMentionsKnownProvider(query, providerEntries) {
  const resolution = resolveProviderSearch(query, providerEntries, { entries: true });
  return resolution.resolvedProviders.length > 0 || resolution.providerCandidates.length > 0;
}

async function isKnownProviderAvailabilityQuery(query) {
  if (!hasAppointmentAvailabilityLanguage(query)) return false;

  const providerEntries = await getSiteProviderIntentEntries();
  return queryMentionsKnownProvider(query, providerEntries);
}

export async function shouldCheckAppointmentAvailability(query) {
  if (isAppointmentAvailabilityQuery(query)) return true;
  return isKnownProviderAvailabilityQuery(query);
}

function getAthenaConfig() {
  const clientId = process.env.ATHENA_CLIENT_ID?.trim();
  const clientSecret = process.env.ATHENA_CLIENT_SECRET?.trim();
  const baseUrl = process.env.ATHENA_BASE_URL?.trim()?.replace(/\/+$/, "");
  const tokenUrl =
    process.env.ATHENA_TOKEN_URL?.trim() ||
    (baseUrl ? `${baseUrl}${TOKEN_PATH}` : "");
  const scope = process.env.ATHENA_DEFAULT_SCOPE?.trim();
  const practiceId = process.env.ATHENA_DEFAULT_PRACTICE_ID?.trim();

  if (!clientId || !clientSecret || !baseUrl || !tokenUrl || !scope || !practiceId) {
    return {
      ok: false,
      error: "Athena appointment search is not configured.",
    };
  }

  return {
    ok: true,
    clientId,
    clientSecret,
    baseUrl,
    tokenUrl,
    scope,
    practiceId,
  };
}

function withTimeout(options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATHENA_REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
    options,
  };
}

async function fetchJson(url, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const timeout = withTimeout();
    try {
      const response = await fetch(url, {
        ...options,
        cache: "no-store",
        signal: timeout.signal,
      });
      const text = await response.text();
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text.slice(0, 500) };
      }

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
        const waitMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        body,
      };
    } finally {
      timeout.clear();
    }
  }

  return {
    ok: false,
    status: 429,
    body: { error: "Quota Exceeded." },
  };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );

  return results;
}

async function getAccessToken(config) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache?.accessToken && tokenCache.expiresAt > now + TOKEN_BUFFER_SECONDS) {
    return tokenCache.accessToken;
  }

  const response = await fetchJson(config.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
        "base64"
      )}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: config.scope,
    }),
  });

  if (!response.ok || !response.body?.access_token) {
    throw new Error("Athena token request failed.");
  }

  tokenCache = {
    accessToken: response.body.access_token,
    expiresAt: now + Number(response.body.expires_in || 3600),
  };

  return tokenCache.accessToken;
}

function addQuery(pathname, params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value).trim());
    }
  }
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

async function athenaGet(config, accessToken, path) {
  return fetchJson(`${config.baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function getDepartmentName(department) {
  return (
    department.patientdepartmentname ||
    department.name ||
    `Department ${department.departmentid}`
  );
}

function getProviderName(provider) {
  return (
    [provider.firstname, provider.lastname].filter(Boolean).join(" ").trim() ||
    provider.schedulingname ||
    provider.displayname ||
    provider.lastname ||
    `Provider ${provider.providerid}`
  );
}

function getDepartmentSearchValues(department) {
  const name = getDepartmentName(department);
  return [
    name,
    department.city,
    department.state,
    name.replace(/First Medical Associates/gi, ""),
    `${department.city || ""} ${department.state || ""}`,
  ].filter(Boolean);
}

function getProviderSearchKey(provider) {
  return compactText(getProviderName(provider));
}

function getProviderSearchKeys(provider) {
  return [
    ...new Set(
      [getProviderSearchKey(provider), provider.displayname, provider.schedulingname]
        .map((value) => compactText(value))
        .filter(Boolean)
    ),
  ];
}

function isSchedulableProvider(provider) {
  return provider.entitytype === "Person" && provider.billable === true && provider.hideinportal !== true;
}

async function loadReferenceData(config, accessToken) {
  const now = Date.now();
  if (referenceCache && referenceCache.expiresAt > now) return referenceCache.data;

  const [departmentsResponse, providersResponse, siteProviders] = await Promise.all([
    athenaGet(
      config,
      accessToken,
      addQuery(`/v1/${encodeURIComponent(config.practiceId)}/departments`, { limit: 100 })
    ),
    athenaGet(
      config,
      accessToken,
      addQuery(`/v1/${encodeURIComponent(config.practiceId)}/providers`, { limit: 100 })
    ),
    prisma.provider.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        title: true,
        linkUrl: true,
        athenaProviderId: true,
        athenaDepartmentId: true,
        athenaSchedulingName: true,
      },
    }),
  ]);

  if (!departmentsResponse.ok) throw new Error("Athena departments lookup failed.");
  if (!providersResponse.ok) throw new Error("Athena providers lookup failed.");

  const data = {
    departments: Array.isArray(departmentsResponse.body?.departments)
      ? departmentsResponse.body.departments
      : [],
    providers: Array.isArray(providersResponse.body?.providers)
      ? providersResponse.body.providers
      : [],
    siteProviders,
  };

  referenceCache = {
    expiresAt: now + CACHE_TTL_MS,
    data,
  };

  return data;
}

function findRequestedDepartments(query, departments) {
  const normalizedQuery = normalizeText(query);
  const compactQuery = compactText(query);

  return departments
    .map((department) => {
      const values = getDepartmentSearchValues(department);
      const score = values.reduce((bestScore, value) => {
        const normalizedValue = normalizeText(value);
        const compactValue = compactText(value);
        if (!normalizedValue || !compactValue) return bestScore;

        if (compactValue.length >= 4 && compactQuery.includes(compactValue)) {
          return Math.max(bestScore, 100);
        }
        if (normalizedValue.length >= 4 && normalizedQuery.includes(normalizedValue)) {
          return Math.max(bestScore, 92);
        }
        if (compactQuery.length >= 4 && compactValue.includes(compactQuery)) {
          return Math.max(bestScore, 75);
        }

        const tokens = normalizedValue.split(/\s+/).filter((token) => token.length > 2);
        const tokenMatches = tokens.filter((token) => normalizedQuery.includes(token)).length;
        if (tokenMatches > 0) return Math.max(bestScore, 30 + tokenMatches * 8);

        return bestScore;
      }, 0);

      return { department, score };
    })
    .filter((match) => match.score >= 75)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return getDepartmentName(first.department).localeCompare(getDepartmentName(second.department));
    })
    .map((match) => match.department);
}

function findRequestedDepartment(query, departments) {
  return findRequestedDepartments(query, departments)[0] || null;
}

function findConfiguredDepartmentForProvider(provider, departments, siteProviderEntries = []) {
  const siteProvider = findSiteProvider(provider, siteProviderEntries);
  const configuredDepartmentId = String(siteProvider?.athenaDepartmentId || "").trim();
  if (!configuredDepartmentId) return null;

  return (
    departments.find(
      (department) => String(department.departmentid || "").trim() === configuredDepartmentId
    ) || null
  );
}

function matchDepartmentForProvider(provider, department, siteProviderEntries = []) {
  return getProviderDepartmentMatchScore(provider, department, siteProviderEntries) > 0;
}

function getProviderDepartmentMatchScore(provider, department, siteProviderEntries = []) {
  const configuredDepartmentId = String(
    findSiteProvider(provider, siteProviderEntries)?.athenaDepartmentId || ""
  ).trim();
  if (configuredDepartmentId) {
    return String(department?.departmentid || "").trim() === configuredDepartmentId ? 1000 : 0;
  }

  const home = compactText(provider.homedepartment);
  if (!home) return 0;

  return getDepartmentSearchValues(department).reduce((bestScore, value) => {
    const candidate = compactText(value);
    if (!candidate) return bestScore;

    if (candidate === home) return Math.max(bestScore, 100);
    if (candidate.endsWith(home)) return Math.max(bestScore, 96);
    if (candidate.includes(home)) return Math.max(bestScore, 92);

    if (candidate.length >= 6 && home.endsWith(candidate)) return Math.max(bestScore, 70);
    if (candidate.length >= 6 && home.includes(candidate)) return Math.max(bestScore, 62);
    if (candidate.length >= 4 && candidate.includes(home)) return Math.max(bestScore, 55);
    if (candidate.length >= 4 && home.includes(candidate)) return Math.max(bestScore, 45);

    return bestScore;
  }, 0);
}

function findProviderDepartment(provider, departments, siteProviderEntries = []) {
  const configuredDepartment = findConfiguredDepartmentForProvider(provider, departments, siteProviderEntries);
  if (configuredDepartment) return configuredDepartment;

  return findProviderDepartmentMatches(provider, departments, siteProviderEntries)[0]?.department || null;
}

function findProviderDepartmentMatches(provider, departments, siteProviderEntries = []) {
  const configuredDepartment = findConfiguredDepartmentForProvider(provider, departments, siteProviderEntries);
  if (configuredDepartment) {
    return [{ department: configuredDepartment, score: 1000 }];
  }

  return departments
    .map((department) => ({
      department,
      score: getProviderDepartmentMatchScore(provider, department, siteProviderEntries),
    }))
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score);
}

function getProviderDepartmentEntryKey({ provider, department }) {
  return `${String(provider?.providerid || "").trim()}:${String(department?.departmentid || "").trim()}`;
}

function uniqueProviderDepartmentEntries(entries = [], existingEntries = []) {
  const seen = new Set(existingEntries.map(getProviderDepartmentEntryKey));

  return entries.filter((entry) => {
    if (!entry?.provider || !entry?.department) return false;

    const key = getProviderDepartmentEntryKey(entry);
    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function buildProviderFallbackDepartmentEntries(
  requestedProviders,
  departments,
  siteProviderEntries,
  requestedDepartment,
  existingEntries = []
) {
  const entries = requestedProviders.flatMap((provider) => {
    const fallbackDepartments = requestedDepartment
      ? findProviderDepartmentMatches(provider, departments, siteProviderEntries).map(
          (match) => match.department
        )
      : departments;

    return fallbackDepartments.map((fallbackDepartment) => ({
      provider,
      department: fallbackDepartment,
    }));
  });

  return uniqueProviderDepartmentEntries(entries, existingEntries);
}

export function findProviderDepartmentForTest(provider, departments, siteProviderEntries = []) {
  return findProviderDepartment(provider, departments, siteProviderEntries);
}

export function findSiteProviderForTest(athenaProvider, siteProviders = []) {
  return findSiteProvider(athenaProvider, buildSiteProviderLookup(siteProviders));
}

function buildSiteProviderLookup(siteProviders) {
  return buildProviderResolverEntries(siteProviders);
}

function findSiteProvider(athenaProvider, siteProviderEntries) {
  const athenaKeys = getProviderSearchKeys(athenaProvider);
  if (athenaKeys.length === 0) return null;
  const athenaProviderId = String(athenaProvider.providerid || "").trim();

  if (athenaProviderId) {
    const idMatch = siteProviderEntries.find(
      (entry) => String(entry.provider.athenaProviderId || "").trim() === athenaProviderId
    );
    if (idMatch) return idMatch.provider;
  }

  const exactMatch = siteProviderEntries.find((entry) =>
    athenaKeys.some((athenaKey) => entry.keys.includes(athenaKey))
  );
  if (exactMatch) return exactMatch.provider;

  const substringMatch = siteProviderEntries.find((entry) =>
    athenaKeys.some((athenaKey) =>
      entry.keys.some((key) => key.includes(athenaKey) || athenaKey.includes(key))
    )
  );
  if (substringMatch) return substringMatch.provider;

  const athenaTokens = getProviderNameTokens(athenaProvider);
  const athenaFirstName = normalizeText(athenaProvider.firstname).split(/\s+/)[0] || athenaTokens[0] || "";
  const athenaLastName =
    normalizeText(athenaProvider.lastname).split(/\s+/)[0] ||
    athenaTokens[athenaTokens.length - 1] ||
    "";

  const tokenMatches = siteProviderEntries
    .map((entry) => {
      const firstNameMatched = athenaFirstName
        ? entry.tokens.some((token) => isNearTokenMatch(token, athenaFirstName))
        : false;
      const lastNameMatched = athenaLastName
        ? entry.tokens.some((token) => isNearTokenMatch(token, athenaLastName))
        : false;
      const matchCount = athenaTokens.filter((token) =>
        entry.tokens.some((entryToken) => isNearTokenMatch(entryToken, token))
      ).length;

      return {
        entry,
        firstNameMatched,
        lastNameMatched,
        matchCount,
      };
    })
    .filter(
      (match) =>
        match.firstNameMatched &&
        match.lastNameMatched &&
        match.matchCount >= Math.min(2, athenaTokens.length)
    )
    .sort((first, second) => second.matchCount - first.matchCount);

  return tokenMatches[0]?.entry.provider || null;
}

function isSameSiteProvider(firstProvider, secondProvider) {
  if (!firstProvider || !secondProvider) return false;
  const firstSlug = String(firstProvider.slug || "").trim();
  const secondSlug = String(secondProvider.slug || "").trim();
  if (firstSlug && secondSlug) return firstSlug === secondSlug;

  return compactText(firstProvider.name) === compactText(secondProvider.name);
}

function findRequestedSiteProviders(query, siteProviderEntries) {
  const resolution = resolveProviderSearch(query, siteProviderEntries, { entries: true, limit: MAX_RESULTS });
  return resolution.scoredEntries.map((entry) => ({
    ...entry,
    score: entry.score,
  }));
}

export function findRequestedSiteProvidersForTest(query, siteProviders = []) {
  return findRequestedSiteProviders(query, buildSiteProviderLookup(siteProviders)).map((entry) => ({
    name: entry.provider.name,
    slug: entry.provider.slug,
    score: entry.score,
  }));
}

function getQueryTokens(query) {
  return normalizeText(query)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !PROVIDER_QUERY_STOPWORDS.has(token));
}

function getProviderNameTokens(provider, siteProvider = null) {
  const values = [
    getProviderName(provider),
    provider.schedulingname,
    provider.displayname,
    siteProvider?.name,
  ].filter(Boolean);

  return [
    ...new Set(
      values
        .flatMap((value) => normalizeText(value).split(/\s+/))
        .filter((token) => token.length > 1 && !["md", "pa", "np", "do"].includes(token))
    ),
  ];
}

function isNearTokenMatch(queryToken, providerToken) {
  return isNearProviderTokenMatch(queryToken, providerToken);
}

function queryHasToken(queryTokens, providerToken) {
  return queryTokens.some((queryToken) => isNearTokenMatch(queryToken, providerToken));
}

function findMatchingQueryToken(queryTokens, providerToken) {
  return queryTokens.find((queryToken) => isNearTokenMatch(queryToken, providerToken)) || "";
}

function countTokenMatches(queryTokens, providerTokens) {
  return providerTokens.filter((providerToken) => queryHasToken(queryTokens, providerToken)).length;
}

function joinReadableList(values) {
  const usable = values.filter(Boolean);
  if (usable.length <= 1) return usable[0] || "";
  if (usable.length === 2) return `${usable[0]} and ${usable[1]}`;

  return `${usable.slice(0, -1).join(", ")}, and ${usable[usable.length - 1]}`;
}

function findRequestedProviders(query, providers, siteProviderEntries, requestedSiteProviderEntries = []) {
  const queryTokens = getQueryTokens(query);
  if (queryTokens.length === 0) return [];

  const requestedSiteProviders = requestedSiteProviderEntries.map((entry) => entry.provider);
  const hasRequestedSiteProviders = requestedSiteProviders.length > 0;
  const providerIntentTokens = getProviderIntentTokens(query);
  const firstNameCounts = new Map();
  const lastNameCounts = new Map();
  for (const provider of providers) {
    const firstName = normalizeText(provider.firstname).split(/\s+/)[0] || "";
    const lastName = normalizeText(provider.lastname).split(/\s+/)[0] || "";
    if (firstName) firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
    if (lastName) lastNameCounts.set(lastName, (lastNameCounts.get(lastName) || 0) + 1);
  }

  const compactQuery = compactText(query);
  const initialMatches = providers
    .map((provider) => {
      const siteProvider = findSiteProvider(provider, siteProviderEntries);
      const requestedSiteProviderMatched =
        hasRequestedSiteProviders &&
        requestedSiteProviders.some((requestedSiteProvider) =>
          isSameSiteProvider(siteProvider, requestedSiteProvider)
        );
      const names = [getProviderName(provider), provider.schedulingname, provider.displayname, siteProvider?.name]
        .filter(Boolean)
        .map((name) => ({
          raw: name,
          compact: compactText(name),
          tokens: getProviderNameTokens(provider, siteProvider),
        }));
      const firstName = normalizeText(provider.firstname).split(/\s+/)[0] || "";
      const lastName = normalizeText(provider.lastname).split(/\s+/)[0] || "";
      const firstNameMatchToken = firstName ? findMatchingQueryToken(queryTokens, firstName) : "";
      const lastNameMatchToken = lastName ? findMatchingQueryToken(queryTokens, lastName) : "";
      const firstNameMatched = Boolean(firstNameMatchToken);
      const lastNameMatched = Boolean(lastNameMatchToken);
      const firstNameUnique = firstName && firstNameCounts.get(firstName) === 1;
      const lastNameUnique = lastName && lastNameCounts.get(lastName) === 1;
      let score = 0;

      if (requestedSiteProviderMatched) {
        score = Math.max(score, 180);
      }

      if (
        names.some(
          (name) =>
            name.compact.length >= 5 &&
            (compactQuery.includes(name.compact) || name.compact.includes(compactQuery))
        )
      ) {
        score = Math.max(score, 140);
      }

      if (firstNameMatched && lastNameMatched) score = Math.max(score, 130);
      if (lastNameMatched && lastNameUnique) score = Math.max(score, 96);
      if (firstNameMatched && firstNameUnique && providerIntentTokens.length <= 1) {
        score = Math.max(score, 82);
      }

      const bestTokenMatchCount = names.reduce(
        (best, name) => Math.max(best, countTokenMatches(queryTokens, name.tokens)),
        0
      );
      if (bestTokenMatchCount >= 2) score = Math.max(score, 84 + bestTokenMatchCount * 12);

      return {
        provider,
        siteProvider,
        firstNameMatchToken,
        lastNameMatched,
        score,
      };
    })
    .filter((match) => match.score >= 80)
    .filter((match) => !hasRequestedSiteProviders || match.score >= 180);

  const pairedFirstNameTokens = initialMatches
    .filter((match) => match.lastNameMatched && match.firstNameMatchToken)
    .map((match) => match.firstNameMatchToken);

  const matches = initialMatches
    .filter(
      (match) =>
        match.lastNameMatched ||
        !pairedFirstNameTokens.some((token) => token && token === match.firstNameMatchToken)
    )
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return getProviderName(first.provider).localeCompare(getProviderName(second.provider));
    });

  return matches
    .slice(0, hasRequestedSiteProviders ? requestedSiteProviders.length : MAX_RESULTS)
    .map((match) => match.provider);
}

function getSiteProviderCandidate(entry, fallbackScore = 0) {
  if (!entry?.provider) return null;

  return {
    name: entry.provider.name || "",
    slug: entry.provider.slug || "",
    title: entry.provider.title || "",
    locations: Array.isArray(entry.provider.locations) ? entry.provider.locations.slice(0, 2) : [],
    score: Number(entry.score || fallbackScore || 0),
  };
}

function getAthenaProviderCandidate(provider, siteProviderEntries, fallbackScore = 0) {
  if (!provider) return null;
  const siteProvider = findSiteProvider(provider, siteProviderEntries);

  return {
    name: siteProvider?.name || getProviderName(provider),
    slug: siteProvider?.slug || "",
    title: siteProvider?.title || provider.providertype || "",
    locations: Array.isArray(siteProvider?.locations) ? siteProvider.locations.slice(0, 2) : [],
    score: Number(fallbackScore || 0),
    providerId: provider.providerid || null,
  };
}

function dedupeProviderCandidates(candidates = []) {
  const seen = new Set();
  return candidates
    .filter((candidate) => candidate?.name)
    .filter((candidate) => {
      const key = candidate.slug || compactText(candidate.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

function hasProviderLikeAppointmentLanguage(query, requestedSiteProviderEntries = []) {
  if (requestedSiteProviderEntries.length > 0) return true;
  if (!PROVIDER_SCOPE_LANGUAGE_PATTERN.test(query)) return false;

  return getProviderIntentTokens(query).length > 0;
}

function isExplicitGlobalAppointmentScope(query, { requestedDateRange = null, requestedTime = null } = {}) {
  return Boolean(
    EXPLICIT_GLOBAL_APPOINTMENT_PATTERN.test(query) ||
      DATE_OR_RANGE_LANGUAGE_PATTERN.test(query) ||
      requestedDateRange ||
      requestedTime ||
      SERVICE_APPOINTMENT_REQUEST_PATTERN.test(query) ||
      CARE_VISIT_REQUEST_PATTERN.test(query)
  );
}

function buildAppointmentProviderResolution({
  query,
  department = null,
  requestedSiteProviderEntries = [],
  requestedProviders = [],
  siteProviderEntries = [],
  requestedDateRange = null,
  requestedTime = null,
} = {}) {
  const providerCandidates = dedupeProviderCandidates([
    ...requestedSiteProviderEntries.map((entry) => getSiteProviderCandidate(entry)),
    ...requestedProviders.map((provider) => getAthenaProviderCandidate(provider, siteProviderEntries, 180)),
  ]);
  const providerLikeQuery = hasProviderLikeAppointmentLanguage(query, requestedSiteProviderEntries);
  const explicitGlobal = isExplicitGlobalAppointmentScope(query, {
    requestedDateRange,
    requestedTime,
  });

  if (requestedProviders.length === 1) {
    return {
      appointmentIntent: true,
      scope: "provider",
      providerCandidates,
      resolvedProvider: getAthenaProviderCandidate(requestedProviders[0], siteProviderEntries, 180),
      resolvedProviders: [getAthenaProviderCandidate(requestedProviders[0], siteProviderEntries, 180)].filter(Boolean),
      confidence: providerCandidates[0]?.score >= 120 ? "high" : "medium",
      providerLikeQuery,
      shouldAllowGlobalFallback: false,
      globalAllowed: false,
      monitoringCode: "",
    };
  }

  if (requestedProviders.length === 0 && providerCandidates.length === 1) {
    return {
      appointmentIntent: true,
      scope: "provider",
      providerCandidates,
      resolvedProvider: providerCandidates[0],
      resolvedProviders: [providerCandidates[0]].filter(Boolean),
      confidence: providerCandidates[0].score >= 110 ? "high" : "medium",
      providerLikeQuery,
      shouldAllowGlobalFallback: false,
      globalAllowed: false,
      monitoringCode: "",
    };
  }

  if (
    requestedProviders.length === 0 &&
    providerCandidates.length > 1 &&
    providerCandidates[0].score >= 130 &&
    providerCandidates[0].score - providerCandidates[1].score >= 35
  ) {
    return {
      appointmentIntent: true,
      scope: "provider",
      providerCandidates,
      resolvedProvider: providerCandidates[0],
      resolvedProviders: [providerCandidates[0]].filter(Boolean),
      confidence: "medium",
      providerLikeQuery,
      shouldAllowGlobalFallback: false,
      globalAllowed: false,
      monitoringCode: "",
    };
  }

  if (requestedProviders.length > 1 || providerCandidates.length > 1) {
    return {
      appointmentIntent: true,
      scope: "unknown",
      providerCandidates,
      resolvedProvider: null,
      resolvedProviders: [],
      confidence: "low",
      providerLikeQuery: true,
      shouldAllowGlobalFallback: false,
      globalAllowed: false,
      monitoringCode: "provider_ambiguous",
    };
  }

  if (providerLikeQuery) {
    return {
      appointmentIntent: true,
      scope: "unknown",
      providerCandidates,
      resolvedProvider: null,
      resolvedProviders: [],
      confidence: "low",
      providerLikeQuery: true,
      shouldAllowGlobalFallback: false,
      globalAllowed: false,
      monitoringCode: "provider_like_unresolved",
    };
  }

  if (department) {
    return {
      appointmentIntent: true,
      scope: "location",
      providerCandidates: [],
      resolvedProvider: null,
      resolvedProviders: [],
      confidence: "high",
      providerLikeQuery: false,
      shouldAllowGlobalFallback: false,
      globalAllowed: false,
      monitoringCode: "",
    };
  }

  if (explicitGlobal) {
    return {
      appointmentIntent: true,
      scope: "global",
      providerCandidates: [],
      resolvedProvider: null,
      resolvedProviders: [],
      confidence: "medium",
      providerLikeQuery: false,
      shouldAllowGlobalFallback: true,
      globalAllowed: true,
      monitoringCode: "",
    };
  }

  return {
    appointmentIntent: true,
    scope: "unknown",
    providerCandidates: [],
    resolvedProvider: null,
    resolvedProviders: [],
    confidence: "low",
    providerLikeQuery: false,
    shouldAllowGlobalFallback: false,
    globalAllowed: false,
    monitoringCode: "global_scope_unclear",
  };
}

export function resolveAppointmentProviderResolutionForTest(query, siteProviders = [], options = {}) {
  const siteProviderEntries = buildSiteProviderLookup(siteProviders);
  const requestedSiteProviderEntries = findRequestedSiteProviders(query, siteProviderEntries);

  return buildAppointmentProviderResolution({
    query,
    department: options.department || null,
    requestedSiteProviderEntries,
    requestedProviders: [],
    siteProviderEntries,
    requestedDateRange: options.requestedDateRange || null,
    requestedTime: options.requestedTime || null,
  });
}

function formatAthenaDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function formatMinutesAsTimeLabel(minutes) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function parseClockTime(hourValue, minuteValue, meridiemValue = "") {
  let hour = Number.parseInt(hourValue, 10);
  const minute = Number.parseInt(minuteValue || "0", 10);
  const meridiem = String(meridiemValue || "").toLowerCase().replace(/\./g, "");

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem.startsWith("p") && hour !== 12) hour += 12;
    if (meridiem.startsWith("a") && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }

  const minutes = hour * 60 + minute;
  return {
    hour,
    minute,
    minutes,
    label: formatMinutesAsTimeLabel(minutes),
  };
}

function parseRequestedTime(query) {
  const match = String(query || "").match(REQUESTED_TIME_PATTERN);
  if (!match) return null;

  if (match[1]) {
    return parseClockTime(match[1], match[2] || "0", match[3]);
  }

  return parseClockTime(match[4], match[5]);
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getNextWeekday(baseDate, weekdayIndex) {
  const today = startOfLocalDay(baseDate);
  const delta = (weekdayIndex - today.getDay() + 7) % 7;
  return addDays(today, delta);
}

function normalizeDateYear(value) {
  if (!value) return null;
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 100) return 2000 + numeric;
  return numeric;
}

function buildSpecificDateRange(monthIndex, dayValue, yearValue, today) {
  const day = Number.parseInt(dayValue, 10);
  if (!Number.isInteger(monthIndex) || !Number.isInteger(day)) return null;

  const explicitYear = Boolean(yearValue);
  let year = explicitYear ? normalizeDateYear(yearValue) : today.getFullYear();
  if (!year) return null;

  let date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  if (!explicitYear && date < today) {
    year += 1;
    date = new Date(year, monthIndex, day);
  }

  const label = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(explicitYear || date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });

  return {
    label,
    start: date,
    end: date,
    explicit: true,
  };
}

function parseRequestedDateRange(query, baseDate = new Date()) {
  const text = String(query || "");
  const normalized = normalizeText(text);
  const today = startOfLocalDay(baseDate);

  if (/\btoday\b/.test(normalized)) {
    return {
      label: "today",
      start: today,
      end: today,
      explicit: true,
    };
  }

  if (/\btomorrow\b/.test(normalized)) {
    const tomorrow = addDays(today, 1);
    return {
      label: "tomorrow",
      start: tomorrow,
      end: tomorrow,
      explicit: true,
    };
  }

  const nextDaysMatch = text.match(NEXT_DAYS_PATTERN);
  if (nextDaysMatch) {
    const days = Math.min(Math.max(Number.parseInt(nextDaysMatch[1], 10) || 0, 1), EXTENDED_PROVIDER_LOOKAHEAD_DAYS);
    const end = addDays(today, days);
    return {
      label: `next ${days} days`,
      start: today,
      end,
      explicit: true,
      days,
    };
  }

  const isoMatch = text.match(ISO_DATE_PATTERN);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIndex = Number.parseInt(isoMatch[2], 10) - 1;
    const range = buildSpecificDateRange(monthIndex, isoMatch[3], year, today);
    if (range) return range;
  }

  const monthDayMatch = text.match(MONTH_DAY_PATTERN);
  if (monthDayMatch) {
    const monthIndex = MONTH_INDEX_BY_TOKEN[normalizeText(monthDayMatch[1])];
    const range = buildSpecificDateRange(monthIndex, monthDayMatch[2], monthDayMatch[3], today);
    if (range) return range;
  }

  const dayMonthMatch = text.match(DAY_MONTH_PATTERN);
  if (dayMonthMatch) {
    const monthIndex = MONTH_INDEX_BY_TOKEN[normalizeText(dayMonthMatch[2])];
    const range = buildSpecificDateRange(monthIndex, dayMonthMatch[1], dayMonthMatch[3], today);
    if (range) return range;
  }

  const numericDateMatch = text.match(NUMERIC_DATE_PATTERN);
  if (numericDateMatch) {
    const monthIndex = Number.parseInt(numericDateMatch[1], 10) - 1;
    const range = buildSpecificDateRange(
      monthIndex,
      numericDateMatch[2],
      numericDateMatch[3],
      today
    );
    if (range) return range;
  }

  const ordinalDayMatch = text.match(ORDINAL_DAY_OF_MONTH_PATTERN);
  if (ordinalDayMatch) {
    const currentMonthRange = buildSpecificDateRange(
      today.getMonth(),
      ordinalDayMatch[1],
      today.getFullYear(),
      today
    );

    if (currentMonthRange && currentMonthRange.start >= today) {
      return {
        ...currentMonthRange,
        explicit: true,
      };
    }

    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthRange = buildSpecificDateRange(
      nextMonth.getMonth(),
      ordinalDayMatch[1],
      nextMonth.getFullYear(),
      today
    );

    if (nextMonthRange) {
      return {
        ...nextMonthRange,
        explicit: true,
      };
    }
  }

  const weekdayMatch = normalized.match(REQUESTED_WEEKDAY_PATTERN);
  const weekdayIndex = WEEKDAY_INDEX_BY_TOKEN[weekdayMatch?.[1] || ""];
  if (Number.isInteger(weekdayIndex)) {
    const requestedDay = getNextWeekday(today, weekdayIndex);
    return {
      label: WEEKDAY_LABELS[weekdayIndex],
      start: requestedDay,
      end: requestedDay,
      explicit: true,
    };
  }

  if (/\bthis\s+week\b/.test(normalized)) {
    return {
      label: "this week",
      start: today,
      end: addDays(today, 7),
      explicit: true,
    };
  }

  if (/\bnext\s+week\b/.test(normalized)) {
    return {
      label: "next week",
      start: addDays(today, 7),
      end: addDays(today, 14),
      explicit: true,
    };
  }

  return null;
}

function formatDateRangePhrase(label = "", lookaheadDays = DEFAULT_LOOKAHEAD_DAYS) {
  const normalized = normalizeText(label);
  if (!normalized) return `in the next ${lookaheadDays} days`;
  if (normalized === "today") return "today";
  if (normalized === "tomorrow") return "tomorrow";
  if (normalized === "this week" || normalized === "next week") return `for ${label}`;
  if (WEEKDAY_LABELS.some((weekday) => normalizeText(weekday) === normalized)) {
    return `on ${label}`;
  }
  return `for ${label}`;
}

export function parseRequestedDateRangeForTest(query, baseDate = new Date()) {
  const range = parseRequestedDateRange(query, baseDate);
  if (!range) return null;

  return {
    label: range.label,
    startdate: formatAthenaDate(range.start),
    enddate: formatAthenaDate(range.end),
  };
}

function parseSlotStartMinutes(value = "") {
  const time = String(value || "").trim();
  const twelveHourMatch = time.match(/^(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (twelveHourMatch) {
    return parseClockTime(twelveHourMatch[1], twelveHourMatch[2] || "0", twelveHourMatch[3])?.minutes ?? null;
  }

  const twentyFourHourMatch = time.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!twentyFourHourMatch) return null;

  return parseClockTime(twentyFourHourMatch[1], twentyFourHourMatch[2])?.minutes ?? null;
}

function formatSlotTimeLabel(value = "") {
  const minutes = parseSlotStartMinutes(value);
  return minutes === null ? String(value || "").trim() : formatMinutesAsTimeLabel(minutes);
}

function formatReadableSlotDate(slot) {
  const date = String(slot.date || slot.appointmentdate || "").trim();
  const time = formatSlotTimeLabel(slot.starttime);
  if (!date && !time) return "Time not listed";

  const [month, day, year] = date.split("/");
  const dateObject =
    month && day && year
      ? new Date(Number(year), Number(month) - 1, Number(day))
      : null;
  const dateLabel =
    dateObject && !Number.isNaN(dateObject.getTime())
      ? dateObject.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : date;

  return [dateLabel, time].filter(Boolean).join(" at ");
}

function getSlotSortValue(option) {
  const date = String(option.date || "").trim();
  const time = String(option.startTime || "").trim();
  const [month, day, year] = date.split("/").map((part) => Number.parseInt(part, 10));
  if (!month || !day || !year) return `${date} ${time}`;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${time}`;
}

function getAppointmentOptionRank(option, context = {}) {
  const requestedProviderIds = new Set(
    (context.requestedProviders || []).map((provider) => String(provider.providerid || ""))
  );
  const requestedDepartmentIds = new Set(
    [
      context.requestedDepartment,
      ...(Array.isArray(context.requestedDepartments) ? context.requestedDepartments : []),
    ]
      .filter(Boolean)
      .map((department) => String(department.departmentid || ""))
      .filter(Boolean)
  );
  const requestedStartdate = context.requestedDateRange
    ? formatAthenaDate(context.requestedDateRange.start)
    : "";
  const directBookingUrl =
    option.bookingUrl && option.bookingUrl !== GENERAL_BOOK_APPOINTMENT_URL;
  let score = 0;

  if (requestedProviderIds.size > 0 && requestedProviderIds.has(String(option.providerId))) {
    score += 120;
  }
  if (requestedDepartmentIds.size > 0 && requestedDepartmentIds.has(String(option.departmentId))) {
    score += 80;
  }
  if (requestedStartdate && option.date === requestedStartdate) {
    score += 70;
  }
  if (option.slotMatchType === "exact") score += 60;
  if (option.slotMatchType === "earliest") score += 20;
  if (directBookingUrl) score += 12;
  if (option.providerUrl) score += 5;

  return score;
}

function sortAppointmentOptions(options, context = {}) {
  return [...options].sort((first, second) => {
    const scoreDelta = getAppointmentOptionRank(second, context) - getAppointmentOptionRank(first, context);
    if (scoreDelta !== 0) return scoreDelta;
    return getSlotSortValue(first).localeCompare(getSlotSortValue(second));
  });
}

function selectAppointmentOptions(options, context = {}) {
  const resultLimit = normalizePositiveInteger(
    context.maxResults,
    MAX_RESULTS,
    MAX_REQUESTED_RESULTS
  );

  return sortAppointmentOptions(options, context)
    .slice(0, resultLimit)
    .map((option) => {
      const rank = getAppointmentOptionRank(option, context);
      return {
        ...option,
        matchConfidence: rank >= 180 ? "high" : rank >= 90 ? "medium" : "low",
      };
    });
}

async function getAppointmentReasons(config, accessToken, provider, department) {
  const response = await athenaGet(
    config,
    accessToken,
    addQuery(`/v1/${encodeURIComponent(config.practiceId)}/patientappointmentreasons`, {
      providerid: provider.providerid,
      departmentid: department.departmentid,
      limit: 100,
    })
  );

  if (!response.ok) return [];

  const reasons = Array.isArray(response.body?.patientappointmentreasons)
    ? response.body.patientappointmentreasons
    : [];
  const reasonByName = new Map(reasons.map((reason) => [normalizeText(reason.reason), reason]));
  const prioritized = APPOINTMENT_REASON_PRIORITY.map((name) => reasonByName.get(normalizeText(name))).filter(
    Boolean
  );
  const rest = reasons.filter((reason) => !prioritized.includes(reason));

  return [...prioritized, ...rest].slice(0, 4);
}

async function getProviderOpenSlots(
  config,
  accessToken,
  provider,
  department,
  reasons,
  startdate,
  enddate,
  requestedTime = null,
  maxSlots = 1
) {
  const slotByKey = new Map();

  for (const reason of reasons) {
    const reasonid = reason.reasonid || reason.appointmentreasonid || reason.patientappointmentreasonid;
    if (!reasonid) continue;

    const response = await athenaGet(
      config,
      accessToken,
      addQuery(`/v1/${encodeURIComponent(config.practiceId)}/appointments/open`, {
        departmentid: department.departmentid,
        providerid: provider.providerid,
        reasonid,
        startdate,
        enddate,
        limit: requestedTime ? TIME_SLOT_LIMIT : OPEN_SLOT_LIMIT,
      })
    );

    if (!response.ok) continue;

    const appointments = Array.isArray(response.body?.appointments)
      ? response.body.appointments
      : [];
    for (const appointment of appointments) {
      const key = [
        appointment.appointmentid,
        appointment.date || appointment.appointmentdate,
        appointment.starttime,
      ]
        .filter(Boolean)
        .join("|");

      if (!slotByKey.has(key)) {
        slotByKey.set(key, {
          ...appointment,
          reason: reason.reason || "",
          reasonid,
        });
      }
    }
  }

  const sortedSlots = Array.from(slotByKey.values()).sort((first, second) =>
    `${first.date || first.appointmentdate || ""} ${first.starttime || ""}`.localeCompare(
      `${second.date || second.appointmentdate || ""} ${second.starttime || ""}`
    )
  );

  if (!requestedTime) {
    return sortedSlots.slice(0, maxSlots).map((slot) => ({
      ...slot,
      slotMatchType: "earliest",
    }));
  }

  const exactSlots = sortedSlots.filter(
    (slot) => parseSlotStartMinutes(slot.starttime) === requestedTime.minutes
  );
  if (exactSlots.length > 0) {
    return exactSlots.slice(0, maxSlots).map((slot) => ({
      ...slot,
      slotMatchType: "exact",
    }));
  }

  return sortedSlots
    .slice(0, maxSlots)
    .map((slot) => ({
      ...slot,
      slotMatchType: "fallback",
    }));
}

export function isAppointmentAvailabilityQuery(query) {
  const normalized = normalizeText(query);
  if (
    !normalized ||
    NON_APPOINTMENT_AVAILABILITY_PATTERN.test(normalized) ||
    APPOINTMENT_POLICY_PATTERN.test(normalized)
  ) return false;

  const hasAppointmentWord = APPOINTMENT_WORD_PATTERN.test(normalized);
  const hasAvailabilityWord = AVAILABILITY_WORD_PATTERN.test(normalized);
  const hasProviderActionLanguage =
    PROVIDER_ACTION_LANGUAGE_PATTERN.test(normalized) && getProviderIntentTokens(normalized).length > 0;
  const hasProviderTimeRequest = PROVIDER_TIME_REQUEST_PATTERN.test(normalized);

  return (
    hasProviderTimeRequest ||
    (APPOINTMENT_INTENT_PATTERN.test(normalized) &&
    (LOCATION_PATTERN.test(normalized) ||
      FAST_APPOINTMENT_PATTERN.test(normalized) ||
      DATE_OR_RANGE_LANGUAGE_PATTERN.test(normalized) ||
      Boolean(parseRequestedDateRange(query)) ||
      Boolean(parseRequestedTime(query)) ||
      AVAILABILITY_REQUEST_PATTERN.test(normalized) ||
      PROVIDER_APPOINTMENT_REQUEST_PATTERN.test(normalized) ||
      CARE_VISIT_REQUEST_PATTERN.test(normalized) ||
      SERVICE_APPOINTMENT_REQUEST_PATTERN.test(normalized) ||
      hasProviderActionLanguage ||
      (hasAppointmentWord && PROVIDER_SCOPE_LANGUAGE_PATTERN.test(normalized)) ||
      (hasAppointmentWord && hasAvailabilityWord)))
  );
}

function buildAthenaAvailabilityFallback(
  code = "appointment_availability_unavailable",
  answer = ATHENA_UNAVAILABLE_ANSWER
) {
  return {
    ok: true,
    code,
    answer,
    options: [],
    sources: [
      {
        title: "Schedule Appointment",
        url: GENERAL_BOOK_APPOINTMENT_URL,
        type: "appointment",
      },
    ],
    citations: ["Appointment availability"],
    disclaimer: true,
    recoveryActions: [
      {
        type: "link",
        label: "Book online",
        value: "book_online",
        href: GENERAL_BOOK_APPOINTMENT_URL,
      },
      {
        type: "link",
        label: "Call office",
        value: "call_office",
        href: "tel:+13015152901",
      },
    ],
    meta: {
      availabilityStatus: "unavailable",
      code,
    },
  };
}

function buildAppointmentRecoveryActions({
  requestedProviderNames = [],
  department = null,
  locationName = "",
  requestedDateRange = null,
  lookaheadDays = DEFAULT_LOOKAHEAD_DAYS,
} = {}) {
  const providerLabel = joinReadableList(requestedProviderNames);
  const providerQuery = providerLabel ? ` for ${providerLabel}` : "";
  const locationQuery = department && locationName ? ` in ${locationName}` : "";
  const actions = [];

  if (!requestedDateRange && lookaheadDays < 60) {
    actions.push({
      type: "query",
      label: "Search next 60 days",
      value: "next_60_days",
      query: `show available appointments${providerQuery}${locationQuery} in the next 60 days`,
    });
  }

  if (requestedProviderNames.length > 0 && department) {
    actions.push({
      type: "query",
      label: "Show other locations",
      value: "other_locations",
      query: `show available appointments for ${providerLabel} in the next 60 days`,
    });
  }

  actions.push({
    type: "query",
    label: "Show similar providers",
    value: "similar_providers",
    query: department && locationName
      ? `show providers at ${locationName}`
      : "show primary care providers",
  });

  actions.push({
    type: "link",
    label: "Call office",
    value: "call_office",
    href: "tel:+13015152901",
  });

  return actions.slice(0, 4);
}

function buildProviderResolutionFallbackResult(providerResolution, lookaheadDays, department = null) {
  const providerCandidates = Array.isArray(providerResolution?.providerCandidates)
    ? providerResolution.providerCandidates
    : [];
  const isVagueGlobalScope = providerResolution?.monitoringCode === "global_scope_unclear";
  const locationName = department ? getDepartmentName(department) : "First Medical Associates";
  const candidateSources = providerCandidates
    .filter((candidate) => candidate?.name && candidate?.slug)
    .map((candidate) => ({
      title: candidate.name,
      url: normalizeInternalPageHref(`/providers/${candidate.slug}`),
      type: "provider",
      category: [candidate.title, ...(candidate.locations || []).slice(0, 1)]
        .filter(Boolean)
        .join(" | "),
    }))
    .slice(0, MAX_RESULTS);
  const answer = isVagueGlobalScope
    ? "I can help search current appointment availability, but I need a provider, location, date, or a first-available request. Try asking for a specific provider, location, date, or the soonest available appointment."
    : "I could not confidently match that provider for appointment availability. Please use the provider's full name, open the provider directory, or call 301-515-2901 so the team can help confirm current appointment times.";

  return {
    ok: true,
    code: providerResolution?.monitoringCode || "provider_match_needed",
    answer,
    options: [],
    sources:
      candidateSources.length > 0
        ? candidateSources
        : [{ title: "Find a Provider", url: "/providers/", type: "provider" }],
    citations: ["Appointment search"],
    disclaimer: true,
    recoveryActions: [
      {
        type: "query",
        label: "First available",
        value: "first_available",
        query: "show first available appointments",
      },
      {
        type: "link",
        label: "Find a Provider",
        value: "providers",
        href: "/providers/",
      },
      {
        type: "link",
        label: "Call office",
        value: "call_office",
        href: "tel:+13015152901",
      },
    ],
    meta: {
      availabilityStatus: isVagueGlobalScope ? "appointment_scope_needed" : "provider_match_needed",
      locationName,
      requestedProviderIds: [],
      requestedProviderNames: [],
      providerCountChecked: 0,
      lookaheadDays,
      providerResolution,
    },
  };
}

function buildProviderSchedulingNotConfirmedResult(
  siteProviderEntries,
  lookaheadDays,
  department = null,
  providerResolution = null
) {
  const providers = siteProviderEntries.map((entry) => entry.provider).filter(Boolean);
  const providerNames = providers.map((provider) => provider.name).filter(Boolean);
  const providerLabel = joinReadableList(providerNames) || "that provider";
  const locationName = department ? getDepartmentName(department) : "First Medical Associates";
  const primaryBookingUrl =
    providers.find((provider) => provider.linkUrl)?.linkUrl || GENERAL_BOOK_APPOINTMENT_URL;
  const sources = providers
    .filter((provider) => provider.slug)
    .map((provider) => ({
      title: provider.name,
      url: normalizeInternalPageHref(`/providers/${provider.slug}`),
      type: "provider",
    }))
    .slice(0, MAX_RESULTS);

  return {
    ok: true,
    code: "provider_schedule_not_confirmed",
    answer: `I found ${providerLabel} in the FMA provider directory, but I could not confirm current online appointment times for ${providerLabel} in the next ${lookaheadDays} days. Please use online booking or call 301-515-2901 so the team can confirm current availability.`,
    options: [],
    sources:
      sources.length > 0
        ? sources
        : [
            {
              title: "Schedule Appointment",
              url: primaryBookingUrl,
              type: "appointment",
            },
          ],
    citations: ["Appointment availability"],
    disclaimer: true,
    recoveryActions: buildAppointmentRecoveryActions({
      requestedProviderNames: providerNames,
      department,
      locationName,
      lookaheadDays,
    }),
    meta: {
      availabilityStatus: "provider_schedule_not_confirmed",
      locationName,
      requestedProviderIds: [],
      requestedProviderNames: providerNames,
      providerCountChecked: 0,
      lookaheadDays,
      providerResolution,
    },
  };
}

async function getLiveAppointmentAvailabilityForQuery(query, options = {}) {
  if (!options.skipIntentCheck && !(await shouldCheckAppointmentAvailability(query))) {
    return null;
  }

  const config = getAthenaConfig();
  if (!config.ok) {
    return buildAthenaAvailabilityFallback("appointment_availability_not_configured");
  }

  const accessToken = await getAccessToken(config);
  const { departments, providers, siteProviders } = await loadReferenceData(config, accessToken);
  const requestedDepartments = findRequestedDepartments(query, departments);
  const department = requestedDepartments[0] || null;
  const requestedTime = parseRequestedTime(query);
  const lookaheadDays = Number(options.days || DEFAULT_LOOKAHEAD_DAYS);
  const maxResults = normalizePositiveInteger(
    options.maxResults,
    MAX_RESULTS,
    MAX_REQUESTED_RESULTS
  );
  const providerCheckLimit = normalizePositiveInteger(
    options.providerCheckLimit,
    MAX_PROVIDER_CHECKS,
    MAX_REQUESTED_PROVIDER_CHECKS
  );
  const requestedDateRange = parseRequestedDateRange(query);

  const siteProviderEntries = buildSiteProviderLookup(siteProviders);
  const requestedSiteProviderEntries = findRequestedSiteProviders(query, siteProviderEntries);
  const schedulableProviders = providers.filter(isSchedulableProvider);
  const requestedProviders = findRequestedProviders(
    query,
    schedulableProviders,
    siteProviderEntries,
    requestedSiteProviderEntries
  );
  const providerResolution = buildAppointmentProviderResolution({
    query,
    department,
    requestedSiteProviderEntries,
    requestedProviders,
    siteProviderEntries,
    requestedDateRange,
    requestedTime,
  });

  if (providerResolution.scope === "unknown") {
    return buildProviderResolutionFallbackResult(
      providerResolution,
      lookaheadDays,
      department
    );
  }

  if (requestedSiteProviderEntries.length > 0 && requestedProviders.length === 0) {
    return buildProviderSchedulingNotConfirmedResult(
      requestedSiteProviderEntries,
      lookaheadDays,
      department,
      providerResolution
    );
  }

  const start = requestedDateRange?.start || new Date();
  const end = requestedDateRange?.end || new Date(start);
  if (!requestedDateRange) end.setDate(start.getDate() + lookaheadDays);
  const startdate = formatAthenaDate(start);
  const enddate = formatAthenaDate(end);
  let resultEnddate = enddate;
  let resultLookaheadDays = lookaheadDays;
  let resultDateRangeLabel = requestedDateRange?.label || "";
  const requestedDepartmentEntries = requestedDepartments.length > 0
    ? requestedDepartments
    : department
      ? [department]
      : [];

  const providerLocationEntries = requestedProviders.length > 0
    ? requestedProviders
        .map((provider) => ({
          provider,
          department:
            requestedDepartmentEntries.find((requestedDepartment) =>
              matchDepartmentForProvider(provider, requestedDepartment, siteProviderEntries)
            ) ||
            (department && matchDepartmentForProvider(provider, department, siteProviderEntries)
              ? department
              : findProviderDepartment(provider, departments, siteProviderEntries)),
        }))
        .filter((entry) => entry.department)
    : requestedDepartmentEntries.length > 0
    ? uniqueProviderDepartmentEntries(
        schedulableProviders.flatMap((provider) =>
          requestedDepartmentEntries
            .filter((requestedDepartment) =>
              matchDepartmentForProvider(provider, requestedDepartment, siteProviderEntries)
            )
            .map((requestedDepartment) => ({ provider, department: requestedDepartment }))
        )
      )
        .slice(0, providerCheckLimit)
    : schedulableProviders
        .map((provider) => ({
          provider,
          department: findProviderDepartment(provider, departments, siteProviderEntries),
        }))
        .filter((entry) => entry.department)
        .slice(0, MAX_GLOBAL_PROVIDER_CHECKS);

  if (requestedProviders.length > 0 && providerLocationEntries.length === 0) {
    return buildProviderSchedulingNotConfirmedResult(
      requestedProviders.map((provider) => ({
        provider: findSiteProvider(provider, siteProviderEntries) || {
          name: getProviderName(provider),
          slug: "",
          linkUrl: "",
        },
      })),
      lookaheadDays,
      department,
      providerResolution
    );
  }

  const providerCacheKey =
    requestedProviders.map((provider) => provider.providerid).sort().join(",") || "any-provider";
  const departmentCacheKey =
    requestedDepartmentEntries.map((entry) => entry.departmentid).sort().join(",") ||
    department?.departmentid ||
    "all";
  const cacheKey = `${config.practiceId}:${departmentCacheKey}:${providerCacheKey}:${startdate}:${enddate}:${
    requestedTime?.minutes ?? "any"
  }:${maxResults}:${providerCheckLimit}`;
  const cachedAvailability = availabilityCache.get(cacheKey);
  if (cachedAvailability?.expiresAt > Date.now()) {
    return cachedAvailability.value;
  }

  const loadAppointmentOptions = (entries, rangeStartdate = startdate, rangeEnddate = resultEnddate) =>
    runWithConcurrency(entries, PROVIDER_LOOKUP_CONCURRENCY, async ({ provider, department: providerDepartment }) => {
      if (!providerDepartment) return null;

      const reasons = await getAppointmentReasons(config, accessToken, provider, providerDepartment);
      if (reasons.length === 0) return null;

      const slots = await getProviderOpenSlots(
        config,
        accessToken,
        provider,
        providerDepartment,
        reasons,
        rangeStartdate,
        rangeEnddate,
        requestedTime,
        requestedProviders.length > 0 ? PROVIDER_SLOT_LIMIT : 1
      );
      if (slots.length === 0) return null;

      const siteProvider = findSiteProvider(provider, siteProviderEntries);
      const providerName = siteProvider?.name || getProviderName(provider);
      const bookingUrl = siteProvider?.linkUrl || GENERAL_BOOK_APPOINTMENT_URL;

      return slots.map((slot) => ({
        providerId: provider.providerid,
        providerName,
        providerTitle: siteProvider?.title || provider.providertype || "",
        providerSlug: siteProvider?.slug || "",
        providerUrl: siteProvider?.slug
          ? normalizeInternalPageHref(`/providers/${siteProvider.slug}`)
          : "",
        bookingUrl,
        locationName: getDepartmentName(providerDepartment),
        departmentId: providerDepartment.departmentid,
        date: slot.date || slot.appointmentdate || "",
        startTime: slot.starttime || "",
        duration: slot.duration || null,
        reason: slot.reason || "",
        appointmentTypeId: slot.appointmenttypeid || null,
        displayTime: formatReadableSlotDate(slot),
        slotMatchType: slot.slotMatchType || (requestedTime ? "fallback" : "earliest"),
        requestedTimeLabel: requestedTime?.label || "",
      }));
    });

  let checkedProviderLocationEntries = providerLocationEntries;
  let appointmentOptions = await loadAppointmentOptions(providerLocationEntries);
  let rawOptions = appointmentOptions.flat().filter(Boolean);

  // Provider-specific searches run in phases so a bad or incomplete primary mapping does not hide real openings.
  if (rawOptions.length === 0 && requestedProviders.length > 0) {
    const fallbackProviderLocationEntries = buildProviderFallbackDepartmentEntries(
      requestedProviders,
      departments,
      siteProviderEntries,
      department,
      providerLocationEntries
    );

    if (fallbackProviderLocationEntries.length > 0) {
      checkedProviderLocationEntries = [
        ...providerLocationEntries,
        ...fallbackProviderLocationEntries,
      ];
      appointmentOptions = await loadAppointmentOptions(fallbackProviderLocationEntries);
      const fallbackRawOptions = appointmentOptions.flat().filter(Boolean);
      if (fallbackRawOptions.length > 0) rawOptions = fallbackRawOptions;
    }
  }

  if (
    rawOptions.length === 0 &&
    requestedProviders.length > 0 &&
    !department &&
    !requestedDateRange &&
    EXTENDED_PROVIDER_LOOKAHEAD_DAYS > lookaheadDays
  ) {
    const extendedEnd = new Date(start);
    extendedEnd.setDate(start.getDate() + EXTENDED_PROVIDER_LOOKAHEAD_DAYS);
    const extendedEnddate = formatAthenaDate(extendedEnd);
    const extendedProviderLocationEntries = uniqueProviderDepartmentEntries(
      requestedProviders.flatMap((provider) =>
        departments.map((fallbackDepartment) => ({ provider, department: fallbackDepartment }))
      )
    );
    const extendedAppointmentOptions = await loadAppointmentOptions(
      extendedProviderLocationEntries,
      startdate,
      extendedEnddate
    );
    const extendedRawOptions = extendedAppointmentOptions.flat().filter(Boolean);

    checkedProviderLocationEntries = extendedProviderLocationEntries;
    resultEnddate = extendedEnddate;
    resultLookaheadDays = EXTENDED_PROVIDER_LOOKAHEAD_DAYS;
    resultDateRangeLabel = "";
    if (extendedRawOptions.length > 0) rawOptions = extendedRawOptions;
  }

  const hasExactTimeMatches = requestedTime
    ? rawOptions.some((option) => option.slotMatchType === "exact")
    : false;
  const candidateOptions =
    requestedTime && hasExactTimeMatches
      ? rawOptions.filter((option) => option.slotMatchType === "exact")
      : rawOptions;

  const sortedOptions = selectAppointmentOptions(candidateOptions, {
    requestedProviders,
    requestedDepartment: department,
    requestedDepartments: requestedDepartmentEntries,
    requestedDateRange,
    requestedTime,
    maxResults,
  });

  const requestedProviderNames = requestedProviders.map((provider) => {
    const siteProvider = findSiteProvider(provider, siteProviderEntries);
    return siteProvider?.name || getProviderName(provider);
  });
  const requestedDepartmentNames = [
    ...new Set(requestedDepartmentEntries.map((entry) => getDepartmentName(entry)).filter(Boolean)),
  ];
  const locationName =
    requestedDepartmentNames.length > 1
      ? joinReadableList(requestedDepartmentNames)
      : department
        ? getDepartmentName(department)
        : "all First Medical Associates locations";
  const answerTarget =
    requestedProviderNames.length > 0
      ? `${joinReadableList(requestedProviderNames)}${department ? ` at ${locationName}` : ""}`
      : locationName;
  const optionLocationNames = new Set(sortedOptions.map((option) => option.locationName).filter(Boolean));
  const shouldShowOptionLocation = !department && optionLocationNames.size > 0;
  const describeAppointmentOption = (option) => {
    if (requestedProviderNames.length === 1) {
      return shouldShowOptionLocation && option.locationName
        ? `${option.displayTime} at ${option.locationName}`
        : option.displayTime;
    }
    if (department || requestedProviderNames.length > 0) {
      return `${option.providerName} on ${option.displayTime}`;
    }

    return `${option.providerName} at ${option.locationName} on ${option.displayTime}`;
  };
  const appointmentList = sortedOptions.map(describeAppointmentOption).join(", ");
  const answerRangePhrase = formatDateRangePhrase(resultDateRangeLabel, resultLookaheadDays);
  const answer =
    sortedOptions.length > 0 && requestedTime && hasExactTimeMatches
      ? `I found ${requestedTime.label} openings for ${answerTarget}: ${appointmentList}. Use the booking links below to schedule, and call 301-515-2901 if you need help confirming availability.`
      : sortedOptions.length > 0 && requestedTime
        ? `I checked current appointment availability for ${answerTarget}, but did not find exact ${requestedTime.label} openings ${answerRangePhrase}. The earliest alternatives I found are ${sortedOptions
            .map(describeAppointmentOption)
            .join(", ")}. Use the booking links below to schedule, and call 301-515-2901 if you need help confirming availability.`
        : sortedOptions.length > 0
          ? `${requestedProviderNames.length > 0 ? "I found these available times" : "The quickest openings I found"} for ${answerTarget}: ${appointmentList}. Use the booking links below to schedule, and call 301-515-2901 if you need help confirming availability.`
          : requestedTime
            ? `I checked current appointment availability for ${answerTarget}, but did not find open online appointments at ${requestedTime.label} ${answerRangePhrase}. Please call 301-515-2901 or use online booking to confirm availability.`
            : `I checked current appointment availability for ${answerTarget}, but did not find open online appointments ${answerRangePhrase}. Please call 301-515-2901 or use online booking to confirm availability.`;

  const providerSourceUrls = new Set();
  const providerSources = sortedOptions
    .filter((option) => option.providerUrl)
    .filter((option) => {
      if (providerSourceUrls.has(option.providerUrl)) return false;
      providerSourceUrls.add(option.providerUrl);
      return true;
    })
    .map((option) => ({
      title: option.providerName,
      url: option.providerUrl,
      type: "provider",
    }));
  const requestedProviderSourceUrls = new Set();
  const requestedProviderSources = requestedProviders
    .map((provider) => {
      const siteProvider = findSiteProvider(provider, siteProviderEntries);
      if (!siteProvider?.slug) return null;

      return {
        title: siteProvider.name || getProviderName(provider),
        url: normalizeInternalPageHref(`/providers/${siteProvider.slug}`),
        type: "provider",
      };
    })
    .filter(Boolean)
    .filter((source) => {
      if (requestedProviderSourceUrls.has(source.url)) return false;
      requestedProviderSourceUrls.add(source.url);
      return true;
    });

  const result = {
    ok: true,
    answer,
    options: sortedOptions,
    sources:
      providerSources.length > 0
        ? providerSources
        : requestedProviderSources.length > 0
          ? requestedProviderSources
          : [
              {
                title: locationName,
                url: "/locations/",
                type: "location",
              },
            ],
    citations: ["Appointment availability"],
    disclaimer: false,
    recoveryActions:
      sortedOptions.length > 0
        ? []
        : buildAppointmentRecoveryActions({
            requestedProviderNames,
            department,
            locationName,
            requestedDateRange,
            lookaheadDays: resultLookaheadDays,
          }),
    meta: {
      locationName,
      departmentId: department?.departmentid || null,
      departmentIds: requestedDepartmentEntries.map((entry) => entry.departmentid).filter(Boolean),
      requestedProviderIds: requestedProviders.map((provider) => provider.providerid),
      requestedProviderNames,
      startdate,
      enddate: resultEnddate,
      requestedDateRange: resultDateRangeLabel || null,
      requestedTime: requestedTime?.label || null,
      exactTimeMatches: hasExactTimeMatches,
      providerCountChecked: checkedProviderLocationEntries.length,
      availabilityStatus: sortedOptions.length > 0 ? "open_slots_found" : "no_open_slots",
      lookaheadDays: resultLookaheadDays,
      providerResolution,
    },
  };

  availabilityCache.set(cacheKey, {
    expiresAt: Date.now() + AVAILABILITY_CACHE_TTL_MS,
    value: result,
  });

  return result;
}

export async function getAppointmentAvailabilityForQuery(query, options = {}) {
  if (options.force !== true && !(await shouldCheckAppointmentAvailability(query))) return null;

  try {
    return await getLiveAppointmentAvailabilityForQuery(query, {
      ...options,
      skipIntentCheck: true,
    });
  } catch (error) {
    console.error("Athena appointment availability lookup failed:", error?.message || error);
    return buildAthenaAvailabilityFallback("appointment_availability_unavailable");
  }
}

async function getProviderMappingSlotStatus(config, accessToken, provider, department) {
  if (!provider || !department) {
    return {
      slotStatus: "not_checked",
      slotCount: 0,
    };
  }

  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + DEFAULT_LOOKAHEAD_DAYS);

  try {
    const reasons = await getAppointmentReasons(config, accessToken, provider, department);
    if (reasons.length === 0) {
      return {
        slotStatus: "no_reasons",
        slotCount: 0,
      };
    }

    const slots = await getProviderOpenSlots(
      config,
      accessToken,
      provider,
      department,
      reasons.slice(0, 2),
      formatAthenaDate(start),
      formatAthenaDate(end),
      null,
      1
    );

    return {
      slotStatus: slots.length > 0 ? "slots_found" : "no_slots_found",
      slotCount: slots.length,
    };
  } catch {
    return {
      slotStatus: "lookup_unavailable",
      slotCount: 0,
    };
  }
}

export async function getAthenaProviderMappingCoverage() {
  const config = getAthenaConfig();
  if (!config.ok) {
    return {
      available: false,
      error: "Athena is not configured.",
      summary: {},
      rows: [],
    };
  }

  try {
    const accessToken = await getAccessToken(config);
    const { departments, providers, siteProviders } = await loadReferenceData(config, accessToken);
    const siteProviderEntries = buildSiteProviderLookup(siteProviders);
    const schedulableProviders = providers.filter(isSchedulableProvider);

    const baseRows = siteProviders
      .map((siteProvider) => {
        const explicitProviderId = String(siteProvider.athenaProviderId || "").trim();
        const explicitDepartmentId = String(siteProvider.athenaDepartmentId || "").trim();
        const explicitMatch = explicitProviderId
          ? schedulableProviders.find(
              (provider) => String(provider.providerid || "").trim() === explicitProviderId
            )
          : null;
        const nameMatches = explicitMatch
          ? []
          : schedulableProviders.filter((provider) =>
              isSameSiteProvider(findSiteProvider(provider, siteProviderEntries), siteProvider)
            );
        const matchedProvider = explicitMatch || (nameMatches.length === 1 ? nameMatches[0] : null);
        const matchedDepartment = matchedProvider
          ? findProviderDepartment(matchedProvider, departments, siteProviderEntries)
          : null;
        const configuredDepartment = explicitDepartmentId
          ? departments.find(
              (department) => String(department.departmentid || "").trim() === explicitDepartmentId
            )
          : null;
        const warnings = [];

        let status = "missing_mapping";
        if (explicitProviderId && !explicitMatch) {
          status = "configured_provider_missing";
          warnings.push("Configured Athena provider ID was not found.");
        } else if (explicitMatch) {
          status = "explicit_match";
        } else if (nameMatches.length === 1) {
          status = "name_match";
        } else if (nameMatches.length > 1) {
          status = "unsafe_multiple_matches";
          warnings.push("Multiple Athena providers matched this public profile.");
        }

        if (explicitDepartmentId && !configuredDepartment) {
          warnings.push("Configured Athena department ID was not found.");
        }

        if (matchedProvider && !matchedDepartment) {
          warnings.push("Matched provider has no usable Athena department.");
        }

        return {
          name: siteProvider.name,
          slug: siteProvider.slug,
          status,
          warnings,
          athenaProviderId: explicitProviderId,
          athenaDepartmentId: explicitDepartmentId,
          matchedAthenaProviderId: matchedProvider?.providerid || "",
          matchedAthenaName: matchedProvider ? getProviderName(matchedProvider) : "",
          matchedDepartmentId: matchedDepartment?.departmentid || "",
          matchedDepartmentName: matchedDepartment ? getDepartmentName(matchedDepartment) : "",
          matchCount: explicitMatch ? 1 : nameMatches.length,
          _matchedProvider: matchedProvider,
          _matchedDepartment: matchedDepartment,
        };
      });

    const rowsWithSlotStatus = await runWithConcurrency(
      baseRows,
      PROVIDER_LOOKUP_CONCURRENCY,
      async (row) => {
        const slotCheck = await getProviderMappingSlotStatus(
          config,
          accessToken,
          row._matchedProvider,
          row._matchedDepartment
        );
        const warnings = [...row.warnings];
        if (slotCheck.slotStatus === "no_reasons") {
          warnings.push("No online appointment reasons returned for this mapped provider.");
        } else if (slotCheck.slotStatus === "no_slots_found") {
          warnings.push("No online appointment slots found in the next 30 days.");
        } else if (slotCheck.slotStatus === "lookup_unavailable") {
          warnings.push("Slot check could not be completed.");
        }

        const publicRow = { ...row };
        delete publicRow._matchedProvider;
        delete publicRow._matchedDepartment;
        return {
          ...publicRow,
          warnings,
          slotStatus: slotCheck.slotStatus,
          slotCount: slotCheck.slotCount,
        };
      }
    );

    const rows = rowsWithSlotStatus
      .sort((first, second) => {
        const firstNeedsReview =
          first.status.includes("missing") || first.status.includes("unsafe") || first.warnings.length > 0;
        const secondNeedsReview =
          second.status.includes("missing") || second.status.includes("unsafe") || second.warnings.length > 0;
        if (firstNeedsReview !== secondNeedsReview) return firstNeedsReview ? -1 : 1;
        return first.name.localeCompare(second.name);
      });

    const summary = rows.reduce(
      (current, row) => {
        current.total += 1;
        current[row.status] = (current[row.status] || 0) + 1;
        current[row.slotStatus] = (current[row.slotStatus] || 0) + 1;
        if (row.warnings.length > 0) current.warning += 1;
        return current;
      },
      {
        total: 0,
        explicit_match: 0,
        name_match: 0,
        missing_mapping: 0,
        unsafe_multiple_matches: 0,
        configured_provider_missing: 0,
        slots_found: 0,
        no_slots_found: 0,
        no_reasons: 0,
        not_checked: 0,
        lookup_unavailable: 0,
        warning: 0,
      }
    );

    return {
      available: true,
      summary,
      rows,
    };
  } catch (error) {
    console.error("Athena provider mapping coverage failed:", error?.message || error);
    return {
      available: false,
      error: "Athena mapping coverage is unavailable.",
      summary: {},
      rows: [],
    };
  }
}
