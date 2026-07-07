#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { getPhiRisk } from "../src/app/lib/no-phi-guard.js";
import { inferAiSearchIntent } from "../src/app/lib/ai-search-analytics.js";
import { buildAiSearchClarification } from "../src/app/lib/ai-search-clarification.js";
import {
  shouldCheckAppointmentAvailability,
  getAppointmentAvailabilityForQuery,
  findRequestedSiteProvidersForTest,
  resolveAppointmentProviderResolutionForTest,
} from "../src/app/lib/athena-availability.js";
import {
  buildFmaDomainGraphAnswer,
  findFmaDomainGraphContext,
} from "../src/app/lib/ai-search-domain-graph.js";
import { runAiSearch } from "../src/app/lib/ai-search.js";
import { prisma } from "../src/app/lib/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES_PATH = path.resolve(__dirname, "../data/ai-search-eval-cases.json");
const REPORT_PATH = path.resolve(__dirname, "../artifacts/ai-search/eval-report.json");
const ARGS = new Set(process.argv.slice(2));
const RUN_LIVE = process.env.RUN_LIVE_AI_EVALS === "1" || ARGS.has("--live");
const RUN_ALL_PROVIDERS =
  process.env.RUN_ALL_PROVIDER_AI_EVALS === "1" || ARGS.has("--all-providers");

async function loadCases() {
  return JSON.parse(await fs.readFile(CASES_PATH, "utf8"));
}

const PROVIDER_PROMPT_TEMPLATES = [
  (name) => `what appointments does ${name} have`,
  (name) => `what availability does ${name} have`,
  (name) => `what availabilities does ${name} have`,
  (name) => `what times does ${name} have available`,
  (name) => `what available times does ${name} have`,
  (name) => `does ${name} have any openings`,
  (name) => `when can I see ${name}`,
  (name) => `can I book with ${name}`,
];

const PROVIDER_ALIAS_PROMPT_TEMPLATES = [
  (name) => `what appointments does ${name} have`,
  (name) => `what availabilities does ${name} have`,
  (name) => `what times does ${name} have`,
];

const DOMAIN_GRAPH_CASES = [
  {
    id: "domain_graph_spanish_provider",
    query: "Who speaks Spanish?",
    expectedProviderMatch: true,
    expectedLanguage: "Spanish",
  },
  {
    id: "domain_graph_spanish_rockville",
    query: "Who speaks Spanish near Rockville?",
    expectedLanguage: "Spanish",
    expectedLocation: "Rockville",
  },
  {
    id: "domain_graph_germantown_primary_care",
    query: "Any primary care doctors in Germantown?",
    expectedProviderMatch: true,
    expectedLocation: "Germantown",
    expectedService: "Primary Care",
  },
  {
    id: "domain_graph_gender_not_inferred",
    query: "Any female primary care doctors in Germantown?",
    expectedProviderMatch: true,
    expectedUnsupportedCriterion: "gender",
  },
  {
    id: "domain_graph_new_patients_not_inferred",
    query: "Find someone at Nottingham accepting new patients.",
    expectedProviderMatch: true,
    expectedNewPatientCaveat: true,
  },
  {
    id: "domain_graph_service_catalog",
    query: "What services are available?",
    expectedServiceMatch: true,
    expectedCode: "service_catalog_match",
  },
  {
    id: "domain_graph_provider_typo_recovery",
    query: "Tell me about Robn Codjo",
    expectedProviderMatch: true,
    expectedCode: "directory_match",
  },
];

function normalizeNameTokens(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function countProviderNameParts(providers = []) {
  const firstNameCounts = new Map();
  const lastNameCounts = new Map();

  for (const provider of providers) {
    const tokens = normalizeNameTokens(provider.name);
    const firstName = tokens[0] || "";
    const lastName = tokens[tokens.length - 1] || "";
    if (firstName) firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
    if (lastName) lastNameCounts.set(lastName, (lastNameCounts.get(lastName) || 0) + 1);
  }

  return { firstNameCounts, lastNameCounts };
}

async function loadActiveProviderNames() {
  return prisma.provider.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      title: true,
      locations: true,
    },
  });
}

function buildTypoName(name = "") {
  const tokens = normalizeNameTokens(name);
  const typoTokenIndex = tokens.findIndex((token) => token.length >= 5);
  if (typoTokenIndex < 0) return "";

  const typoTokens = [...tokens];
  const token = typoTokens[typoTokenIndex];
  const removeIndex = Math.min(3, token.length - 2);
  typoTokens[typoTokenIndex] = `${token.slice(0, removeIndex)}${token.slice(removeIndex + 1)}`;
  return typoTokens.join(" ");
}

function isNearNameTokenMatch(first = "", second = "") {
  if (!first || !second) return false;
  if (first === second) return true;
  if (first.length < 4 || second.length < 4) return false;
  if (Math.abs(first.length - second.length) > 1) return false;

  let edits = 0;
  let firstIndex = 0;
  let secondIndex = 0;
  while (firstIndex < first.length && secondIndex < second.length) {
    if (first[firstIndex] === second[secondIndex]) {
      firstIndex += 1;
      secondIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (first.length > second.length) {
      firstIndex += 1;
    } else if (second.length > first.length) {
      secondIndex += 1;
    } else {
      firstIndex += 1;
      secondIndex += 1;
    }
  }

  return true;
}

function isNearUniqueNameToken(token = "", tokens = []) {
  if (!token) return false;
  return tokens.filter((candidate) => isNearNameTokenMatch(token, candidate)).length === 1;
}

async function evaluateStaticCase(testCase) {
  const phiRisk = getPhiRisk(testCase.query);
  const blocked = phiRisk.hasPotentialPhi;
  const intent = blocked ? "privacy_blocked" : inferAiSearchIntent(testCase.query);
  const appointmentAvailability = await shouldCheckAppointmentAvailability(testCase.query);
  const clarification = blocked
    ? null
    : await buildAiSearchClarification(testCase.query, { intent });
  const failures = [];

  if (Boolean(testCase.expectedBlocked) !== blocked) {
    failures.push(`expected blocked=${Boolean(testCase.expectedBlocked)} got ${blocked}`);
  }

  if (testCase.expectedIntent && testCase.expectedIntent !== intent) {
    failures.push(`expected intent=${testCase.expectedIntent} got ${intent}`);
  }

  if (
    typeof testCase.appointmentAvailability === "boolean" &&
    testCase.appointmentAvailability !== appointmentAvailability
  ) {
    failures.push(
      `expected appointmentAvailability=${testCase.appointmentAvailability} got ${appointmentAvailability}`
    );
  }

  for (const category of testCase.expectedPhiCategories || []) {
    if (!phiRisk.categories.includes(category)) {
      failures.push(`missing PHI category ${category}`);
    }
  }

  if (
    typeof testCase.expectedClarification === "boolean" &&
    testCase.expectedClarification !== Boolean(clarification)
  ) {
    failures.push(
      `expected clarification=${testCase.expectedClarification} got ${Boolean(clarification)}`
    );
  }

  if (
    testCase.expectedClarificationType &&
    clarification?.type !== testCase.expectedClarificationType
  ) {
    failures.push(
      `expected clarification type=${testCase.expectedClarificationType} got ${clarification?.type || "none"}`
    );
  }

  return {
    id: testCase.id,
    query: testCase.query,
    blocked,
    phiCategories: phiRisk.categories,
    intent,
    appointmentAvailability,
    clarificationType: clarification?.type || "",
    clarificationChoiceCount: clarification?.choices?.length || 0,
    failures,
  };
}

async function evaluateAllProviderPromptCoverage() {
  const providers = await loadActiveProviderNames();
  const { firstNameCounts, lastNameCounts } = countProviderNameParts(providers);
  const cases = [];

  for (const provider of providers) {
    const tokens = normalizeNameTokens(provider.name);
    const firstName = tokens[0] || "";
    const lastName = tokens[tokens.length - 1] || "";
    const aliases = [
      firstName && firstNameCounts.get(firstName) === 1 ? firstName : "",
      lastName && lastNameCounts.get(lastName) === 1 ? lastName : "",
    ].filter(Boolean);

    for (const template of PROVIDER_PROMPT_TEMPLATES) {
      cases.push({
        id: `provider-prompt:${provider.slug}:${cases.length}`,
        provider: provider.name,
        slug: provider.slug,
        query: template(provider.name),
      });
    }

    for (const alias of aliases) {
      for (const template of PROVIDER_ALIAS_PROMPT_TEMPLATES) {
        cases.push({
          id: `provider-alias-prompt:${provider.slug}:${alias}:${cases.length}`,
          provider: provider.name,
          slug: provider.slug,
          query: template(alias),
        });
      }
    }
  }

  return runWithConcurrency(cases, 12, async (testCase) => {
    const intent = inferAiSearchIntent(testCase.query);
    const appointmentAvailability = await shouldCheckAppointmentAvailability(testCase.query);
    const failures = [];

    if (intent !== "appointment_availability") {
      failures.push(`expected appointment intent, got ${intent}`);
    }

    if (!appointmentAvailability) {
      failures.push("expected provider-aware appointment availability routing");
    }

    return {
      ...testCase,
      intent,
      appointmentAvailability,
      failures,
    };
  });
}

async function evaluateProviderExtractionMatrix() {
  const providers = await loadActiveProviderNames();
  const { firstNameCounts, lastNameCounts } = countProviderNameParts(providers);
  const providerNameParts = providers.map((provider) => normalizeNameTokens(provider.name));
  const firstNameValues = providerNameParts.map((tokens) => tokens[0]).filter(Boolean);
  const lastNameValues = providerNameParts.map((tokens) => tokens[tokens.length - 1]).filter(Boolean);
  const cases = [];

  for (const provider of providers) {
    const tokens = normalizeNameTokens(provider.name);
    const firstName = tokens[0] || "";
    const lastName = tokens[tokens.length - 1] || "";
    const typoName = buildTypoName(provider.name);

    cases.push(
      {
        id: `provider-extraction:full-dr:${provider.slug}`,
        provider: provider.name,
        slug: provider.slug,
        query: `appointments with dr ${provider.name}`,
      },
      {
        id: `provider-extraction:filler-full:${provider.slug}`,
        provider: provider.name,
        slug: provider.slug,
        query: `please show me appointment times for ${provider.name}`,
      },
      {
        id: `provider-extraction:book-near:${provider.slug}`,
        provider: provider.name,
        slug: provider.slug,
        query: `book with ${provider.name} near Rockville`,
      }
    );

    if (
      firstName &&
      firstName.length >= 3 &&
      firstNameCounts.get(firstName) === 1 &&
      isNearUniqueNameToken(firstName, firstNameValues)
    ) {
      cases.push(
        {
          id: `provider-extraction:first-filler:${provider.slug}`,
          provider: provider.name,
          slug: provider.slug,
          query: `give me appointment times for ${firstName}`,
        },
        {
          id: `provider-extraction:first-tomorrow:${provider.slug}`,
          provider: provider.name,
          slug: provider.slug,
          query: `does ${firstName} have anything tomorrow`,
        }
      );
    }

    if (
      lastName &&
      lastName.length >= 3 &&
      lastNameCounts.get(lastName) === 1 &&
      isNearUniqueNameToken(lastName, lastNameValues)
    ) {
      cases.push({
        id: `provider-extraction:last-openings:${provider.slug}`,
        provider: provider.name,
        slug: provider.slug,
        query: `show me openings for ${lastName}`,
      });
    }

    if (typoName) {
      cases.push({
        id: `provider-extraction:typo:${provider.slug}`,
        provider: provider.name,
        slug: provider.slug,
        query: `when can I see ${typoName}`,
      });
    }
  }

  return runWithConcurrency(cases, 16, async (testCase) => {
    const matches = findRequestedSiteProvidersForTest(testCase.query, providers);
    const resolution = resolveAppointmentProviderResolutionForTest(testCase.query, providers);
    const matchedExpectedProvider = matches.some((match) => match.slug === testCase.slug);
    const failures = [];

    if (!matchedExpectedProvider) {
      failures.push(
        `expected provider extraction match for ${testCase.provider}, got ${
          matches.map((match) => match.name).join(", ") || "none"
        }`
      );
    }

    if (resolution.scope !== "provider" || resolution.resolvedProvider?.slug !== testCase.slug) {
      failures.push(
        `expected provider resolution for ${testCase.provider}, got scope=${resolution.scope} provider=${
          resolution.resolvedProvider?.name || "none"
        }`
      );
    }

    return {
      ...testCase,
      matchCount: matches.length,
      resolutionScope: resolution.scope,
      failures,
    };
  });
}

async function evaluateDomainGraphCases() {
  return runWithConcurrency(DOMAIN_GRAPH_CASES, 4, async (testCase) => {
    const graphResult = await findFmaDomainGraphContext(testCase.query);
    const answer = buildFmaDomainGraphAnswer(graphResult);
    const criteria = graphResult.criteria || {};
    const failures = [];

    if (!graphResult.hasSignal) {
      failures.push("expected domain graph signal");
    }
    if (!answer) {
      failures.push("expected deterministic domain graph answer");
    }
    if (testCase.expectedProviderMatch && graphResult.providerMatches.length === 0) {
      failures.push("expected provider matches");
    }
    if (testCase.expectedServiceMatch && graphResult.serviceMatches.length === 0) {
      failures.push("expected service matches");
    }
    if (testCase.expectedCode && answer?.code !== testCase.expectedCode) {
      failures.push(`expected answer code ${testCase.expectedCode}, got ${answer?.code || "none"}`);
    }
    if (
      testCase.expectedLanguage &&
      !criteria.languages?.some((language) => language.toLowerCase() === testCase.expectedLanguage.toLowerCase())
    ) {
      failures.push(`expected language ${testCase.expectedLanguage}`);
    }
    if (
      testCase.expectedLocation &&
      !criteria.locations?.some((location) =>
        String(location.title || location.addressCity || "")
          .toLowerCase()
          .includes(testCase.expectedLocation.toLowerCase())
      )
    ) {
      failures.push(`expected location ${testCase.expectedLocation}`);
    }
    if (
      testCase.expectedService &&
      !criteria.services?.some((service) =>
        String(service.title || "")
          .toLowerCase()
          .includes(testCase.expectedService.toLowerCase())
      )
    ) {
      failures.push(`expected service ${testCase.expectedService}`);
    }
    if (
      testCase.expectedUnsupportedCriterion &&
      !criteria.unsupportedCriteria?.includes(testCase.expectedUnsupportedCriterion)
    ) {
      failures.push(`expected unsupported criterion ${testCase.expectedUnsupportedCriterion}`);
    }
    if (testCase.expectedNewPatientCaveat && criteria.asksAcceptingNewPatients !== true) {
      failures.push("expected new-patient confirmation caveat");
    }

    return {
      id: testCase.id,
      query: testCase.query,
      hasSignal: graphResult.hasSignal,
      providerMatchCount: graphResult.providerMatches.length,
      code: answer?.code || "",
      failures,
    };
  });
}

async function evaluateLiveCase(testCase) {
  if (testCase.expectedBlocked) return null;

  const result = testCase.appointmentAvailability
    ? await getAppointmentAvailabilityForQuery(testCase.query, { days: 30 })
    : await runAiSearch(testCase.query, { limit: 8 });

  return {
    ok: result?.ok === true,
    code: result?.code || "",
    sourceCount: Array.isArray(result?.sources) ? result.sources.length : 0,
    appointmentOptionCount: Array.isArray(result?.options)
      ? result.options.length
      : Array.isArray(result?.appointmentOptions)
        ? result.appointmentOptions.length
        : 0,
    grounded: result?.grounded === true,
    disclaimer: result?.disclaimer === true,
  };
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runNext() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runNext())
  );

  return results;
}

async function evaluateAllProviderLiveCases() {
  if (!RUN_LIVE || !RUN_ALL_PROVIDERS) return [];

  const providers = await loadActiveProviderNames();

  return runWithConcurrency(providers, 2, async (provider) => {
    const query = `what available times does ${provider.name} have available`;
    const result = await getAppointmentAvailabilityForQuery(query, { days: 30 });
    const requestedNames = Array.isArray(result?.meta?.requestedProviderNames)
      ? result.meta.requestedProviderNames
      : [];
    const expectedTokens = provider.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1 && !["c", "d", "do", "fnp", "m", "md", "np", "pa"].includes(token));
    const matchedExpectedProvider = requestedNames.some((name) => {
      const actualTokens = new Set(
        String(name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .split(/\s+/)
          .filter(Boolean)
      );
      const matches = expectedTokens.filter((token) => actualTokens.has(token)).length;
      return matches >= Math.min(2, expectedTokens.length);
    });
    const options = Array.isArray(result?.options) ? result.options : [];
    const allOptionsMatchExpectedProvider =
      options.length === 0 ||
      options.every((option) => {
        const actualTokens = new Set(
          String(option?.providerName || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .split(/\s+/)
            .filter(Boolean)
        );
        const matches = expectedTokens.filter((token) => actualTokens.has(token)).length;
        return matches >= Math.min(2, expectedTokens.length);
      });
    const ok =
      result?.ok === true &&
      result?.code !== "appointment_availability_unavailable" &&
      result?.code !== "appointment_availability_not_configured" &&
      result?.code !== "provider_schedule_not_confirmed" &&
      matchedExpectedProvider &&
      allOptionsMatchExpectedProvider;

    return {
      id: `provider:${provider.slug}`,
      provider: provider.name,
      slug: provider.slug,
      ok,
      code: result?.code || "",
      availabilityStatus: result?.meta?.availabilityStatus || "",
      requestedProviderNames: requestedNames,
      appointmentOptionCount: options.length,
      failures: ok
        ? []
        : [
            `expected live provider-aware availability result for ${provider.name}, got code=${result?.code || "none"}`,
            allOptionsMatchExpectedProvider ? "" : "appointment options included a different provider",
          ].filter(Boolean),
    };
  });
}

const cases = await loadCases();
const results = [];

for (const testCase of cases) {
  const staticResult = await evaluateStaticCase(testCase);
  const liveResult = RUN_LIVE ? await evaluateLiveCase(testCase) : null;
  results.push({ ...staticResult, live: liveResult });
}

const providerPromptCoverageResults = await evaluateAllProviderPromptCoverage();
const providerExtractionResults = await evaluateProviderExtractionMatrix();
const domainGraphResults = await evaluateDomainGraphCases();
const providerLiveResults = await evaluateAllProviderLiveCases();
const failed = results.filter((result) => result.failures.length > 0);
const failedProviderPromptCoverage = providerPromptCoverageResults.filter((result) => result.failures.length > 0);
const failedProviderExtraction = providerExtractionResults.filter((result) => result.failures.length > 0);
const failedDomainGraph = domainGraphResults.filter((result) => result.failures.length > 0);
const failedProviderLive = providerLiveResults.filter((result) => result.failures.length > 0);
const report = {
  generatedAt: new Date().toISOString(),
  live: RUN_LIVE,
  allProvidersLive: RUN_ALL_PROVIDERS,
  total: results.length,
  failed: failed.length,
  providerLiveTotal: providerLiveResults.length,
  providerPromptCoverageTotal: providerPromptCoverageResults.length,
  providerPromptCoverageFailed: failedProviderPromptCoverage.length,
  providerExtractionTotal: providerExtractionResults.length,
  providerExtractionFailed: failedProviderExtraction.length,
  domainGraphTotal: domainGraphResults.length,
  domainGraphFailed: failedDomainGraph.length,
  providerLiveFailed: failedProviderLive.length,
  results,
  providerPromptCoverageResults,
  providerExtractionResults,
  domainGraphResults,
  providerLiveResults,
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

for (const result of results) {
  const prefix = result.failures.length ? "FAIL" : "PASS";
  console.log(`${prefix} ${result.id}`);
  for (const failure of result.failures) {
    console.error(`  ${failure}`);
  }
}

for (const result of providerLiveResults) {
  const prefix = result.failures.length ? "FAIL" : "PASS";
  console.log(`${prefix} ${result.id}`);
  for (const failure of result.failures) {
    console.error(`  ${failure}`);
  }
}

for (const result of failedProviderPromptCoverage.slice(0, 25)) {
  console.error(`FAIL ${result.id}`);
  console.error(`  query: ${result.query}`);
  for (const failure of result.failures) {
    console.error(`  ${failure}`);
  }
}
if (failedProviderPromptCoverage.length > 25) {
  console.error(`... ${failedProviderPromptCoverage.length - 25} more provider prompt coverage failure(s)`);
}

for (const result of failedProviderExtraction.slice(0, 25)) {
  console.error(`FAIL ${result.id}`);
  console.error(`  query: ${result.query}`);
  for (const failure of result.failures) {
    console.error(`  ${failure}`);
  }
}
if (failedProviderExtraction.length > 25) {
  console.error(`... ${failedProviderExtraction.length - 25} more provider extraction failure(s)`);
}

console.log(
  `Provider prompt coverage: ${providerPromptCoverageResults.length - failedProviderPromptCoverage.length}/${providerPromptCoverageResults.length} passed`
);
console.log(
  `Provider extraction matrix: ${providerExtractionResults.length - failedProviderExtraction.length}/${providerExtractionResults.length} passed`
);
for (const result of domainGraphResults) {
  const prefix = result.failures.length ? "FAIL" : "PASS";
  console.log(`${prefix} ${result.id}`);
  for (const failure of result.failures) {
    console.error(`  ${failure}`);
  }
}

console.log(`AI search eval report written: ${REPORT_PATH}`);
assert.equal(failed.length, 0, `${failed.length} AI search eval case(s) failed`);
assert.equal(
  failedProviderPromptCoverage.length,
  0,
  `${failedProviderPromptCoverage.length} provider prompt coverage case(s) failed`
);
assert.equal(
  failedProviderExtraction.length,
  0,
  `${failedProviderExtraction.length} provider extraction case(s) failed`
);
assert.equal(failedDomainGraph.length, 0, `${failedDomainGraph.length} domain graph case(s) failed`);
assert.equal(
  failedProviderLive.length,
  0,
  `${failedProviderLive.length} live provider eval case(s) failed`
);
