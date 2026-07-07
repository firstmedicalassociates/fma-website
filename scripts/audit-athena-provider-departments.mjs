import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/app/lib/prisma.js";

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 1;
const DEFAULT_DELAY_MS = 125;
const DEFAULT_REPORT_PATH = path.resolve("artifacts", "athena", "provider-department-audit.json");
const DEFAULT_MD_PATH = path.resolve("artifacts", "athena", "provider-department-audit.md");
const EVAL_REPORT_PATH = path.resolve("artifacts", "ai-search", "eval-report.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (inlineArg) return inlineArg.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAthenaDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactText(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
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

function getProviderName(provider) {
  return (
    [provider.firstname, provider.lastname].filter(Boolean).join(" ").trim() ||
    provider.schedulingname ||
    provider.displayname ||
    provider.lastname ||
    `Provider ${provider.providerid}`
  );
}

function getDepartmentName(department) {
  return department.patientdepartmentname || department.name || `Department ${department.departmentid}`;
}

function getReasonId(reason) {
  return reason.reasonid || reason.appointmentreasonid || reason.patientappointmentreasonid || "";
}

function createConfig() {
  const baseUrl = process.env.ATHENA_BASE_URL?.trim()?.replace(/\/+$/, "");
  const tokenUrl =
    process.env.ATHENA_TOKEN_URL?.trim() ||
    (baseUrl ? `${baseUrl}/oauth2/v1/token` : "");
  const config = {
    clientId: process.env.ATHENA_CLIENT_ID?.trim(),
    clientSecret: process.env.ATHENA_CLIENT_SECRET?.trim(),
    baseUrl,
    tokenUrl,
    scope: process.env.ATHENA_DEFAULT_SCOPE?.trim(),
    practiceId: process.env.ATHENA_DEFAULT_PRACTICE_ID?.trim(),
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing Athena config values: ${missing.join(", ")}`);
  }

  return config;
}

async function fetchJsonWithRetry(url, options = {}, label = "request") {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await fetch(url, options);
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    if (response.status === 429 && attempt < 6) {
      const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
      const waitMs = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : Math.min(1500 * 2 ** attempt, 30000);
      console.warn(`${label} rate-limited; retrying in ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
      continue;
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  }

  return {
    ok: false,
    status: 429,
    body: { error: "Quota Exceeded." },
  };
}

async function getAccessToken(config) {
  const response = await fetchJsonWithRetry(
    config.tokenUrl,
    {
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
    },
    "token request"
  );

  if (!response.ok || !response.body?.access_token) {
    throw new Error(`Token request failed with status ${response.status}`);
  }

  return response.body.access_token;
}

async function getAthena(config, accessToken, apiPath, label = "athena request") {
  return fetchJsonWithRetry(
    `${config.baseUrl}${apiPath}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
    label
  );
}

async function getAll(config, accessToken, apiPath, key, limit = 100) {
  const items = [];
  let offset = 0;
  let totalcount = null;

  while (true) {
    const response = await getAthena(
      config,
      accessToken,
      addQuery(apiPath, { limit, offset }),
      `${key} lookup`
    );
    if (!response.ok) {
      throw new Error(`${key} lookup failed with status ${response.status}`);
    }

    const batch = Array.isArray(response.body?.[key]) ? response.body[key] : [];
    items.push(...batch);
    totalcount = response.body?.totalcount ?? totalcount;

    if (batch.length < limit || (totalcount !== null && items.length >= totalcount)) break;
    offset += limit;
  }

  return items;
}

function buildAthenaProviderKeys(provider) {
  return [
    ...new Set(
      [
        getProviderName(provider),
        provider.displayname,
        provider.schedulingname,
        `${provider.lastname || ""} ${provider.firstname || ""}`,
      ]
        .map(compactText)
        .filter(Boolean)
    ),
  ];
}

function matchSiteProviderToAthena(siteProvider, athenaProviders) {
  const siteKeys = [siteProvider.name, siteProvider.athenaSchedulingName]
    .map(compactText)
    .filter(Boolean);
  const siteTokens = normalizeText(siteProvider.name)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !["c", "d", "do", "fnp", "m", "md", "np", "pa"].includes(token));

  const scored = athenaProviders
    .map((provider) => {
      const keys = buildAthenaProviderKeys(provider);
      const exactKey = keys.some((key) => siteKeys.includes(key));
      const substringKey = keys.some((key) =>
        siteKeys.some((siteKey) => key.includes(siteKey) || siteKey.includes(key))
      );
      const providerTokens = normalizeText(
        `${getProviderName(provider)} ${provider.displayname || ""} ${provider.schedulingname || ""}`
      )
        .split(/\s+/)
        .filter(Boolean);
      const tokenMatches = siteTokens.filter((token) => providerTokens.includes(token)).length;

      let score = 0;
      if (exactKey) score = 100;
      else if (substringKey) score = 92;
      else if (tokenMatches >= Math.min(2, siteTokens.length)) score = 70 + tokenMatches;

      return { provider, score };
    })
    .filter((match) => match.score > 0)
    .sort((first, second) => second.score - first.score);

  return scored[0]?.provider || null;
}

async function loadTargetProviders(athenaProviders) {
  const explicitProviderIds = getArg("provider-ids")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (explicitProviderIds.length > 0) {
    return explicitProviderIds
      .map((providerId) => {
        const provider = athenaProviders.find(
          (item) => String(item.providerid || "").trim() === providerId
        );
        return provider
          ? {
              publicName: getProviderName(provider),
              slug: "",
              athenaProvider: provider,
            }
          : null;
      })
      .filter(Boolean);
  }

  const activeSiteProviders = await prisma.provider.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      athenaSchedulingName: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const targetSlugs = new Set(
    getArg("slugs")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (targetSlugs.size === 0 && !hasFlag("all-active")) {
    const report = JSON.parse(await fs.readFile(EVAL_REPORT_PATH, "utf8"));
    for (const row of report.providerLiveResults || []) {
      if (Number(row.appointmentOptionCount || 0) === 0 && row.slug) {
        targetSlugs.add(row.slug);
      }
    }
  }

  return activeSiteProviders
    .filter((provider) => hasFlag("all-active") || targetSlugs.has(provider.slug))
    .map((siteProvider) => ({
      publicName: siteProvider.name,
      slug: siteProvider.slug,
      athenaProvider: matchSiteProviderToAthena(siteProvider, athenaProviders),
    }))
    .filter((entry) => entry.athenaProvider);
}

async function getReasons(config, accessToken, provider, department) {
  const response = await getAthena(
    config,
    accessToken,
    addQuery(`/v1/${encodeURIComponent(config.practiceId)}/patientappointmentreasons`, {
      providerid: provider.providerid,
      departmentid: department.departmentid,
      limit: 100,
    }),
    `reasons ${provider.providerid}/${department.departmentid}`
  );

  return {
    status: response.status,
    reasons: Array.isArray(response.body?.patientappointmentreasons)
      ? response.body.patientappointmentreasons
      : [],
    error: response.ok ? "" : response.body?.error || response.body,
  };
}

async function getOpenSlotProbe(config, accessToken, provider, department, reason, startdate, enddate, limit) {
  const reasonid = getReasonId(reason);
  const response = await getAthena(
    config,
    accessToken,
    addQuery(`/v1/${encodeURIComponent(config.practiceId)}/appointments/open`, {
      departmentid: department.departmentid,
      providerid: provider.providerid,
      reasonid,
      startdate,
      enddate,
      limit,
    }),
    `open ${provider.providerid}/${department.departmentid}/${reasonid}`
  );
  const appointments = Array.isArray(response.body?.appointments) ? response.body.appointments : [];

  return {
    reason: reason.reason || reason.description || "",
    reasonid,
    status: response.status,
    totalcount: response.body?.totalcount ?? appointments.length,
    error: response.ok ? "" : response.body?.error || response.body,
    firstAppointment: appointments[0]
      ? {
          appointmentid: appointments[0].appointmentid,
          date: appointments[0].date || appointments[0].appointmentdate,
          starttime: appointments[0].starttime,
          duration: appointments[0].duration,
          appointmenttypeid: appointments[0].appointmenttypeid,
          departmentid: appointments[0].departmentid,
          providerid: appointments[0].providerid,
        }
      : null,
  };
}

async function getOpenSlotProbeWithoutReason(config, accessToken, provider, department, startdate, enddate, limit) {
  const response = await getAthena(
    config,
    accessToken,
    addQuery(`/v1/${encodeURIComponent(config.practiceId)}/appointments/open`, {
      departmentid: department.departmentid,
      providerid: provider.providerid,
      startdate,
      enddate,
      limit,
    }),
    `open ${provider.providerid}/${department.departmentid}/no-reason`
  );
  const appointments = Array.isArray(response.body?.appointments) ? response.body.appointments : [];

  return {
    status: response.status,
    totalcount: response.body?.totalcount ?? appointments.length,
    error: response.ok ? "" : response.body?.error || response.body,
    firstAppointment: appointments[0]
      ? {
          appointmentid: appointments[0].appointmentid,
          date: appointments[0].date || appointments[0].appointmentdate,
          starttime: appointments[0].starttime,
          duration: appointments[0].duration,
          appointmenttypeid: appointments[0].appointmenttypeid,
          departmentid: appointments[0].departmentid,
          providerid: appointments[0].providerid,
        }
      : null,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Provider Department Availability Audit");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Date range: ${report.startdate} to ${report.enddate}`);
  lines.push(`Providers checked: ${report.providers.length}`);
  lines.push("");

  for (const provider of report.providers) {
    lines.push(`## ${provider.publicName}`);
    lines.push("");
    lines.push(`- Public slug: ${provider.slug || "N/A"}`);
    lines.push(`- Scheduling provider: ${provider.athenaName} (${provider.athenaProviderId})`);
    lines.push(`- Departments with open slots: ${provider.departmentsWithOpenSlots.length}`);
    lines.push(`- Departments with appointment reasons: ${provider.departmentsWithReasons.length}`);
    lines.push("");

    if (provider.departmentsWithOpenSlots.length > 0) {
      lines.push("Open slot departments:");
      for (const department of provider.departmentsWithOpenSlots) {
        lines.push(
          `- ${department.departmentName} (${department.departmentId}): ${department.maxReasonTotal} max reason total; first ${department.firstAppointment?.date || "N/A"} ${department.firstAppointment?.starttime || ""}`
        );
      }
      lines.push("");
    } else {
      lines.push("No open slots found in any checked department.");
      lines.push("");
    }

    const noReasonDepartments = provider.departmentsWithNoReasonOpenSlots || [];
    if (noReasonDepartments.length > 0) {
      lines.push("Open slot departments without reasonid:");
      for (const department of noReasonDepartments) {
        lines.push(
          `- ${department.departmentName} (${department.departmentId}): ${department.noReasonProbe.totalcount} returned; first ${department.noReasonProbe.firstAppointment?.date || "N/A"} ${department.noReasonProbe.firstAppointment?.starttime || ""}`
        );
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const days = Number.parseInt(getArg("days", String(DEFAULT_DAYS)), 10);
  const delayMs = Number.parseInt(getArg("delay-ms", String(DEFAULT_DELAY_MS)), 10);
  const limit = Number.parseInt(getArg("limit", String(DEFAULT_LIMIT)), 10);
  const outputPath = path.resolve(getArg("out", DEFAULT_REPORT_PATH));
  const mdPath = path.resolve(getArg("md", DEFAULT_MD_PATH));
  const probeWithoutReason = hasFlag("probe-without-reason") || hasFlag("no-reason-only");
  const noReasonOnly = hasFlag("no-reason-only");
  const startdate = getArg("startdate") || formatAthenaDate(new Date());
  const enddate =
    getArg("enddate") ||
    formatAthenaDate(new Date(Date.now() + Math.max(days, 1) * 24 * 60 * 60 * 1000));

  const config = createConfig();
  const accessToken = await getAccessToken(config);
  const [rawDepartments, rawProviders] = await Promise.all([
    getAll(config, accessToken, `/v1/${config.practiceId}/departments`, "departments"),
    getAll(config, accessToken, `/v1/${config.practiceId}/providers`, "providers"),
  ]);
  const departments = rawDepartments.map((department) => ({
    ...department,
    departmentid: String(department.departmentid),
    name: getDepartmentName(department),
  }));
  const athenaProviders = rawProviders
    .filter(
      (provider) =>
        provider.entitytype === "Person" &&
        provider.billable === true &&
        provider.hideinportal !== true
    )
    .map((provider) => ({
      ...provider,
      name: getProviderName(provider),
    }));
  const targetProviders = await loadTargetProviders(athenaProviders);

  console.log(`Checking ${targetProviders.length} providers across ${departments.length} departments.`);

  const providerResults = [];
  for (const target of targetProviders) {
    const provider = target.athenaProvider;
    const departmentResults = [];
    console.log(`Checking ${target.publicName} (${provider.providerid})...`);

    for (const department of departments) {
      const reasonResult = await getReasons(config, accessToken, provider, department);
      await sleep(delayMs);
      const reasons = reasonResult.reasons;
      const openCalls = [];
      let noReasonProbe = null;

      if (probeWithoutReason) {
        noReasonProbe = await getOpenSlotProbeWithoutReason(
          config,
          accessToken,
          provider,
          department,
          startdate,
          enddate,
          limit
        );
        await sleep(delayMs);
      }

      if (!noReasonOnly) {
        for (const reason of reasons) {
          const openResult = await getOpenSlotProbe(
            config,
            accessToken,
            provider,
            department,
            reason,
            startdate,
            enddate,
            limit
          );
          openCalls.push(openResult);
          await sleep(delayMs);
        }
      }

      const maxReasonTotal = openCalls.reduce(
        (max, call) => Math.max(max, Number(call.totalcount || 0)),
        0
      );
      departmentResults.push({
        departmentId: String(department.departmentid),
        departmentName: department.name,
        city: department.city || "",
        reasonStatus: reasonResult.status,
        reasonCount: reasons.length,
        reasonError: reasonResult.error,
        maxReasonTotal,
        totalOpenAcrossReasons: openCalls.reduce(
          (sum, call) => sum + Number(call.totalcount || 0),
          0
        ),
        firstAppointment: openCalls.find((call) => call.firstAppointment)?.firstAppointment || null,
        noReasonProbe,
        openCalls,
      });
    }

    const departmentsWithOpenSlots = departmentResults.filter(
      (department) => department.maxReasonTotal > 0
    );
    const departmentsWithReasons = departmentResults.filter(
      (department) => department.reasonCount > 0
    );
    const departmentsWithNoReasonOpenSlots = departmentResults.filter(
      (department) => Number(department.noReasonProbe?.totalcount || 0) > 0
    );

    providerResults.push({
      publicName: target.publicName,
      slug: target.slug,
      athenaProviderId: provider.providerid,
      athenaName: getProviderName(provider),
      homeDepartment: provider.homedepartment || "",
      departmentsWithOpenSlots,
      departmentsWithReasons,
      departmentsWithNoReasonOpenSlots,
      departments: departmentResults,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    startdate,
    enddate,
    departmentCount: departments.length,
    providerCount: providerResults.length,
    providersWithOpenSlots: providerResults.filter(
      (provider) => provider.departmentsWithOpenSlots.length > 0
    ).length,
    providers: providerResults,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(`JSON written: ${outputPath}`);
  console.log(`Markdown written: ${mdPath}`);
  console.log(
    JSON.stringify(
      {
        providers: report.providerCount,
        providersWithOpenSlots: report.providersWithOpenSlots,
        providersWithoutOpenSlots: report.providerCount - report.providersWithOpenSlots,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
