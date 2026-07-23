const fs = require("fs");
const path = require("path");

const DEFAULT_SAMPLE_COUNT = 8;
const DEFAULT_OUTPUT_DIR = path.resolve("artifacts", "athena");
const DEFAULT_JSON_PATH = path.join(DEFAULT_OUTPUT_DIR, "provider-detail-pulls.json");
const DEFAULT_MARKDOWN_PATH = path.join(DEFAULT_OUTPUT_DIR, "provider-detail-field-inventory.md");
const MAX_PAGE_SIZE = 100;
const MAX_RETRIES = 5;

function readEnvFile(filePath = ".env") {
  const env = {};
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
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

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getNumberArg(name, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(getArg(name), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAthenaClient(env) {
  const clientId = env.ATHENA_CLIENT_ID?.trim();
  const clientSecret = env.ATHENA_CLIENT_SECRET?.trim();
  const baseUrl = env.ATHENA_BASE_URL?.trim()?.replace(/\/+$/, "");
  const tokenUrl =
    env.ATHENA_TOKEN_URL?.trim() || (baseUrl ? `${baseUrl}/oauth2/v1/token` : "");
  const scope = env.ATHENA_DEFAULT_SCOPE?.trim();
  const practiceId = env.ATHENA_DEFAULT_PRACTICE_ID?.trim();

  const missing = [
    ["ATHENA_CLIENT_ID", clientId],
    ["ATHENA_CLIENT_SECRET", clientSecret],
    ["ATHENA_BASE_URL", baseUrl],
    ["ATHENA_TOKEN_URL", tokenUrl],
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

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    if (!response.ok || !body.access_token) {
      throw new Error(`Athena token request failed with status ${response.status}.`);
    }

    accessToken = body.access_token;
    return response.status;
  }

  async function getJson(apiPath) {
    if (!accessToken) await requestToken();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
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

      if (response.status === 401 && attempt === 0) {
        await requestToken();
        continue;
      }

      if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        const retryAfter = Number.parseInt(response.headers.get("retry-after") || "", 10);
        const waitMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(1000 * 2 ** attempt, 10000);
        await sleep(waitMs);
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

  async function getAllProviders() {
    const providers = [];
    let offset = 0;
    let totalcount = null;

    while (true) {
      const response = await getJson(
        addQuery(`/v1/${encodeURIComponent(practiceId)}/providers`, {
          limit: MAX_PAGE_SIZE,
          offset,
        })
      );
      if (!response.ok) {
        throw new Error(`Athena provider list failed with status ${response.status}.`);
      }

      const batch = Array.isArray(response.body?.providers) ? response.body.providers : [];
      providers.push(...batch);
      totalcount = response.body?.totalcount ?? totalcount;

      if (
        batch.length < MAX_PAGE_SIZE ||
        (totalcount !== null && providers.length >= Number(totalcount))
      ) {
        break;
      }
      offset += MAX_PAGE_SIZE;
    }

    return providers;
  }

  return {
    practiceId,
    requestToken,
    getJson,
    getAllProviders,
  };
}

function getProviderName(provider = {}) {
  return (
    [provider.firstname, provider.lastname].filter(Boolean).join(" ").trim() ||
    provider.displayname ||
    provider.schedulingname ||
    `Provider ${provider.providerid || "unknown"}`
  );
}

function isVisibleBillablePerson(provider = {}) {
  return (
    provider.entitytype === "Person" &&
    provider.billable === true &&
    provider.hideinportal !== true
  );
}

function selectDiverseProviders(providers, count) {
  const candidates = providers.filter(isVisibleBillablePerson);
  const selected = [];
  const selectedIds = new Set();
  const coveredFields = new Set();
  const fieldFrequency = new Map();

  for (const provider of candidates) {
    for (const field of Object.keys(provider)) {
      fieldFrequency.set(field, (fieldFrequency.get(field) || 0) + 1);
    }
  }

  while (selected.length < count) {
    const scored = candidates
      .filter((provider) => !selectedIds.has(String(provider.providerid)))
      .map((provider) => {
        const newFields = Object.keys(provider).filter((field) => !coveredFields.has(field));
        const rareFieldScore = newFields.reduce(
          (score, field) => score + 1 / (fieldFrequency.get(field) || 1),
          0
        );
        return { provider, newFields, rareFieldScore };
      })
      .filter((entry) => entry.newFields.length > 0)
      .sort(
        (first, second) =>
          second.rareFieldScore - first.rareFieldScore ||
          second.newFields.length - first.newFields.length ||
          Number(first.provider.providerid) - Number(second.provider.providerid)
      );

    const next = scored[0];
    if (!next) break;
    selected.push(next.provider);
    selectedIds.add(String(next.provider.providerid));
    next.newFields.forEach((field) => coveredFields.add(field));
  }

  const dimensions = [
    (provider) => `type-specialty:${provider.providertypeid || ""}|${provider.specialtyid || ""}`,
    (provider) => `type:${provider.providertypeid || ""}`,
    (provider) => `specialty:${provider.specialtyid || provider.specialty || ""}`,
    (provider) => `department:${provider.homedepartment || ""}`,
  ];

  for (const getDimension of dimensions) {
    for (const provider of candidates) {
      const dimension = getDimension(provider);
      if (selectedIds.has(String(provider.providerid))) continue;
      if (selected.some((entry) => getDimension(entry) === dimension)) continue;

      selected.push(provider);
      selectedIds.add(String(provider.providerid));
      if (selected.length >= count) return selected;
    }
  }

  for (const provider of candidates) {
    if (selectedIds.has(String(provider.providerid))) continue;
    selected.push(provider);
    selectedIds.add(String(provider.providerid));
    if (selected.length >= count) break;
  }

  return selected;
}

function selectProviders(providers) {
  const requestedIds = getArg("provider-ids")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (requestedIds.length > 0) {
    const providersById = new Map(
      providers.map((provider) => [String(provider.providerid), provider])
    );
    const missing = requestedIds.filter((providerId) => !providersById.has(providerId));
    if (missing.length > 0) {
      throw new Error(`Provider IDs not found in Athena: ${missing.join(", ")}`);
    }
    return requestedIds.map((providerId) => providersById.get(providerId));
  }

  if (hasFlag("all")) return providers.filter(isVisibleBillablePerson);

  const count = getNumberArg("count", DEFAULT_SAMPLE_COUNT, 2, 100);
  return selectDiverseProviders(providers, count);
}

function getValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isNonEmpty(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function buildFieldInventory(records) {
  const inventory = new Map();

  records.forEach((record, recordIndex) => {
    for (const [field, value] of Object.entries(record || {})) {
      if (!inventory.has(field)) {
        inventory.set(field, {
          field,
          presentCount: 0,
          nonEmptyCount: 0,
          types: new Set(),
          presentIn: [],
        });
      }
      const entry = inventory.get(field);
      entry.presentCount += 1;
      if (isNonEmpty(value)) entry.nonEmptyCount += 1;
      entry.types.add(getValueType(value));
      entry.presentIn.push(recordIndex);
    }
  });

  return [...inventory.values()]
    .map((entry) => ({
      field: entry.field,
      presentCount: entry.presentCount,
      nonEmptyCount: entry.nonEmptyCount,
      types: [...entry.types].sort(),
      presentIn: entry.presentIn,
    }))
    .sort((first, second) => first.field.localeCompare(second.field));
}

function normalizeDetailRecord(body) {
  if (Array.isArray(body)) return body[0] || null;
  if (Array.isArray(body?.providers)) return body.providers[0] || null;
  if (body?.provider && typeof body.provider === "object") return body.provider;
  if (body && typeof body === "object" && body.providerid) return body;
  return null;
}

function escapeTableValue(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderMarkdown(report) {
  const lines = [];
  const successfulPulls = report.pulls.filter((pull) => pull.ok && pull.record);

  lines.push("# Athena Provider Detail Pulls and Field Inventory");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Practice ID: ${report.practiceId}`);
  lines.push(`Provider catalog records scanned: ${report.providerCatalog.recordCount}`);
  lines.push(`Individual provider detail calls: ${report.pulls.length}`);
  lines.push(`Successful detail calls: ${successfulPulls.length}`);
  lines.push("");
  lines.push(
    "This report contains live Athena responses from the provider list and individual provider detail endpoints. Authentication credentials and bearer tokens are never written to either artifact."
  );
  lines.push("");

  lines.push("## Calls made");
  lines.push("");
  lines.push("| Provider | ID | Credential | Specialty | Home department | HTTP | Detail fields |");
  lines.push("| --- | ---: | --- | --- | --- | ---: | ---: |");
  for (const pull of report.pulls) {
    lines.push(
      `| ${escapeTableValue(pull.provider.name)} | ${escapeTableValue(
        pull.provider.providerid
      )} | ${escapeTableValue(pull.provider.providertypeid)} | ${escapeTableValue(
        pull.provider.specialty
      )} | ${escapeTableValue(pull.provider.homedepartment)} | ${pull.status} | ${
        pull.record ? Object.keys(pull.record).length : 0
      } |`
    );
  }
  lines.push("");

  lines.push("## Detail field coverage");
  lines.push("");
  lines.push(
    `Fields observed across the ${successfulPulls.length} successful individual detail responses. "Present" means Athena included the key; "non-empty" means its value was not null, an empty string, or an empty collection.`
  );
  lines.push("");
  lines.push("| Field | Type(s) | Present | Non-empty | Coverage |");
  lines.push("| --- | --- | ---: | ---: | ---: |");
  for (const field of report.detailFieldInventory) {
    const coverage = successfulPulls.length
      ? `${Math.round((field.presentCount / successfulPulls.length) * 100)}%`
      : "0%";
    lines.push(
      `| ${escapeTableValue(field.field)} | ${escapeTableValue(
        field.types.join(", ")
      )} | ${field.presentCount}/${successfulPulls.length} | ${field.nonEmptyCount}/${
        successfulPulls.length
      } | ${coverage} |`
    );
  }
  lines.push("");

  lines.push("## Per-provider field matrix");
  lines.push("");
  const matrixHeaders = successfulPulls.map(
    (pull) => `${pull.provider.name} (${pull.provider.providerid})`
  );
  lines.push(`| Field | ${matrixHeaders.map(escapeTableValue).join(" | ")} |`);
  lines.push(`| --- | ${matrixHeaders.map(() => "---:").join(" | ")} |`);
  for (const field of report.detailFieldInventory) {
    const cells = successfulPulls.map((pull) =>
      Object.prototype.hasOwnProperty.call(pull.record, field.field) ? "Yes" : "No"
    );
    lines.push(`| ${escapeTableValue(field.field)} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Full provider catalog field coverage");
  lines.push("");
  lines.push(
    "This inventory scans every record returned by the paginated provider-list call, including non-person or non-billable scheduling resources."
  );
  lines.push("");
  lines.push("| Field | Type(s) | Present | Non-empty | Coverage |");
  lines.push("| --- | --- | ---: | ---: | ---: |");
  for (const field of report.providerCatalog.fieldInventory) {
    const coverage = report.providerCatalog.recordCount
      ? `${Math.round((field.presentCount / report.providerCatalog.recordCount) * 100)}%`
      : "0%";
    lines.push(
      `| ${escapeTableValue(field.field)} | ${escapeTableValue(
        field.types.join(", ")
      )} | ${field.presentCount}/${report.providerCatalog.recordCount} | ${
        field.nonEmptyCount
      }/${report.providerCatalog.recordCount} | ${coverage} |`
    );
  }
  lines.push("");

  lines.push("## Raw responses");
  lines.push("");
  lines.push(
    `The complete parsed response bodies, request paths, HTTP statuses, and timestamps are in \`${path.basename(
      report.outputJsonPath
    )}\` under \`pulls[].responseBody\`. No response fields are removed.`
  );
  lines.push("");
  lines.push("Re-run with:");
  lines.push("");
  lines.push("```powershell");
  lines.push("npm run athena:provider-details");
  lines.push("npm run athena:provider-details -- --provider-ids=61,102,30");
  lines.push("npm run athena:provider-details -- --count=12");
  lines.push("npm run athena:provider-details -- --all");
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const env = readEnvFile();
  const client = createAthenaClient(env);
  const outputJsonPath = path.resolve(getArg("out", DEFAULT_JSON_PATH));
  const outputMarkdownPath = path.resolve(getArg("md", DEFAULT_MARKDOWN_PATH));

  const tokenStatus = await client.requestToken();
  console.log(`Athena token request succeeded (${tokenStatus}).`);

  const providerCatalog = await client.getAllProviders();
  const selectedProviders = selectProviders(providerCatalog);
  if (selectedProviders.length === 0) {
    throw new Error("No providers matched the requested selection.");
  }

  console.log(
    `Loaded ${providerCatalog.length} provider catalog records; pulling ${selectedProviders.length} individual provider details.`
  );

  const pulls = [];
  for (const provider of selectedProviders) {
    const apiPath = `/v1/${encodeURIComponent(client.practiceId)}/providers/${encodeURIComponent(
      provider.providerid
    )}`;
    const response = await client.getJson(apiPath);
    const record = normalizeDetailRecord(response.body);
    pulls.push({
      requestedAt: new Date().toISOString(),
      request: {
        method: "GET",
        path: apiPath,
        accept: "application/json",
      },
      ok: response.ok,
      status: response.status,
      provider: {
        providerid: provider.providerid,
        name: getProviderName(provider),
        providertypeid: provider.providertypeid || "",
        providertype: provider.providertype || "",
        specialty: provider.specialty || "",
        homedepartment: provider.homedepartment || "",
      },
      responseShape: Array.isArray(response.body) ? "array" : typeof response.body,
      responseBody: response.body,
      record,
    });
    console.log(
      `GET ${apiPath} -> ${response.status} | ${getProviderName(provider)} | ${
        record ? Object.keys(record).length : 0
      } fields`
    );
  }

  const detailRecords = pulls.filter((pull) => pull.ok && pull.record).map((pull) => pull.record);
  const report = {
    generatedAt: new Date().toISOString(),
    practiceId: client.practiceId,
    outputJsonPath,
    endpoints: {
      catalog: `/v1/${client.practiceId}/providers`,
      detail: `/v1/${client.practiceId}/providers/{providerid}`,
    },
    selection: {
      mode: getArg("provider-ids") ? "provider-ids" : hasFlag("all") ? "all" : "diverse-sample",
      requestedProviderIds: getArg("provider-ids")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      selectedProviderIds: selectedProviders.map((provider) => provider.providerid),
    },
    providerCatalog: {
      recordCount: providerCatalog.length,
      visibleBillablePersonCount: providerCatalog.filter(isVisibleBillablePerson).length,
      fieldInventory: buildFieldInventory(providerCatalog),
    },
    detailFieldInventory: buildFieldInventory(detailRecords),
    pulls,
  };

  fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputMarkdownPath), { recursive: true });
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(outputMarkdownPath, renderMarkdown(report), "utf8");

  console.log(`Raw JSON written: ${outputJsonPath}`);
  console.log(`Field report written: ${outputMarkdownPath}`);
  console.log(
    JSON.stringify(
      {
        providerCatalogRecords: providerCatalog.length,
        individualPulls: pulls.length,
        successfulPulls: pulls.filter((pull) => pull.ok && pull.record).length,
        detailFieldsObserved: report.detailFieldInventory.length,
        catalogFieldsObserved: report.providerCatalog.fieldInventory.length,
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
