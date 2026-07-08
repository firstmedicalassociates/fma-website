const fs = require("fs");
const path = require("path");

const DEFAULT_LOOKAHEAD_DAYS = 30;
const DEFAULT_SLOT_LIMIT = 0;
const OPEN_SLOT_PAGE_LIMIT = 100;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_OUTPUT_DIR = path.resolve("artifacts", "athena");
const DEFAULT_REPORT_PATH = path.join(DEFAULT_OUTPUT_DIR, "provider-schedules.md");
const DEFAULT_JSON_PATH = path.join(DEFAULT_OUTPUT_DIR, "provider-schedules.json");
let verboseRetries = false;

function readEnvFile(filePath = ".env") {
  const env = {};
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }

  return { ...env, ...process.env };
}

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (inlineArg) return inlineArg.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];

  return fallback;
}

function getNumberArg(name, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const value = Number.parseInt(getArg(name), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function formatAthenaDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeKey(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/FIRST MEDICAL ASSOCIATES/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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
  return (
    department.patientdepartmentname ||
    department.name ||
    `Department ${department.departmentid}`
  );
}

function getDepartmentLocation(department) {
  return [department.city, department.state].filter(Boolean).join(", ");
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

function toArrayResponse(body, key) {
  return Array.isArray(body?.[key]) ? body[key] : [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function createAthenaClient(env) {
  const clientId = env.ATHENA_CLIENT_ID?.trim();
  const clientSecret = env.ATHENA_CLIENT_SECRET?.trim();
  const tokenUrl = env.ATHENA_TOKEN_URL?.trim();
  const baseUrl = env.ATHENA_BASE_URL?.trim()?.replace(/\/+$/, "");
  const scope = env.ATHENA_DEFAULT_SCOPE?.trim();
  const practiceId = env.ATHENA_DEFAULT_PRACTICE_ID?.trim();

  const missing = [
    ["ATHENA_CLIENT_ID", clientId],
    ["ATHENA_CLIENT_SECRET", clientSecret],
    ["ATHENA_TOKEN_URL", tokenUrl],
    ["ATHENA_BASE_URL", baseUrl],
    ["ATHENA_DEFAULT_SCOPE", scope],
    ["ATHENA_DEFAULT_PRACTICE_ID", practiceId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Athena env values: ${missing.join(", ")}`);
  }

  let accessToken = "";

  async function requestToken() {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) {
      throw new Error(`Athena token request failed with status ${response.status}.`);
    }

    accessToken = body.access_token;
    return body;
  }

  async function getJson(apiPath) {
    if (!accessToken) await requestToken();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch(`${baseUrl}${apiPath}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const text = await response.text();
      let body;
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { raw: text.slice(0, 500) };
      }

      if (response.status === 429 && attempt < 5) {
        const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
        const retryAfterMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(2000 * 2 ** attempt, 20000);
        if (verboseRetries) {
          console.log(
            `  Athena quota backoff: retrying in ${Math.round(retryAfterMs / 1000)}s...`
          );
        }
        await sleep(retryAfterMs);
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        path: apiPath,
        body,
      };
    }

    return {
      ok: false,
      status: 429,
      path: apiPath,
      body: { error: "Quota Exceeded." },
    };
  }

  async function getAll(apiPath, key, limit = 100) {
    const items = [];
    let offset = 0;
    let totalcount = null;

    while (true) {
      const pathWithPaging = addQuery(apiPath, { limit, offset });
      const response = await getJson(pathWithPaging);
      if (!response.ok) {
        throw new Error(`Athena GET ${pathWithPaging} failed with status ${response.status}.`);
      }

      const batch = toArrayResponse(response.body, key);
      items.push(...batch);
      totalcount = response.body?.totalcount ?? totalcount;

      if (batch.length < limit || (totalcount !== null && items.length >= totalcount)) break;
      offset += limit;
    }

    return items;
  }

  return {
    practiceId,
    requestToken,
    getJson,
    getAll,
  };
}

function buildDepartmentMatchers(departments) {
  const matchers = new Map();

  for (const department of departments) {
    const id = String(department.departmentid);
    const name = getDepartmentName(department);
    const candidates = [
      department.name,
      department.patientdepartmentname,
      department.city,
      name.replace(/First Medical Associates/gi, ""),
    ]
      .map(normalizeKey)
      .filter(Boolean);

    for (const candidate of candidates) {
      if (!matchers.has(candidate)) matchers.set(candidate, id);
    }
  }

  return matchers;
}

function matchProviderDepartment(provider, departmentMatchers) {
  const home = normalizeKey(provider.homedepartment);
  if (!home) return "";
  return departmentMatchers.get(home) || "";
}

async function getAppointmentReasons(client, provider, department) {
  const apiPath = addQuery(`/v1/${client.practiceId}/patientappointmentreasons`, {
    providerid: provider.providerid,
    departmentid: department.departmentid,
    limit: 100,
  });

  const response = await client.getJson(apiPath);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      reasons: [],
      error: response.body?.error || `Status ${response.status}`,
    };
  }

  return {
    ok: true,
    status: response.status,
    reasons: toArrayResponse(response.body, "patientappointmentreasons"),
  };
}

async function getOpenSlots(client, provider, department, reasons, startdate, enddate, slotLimit) {
  const slotsByKey = new Map();
  const reasonSummaries = [];
  const hasSlotLimit = Number.isFinite(slotLimit) && slotLimit > 0;

  for (const reason of reasons) {
    const reasonid = reason.reasonid || reason.appointmentreasonid || reason.patientappointmentreasonid;
    if (!reasonid) continue;

    let offset = 0;
    let totalcount = null;
    reasonSummaries.push({
      reasonid,
      reason: reason.reason || reason.description || "Unknown reason",
      status: null,
      error: "",
      totalcount: null,
    });
    const reasonSummary = reasonSummaries[reasonSummaries.length - 1];

    while (true) {
      const apiPath = addQuery(`/v1/${client.practiceId}/appointments/open`, {
        departmentid: department.departmentid,
        providerid: provider.providerid,
        reasonid,
        startdate,
        enddate,
        limit: OPEN_SLOT_PAGE_LIMIT,
        offset,
      });

      const response = await client.getJson(apiPath);
      reasonSummary.status = response.status;

      if (!response.ok) {
        reasonSummary.error = response.body?.error || `Status ${response.status}`;
        reasonSummary.totalcount = null;
        break;
      }

      const appointments = toArrayResponse(response.body, "appointments");
      totalcount = response.body?.totalcount ?? totalcount;
      reasonSummary.totalcount = totalcount ?? appointments.length;

      for (const appointment of appointments) {
        const key = [
          appointment.appointmentid,
          appointment.date || appointment.appointmentdate,
          appointment.starttime,
          appointment.appointmenttypeid,
        ]
          .filter(Boolean)
          .join("|");
        if (!slotsByKey.has(key)) {
          slotsByKey.set(key, {
            appointmentid: appointment.appointmentid,
            date: appointment.date || appointment.appointmentdate,
            starttime: appointment.starttime,
            duration: appointment.duration,
            appointmenttypeid: appointment.appointmenttypeid,
            reasonid,
            reason: reason.reason || "",
          });
        }
        if (hasSlotLimit && slotsByKey.size >= slotLimit) break;
      }

      if (hasSlotLimit && slotsByKey.size >= slotLimit) break;
      if (appointments.length < OPEN_SLOT_PAGE_LIMIT) break;
      if (totalcount !== null && offset + appointments.length >= totalcount) break;

      offset += OPEN_SLOT_PAGE_LIMIT;
      await sleep(20);
    }

    if (hasSlotLimit && slotsByKey.size >= slotLimit) break;
    await sleep(20);
  }

  const slots = Array.from(slotsByKey.values()).sort((a, b) =>
    `${a.date || ""} ${a.starttime || ""}`.localeCompare(`${b.date || ""} ${b.starttime || ""}`)
  );

  return { slots, reasonSummaries };
}

function renderReasonList(reasons) {
  if (reasons.length === 0) return "None returned";
  return reasons.map((reason) => `${reason.reason || reason.description || "Unknown"} (${reason.reasonid})`).join(", ");
}

function renderSlotList(slots) {
  if (slots.length === 0) return ["    - No open slots returned for this date range."];

  return slots.map((slot) => {
    const pieces = [
      slot.date || "No date",
      slot.starttime || "No time",
      slot.duration ? `${slot.duration} min` : "",
      slot.reason ? `reason: ${slot.reason}` : "",
      slot.appointmenttypeid ? `type ${slot.appointmenttypeid}` : "",
    ].filter(Boolean);
    return `    - ${pieces.join(" | ")}`;
  });
}

function renderReport(data) {
  const lines = [];

  lines.push("# Athena Provider Schedules by Location");
  lines.push("");
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push(`Practice ID: ${data.practiceId}`);
  lines.push(`Date range checked: ${data.startdate} to ${data.enddate}`);
  lines.push(
    `Slot cap per provider/location: ${data.slotLimit > 0 ? data.slotLimit : "none"}`
  );
  lines.push("");
  lines.push(
    "Schedule data uses Athena open appointment slots. Athena requires a provider, department, and appointment reason for open-slot searches."
  );
  lines.push("");
  lines.push(`Departments: ${data.departments.length}`);
  lines.push(`Visible billable person providers: ${data.providers.length}`);
  lines.push("");

  for (const location of data.locations) {
    lines.push(`## ${location.department.name}`);
    lines.push("");
    lines.push(`- Department ID: ${location.department.departmentid}`);
    lines.push(`- Location: ${location.department.location || "Not listed"}`);
    lines.push(`- Providers: ${location.providers.length}`);
    lines.push("");

    if (location.providers.length === 0) {
      lines.push("No visible billable person providers are assigned to this department as their Athena home department.");
      lines.push("");
      continue;
    }

    for (const providerEntry of location.providers) {
      const provider = providerEntry.provider;
      lines.push(`### ${provider.name}`);
      lines.push("");
      lines.push(`- Provider ID: ${provider.providerid}`);
      lines.push(`- Type: ${provider.providertype || "Not listed"}`);
      lines.push(`- Athena home department: ${provider.homedepartment || "Not listed"}`);
      lines.push(`- Appointment reasons: ${renderReasonList(providerEntry.reasons)}`);
      if (providerEntry.reasonError) {
        lines.push(`- Appointment reason lookup warning: ${providerEntry.reasonError}`);
      }
      const slotWarnings = (providerEntry.reasonSummaries || []).filter((summary) => summary.error);
      if (slotWarnings.length > 0) {
        lines.push(
          `- Slot lookup warnings: ${slotWarnings
            .map((summary) => `${summary.reason}: ${summary.error}`)
            .join("; ")}`
        );
      }
      lines.push(`- Open slots returned: ${providerEntry.slots.length}`);
      lines.push("");
      lines.push(...renderSlotList(providerEntry.slots));
      lines.push("");
    }
  }

  if (data.unmatchedProviders.length > 0) {
    lines.push("## Providers Not Matched to a Department");
    lines.push("");
    for (const provider of data.unmatchedProviders) {
      lines.push(
        `- ${provider.name} (ID ${provider.providerid}) | home department: ${provider.homedepartment || "Not listed"}`
      );
    }
    lines.push("");
  }

  if (data.otherProviderResources.length > 0) {
    lines.push("## Other Athena Provider Resources");
    lines.push("");
    lines.push("These are non-person or non-billable Athena provider records, such as lab or imaging resources.");
    lines.push("");
    for (const provider of data.otherProviderResources) {
      lines.push(
        `- ${provider.name} (ID ${provider.providerid}) | ${provider.providertype || "Type not listed"} | home: ${provider.homedepartment || "Not listed"}`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const env = readEnvFile();
  const client = createAthenaClient(env);
  const days = getNumberArg("days", DEFAULT_LOOKAHEAD_DAYS, 1, 365);
  const slotLimit = getNumberArg("slot-limit", DEFAULT_SLOT_LIMIT, 0, 10000);
  const concurrency = getNumberArg("concurrency", DEFAULT_CONCURRENCY, 1, 12);
  const outputPath = path.resolve(getArg("out", DEFAULT_REPORT_PATH));
  const jsonPath = path.resolve(getArg("json", DEFAULT_JSON_PATH));
  verboseRetries = getArg("quiet", "") !== "true";

  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  const startdate = formatAthenaDate(start);
  const enddate = formatAthenaDate(end);

  await client.requestToken();
  console.log("Athena token request succeeded.");
  console.log(`Loading departments and providers for practice ${client.practiceId}...`);

  const [rawDepartments, rawProviders] = await Promise.all([
    client.getAll(`/v1/${client.practiceId}/departments`, "departments"),
    client.getAll(`/v1/${client.practiceId}/providers`, "providers"),
  ]);

  const departments = rawDepartments.map((department) => ({
    ...department,
    departmentid: String(department.departmentid),
    name: getDepartmentName(department),
    location: getDepartmentLocation(department),
  }));

  const providers = rawProviders.map((provider) => ({
    ...provider,
    providerid: provider.providerid,
    name: getProviderName(provider),
  }));

  const schedulableProviders = providers.filter(
    (provider) =>
      provider.entitytype === "Person" &&
      provider.billable === true &&
      provider.hideinportal !== true
  );
  const otherProviderResources = providers.filter((provider) => !schedulableProviders.includes(provider));

  const departmentMatchers = buildDepartmentMatchers(departments);
  const departmentsById = new Map(departments.map((department) => [String(department.departmentid), department]));
  const locations = departments.map((department) => ({
    department,
    providers: [],
  }));
  const locationsByDepartmentId = new Map(
    locations.map((location) => [String(location.department.departmentid), location])
  );
  const unmatchedProviders = [];

  for (const provider of schedulableProviders) {
    const departmentId = matchProviderDepartment(provider, departmentMatchers);
    const location = locationsByDepartmentId.get(String(departmentId));
    if (!location) {
      unmatchedProviders.push(provider);
      continue;
    }
    location.providers.push({ provider, reasons: [], slots: [], reasonSummaries: [] });
  }

  const providerLocationEntries = locations.flatMap((location) =>
    location.providers.map((providerEntry) => ({
      location,
      providerEntry,
    }))
  );

  console.log(
    `Loading appointment reasons and open slots for ${providerLocationEntries.length} provider/location pairs...`
  );
  console.log(
    `This can take a couple minutes because Athena rate-limits schedule calls. Progress will print below.`
  );

  const progress = {
    completed: 0,
    slots: 0,
    reasons: 0,
    startedAt: Date.now(),
  };

  function printProgress(providerEntry, location) {
    progress.completed += 1;
    progress.slots += providerEntry.slots.length;
    progress.reasons += providerEntry.reasons.length;

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - progress.startedAt) / 1000));
    const averageSeconds = elapsedSeconds / progress.completed;
    const remaining = providerLocationEntries.length - progress.completed;
    const etaSeconds = Math.round(averageSeconds * remaining);
    const etaText =
      etaSeconds > 90
        ? `${Math.round(etaSeconds / 60)}m`
        : `${etaSeconds}s`;

    console.log(
      `[${progress.completed}/${providerLocationEntries.length}] ${providerEntry.provider.name} @ ${location.department.name} | reasons ${providerEntry.reasons.length} | slots ${providerEntry.slots.length} | total slots ${progress.slots} | ETA ${etaText}`
    );
  }

  await runWithConcurrency(providerLocationEntries, concurrency, async ({ location, providerEntry }) => {
    console.log(
      `Fetching ${providerEntry.provider.name} @ ${location.department.name}...`
    );

    const reasonResult = await getAppointmentReasons(client, providerEntry.provider, location.department);
    providerEntry.reasonStatus = reasonResult.status;
    providerEntry.reasonError = reasonResult.error || "";
    providerEntry.reasons = reasonResult.reasons;

    if (reasonResult.reasons.length > 0) {
      const slotResult = await getOpenSlots(
        client,
        providerEntry.provider,
        location.department,
        reasonResult.reasons,
        startdate,
        enddate,
        slotLimit
      );
      providerEntry.slots = slotResult.slots;
      providerEntry.reasonSummaries = slotResult.reasonSummaries;
    }

    printProgress(providerEntry, location);
  });

  for (const location of locations) {
    location.providers.sort((a, b) => a.provider.name.localeCompare(b.provider.name));
  }

  const reportData = {
    generatedAt: new Date().toISOString(),
    practiceId: client.practiceId,
    startdate,
    enddate,
    dateRange: {
      start: formatIsoDate(start),
      end: formatIsoDate(end),
      days,
    },
    slotLimit,
    departments,
    providers: schedulableProviders,
    locations,
    unmatchedProviders,
    otherProviderResources,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(outputPath, renderReport(reportData), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(reportData, null, 2)}\n`, "utf8");

  const providerCount = providerLocationEntries.length;
  const openSlotCount = providerLocationEntries.reduce(
    (count, entry) => count + entry.providerEntry.slots.length,
    0
  );
  const reasonCount = providerLocationEntries.reduce(
    (count, entry) => count + entry.providerEntry.reasons.length,
    0
  );

  console.log(`Report written: ${outputPath}`);
  console.log(`JSON written: ${jsonPath}`);
  console.log(
    JSON.stringify(
      {
        departments: departments.length,
        visibleBillablePersonProviders: schedulableProviders.length,
        providerLocationPairs: providerCount,
        appointmentReasonsReturned: reasonCount,
        openSlotsReturned: openSlotCount,
        unmatchedProviders: unmatchedProviders.length,
        otherProviderResources: otherProviderResources.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
