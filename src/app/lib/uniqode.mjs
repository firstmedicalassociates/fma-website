// Server-side integration. Never import this module into a client component.
// API contract: https://apidocs.uniqode.com/ (organization-scoped Analytics API).
const API_ROOT = "https://api.uniqode.com/api/2.0/";
const DAY = 86400000;
const CACHE_MS = 60000;

export class UniqodeError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "UniqodeError";
    this.status = status;
  }
}

export function parseQrRange(params = new URLSearchParams(), now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const to = params.get("to") || today;
  const valid = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(to))
    throw new UniqodeError("Choose valid start and end dates.", 400);
  const from =
    params.get("from") ||
    new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY)
      .toISOString()
      .slice(0, 10);
  if (!valid(from) || !valid(to))
    throw new UniqodeError("Choose valid start and end dates.", 400);
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`) + DAY - 1;
  if (from > to)
    throw new UniqodeError(
      "The start date must be on or before the end date.",
      400,
    );
  if (to > today)
    throw new UniqodeError("The end date cannot be in the future.", 400);
  if (end - start >= 366 * DAY)
    throw new UniqodeError("Choose a date range of 366 days or fewer.", 400);
  return { from, to, fromTimestamp: start, toTimestamp: end };
}

function invalidResponse() {
  return new UniqodeError(
    "Uniqode returned an unexpected response. Please retry.",
  );
}
function count(value) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw invalidResponse();
  return value;
}
function results(data) {
  if (!Array.isArray(data?.results)) throw invalidResponse();
  return data.results;
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function publicError(error) {
  return error instanceof UniqodeError
    ? error.message
    : "Uniqode analytics could not be loaded. Please retry.";
}

export function createUniqodeClient({
  apiKey,
  organizationId,
  fetcher = fetch,
  now = Date.now,
  cacheMs = CACHE_MS,
}) {
  const cache = new Map();
  const organization = String(organizationId || "").trim();
  const key = String(apiKey || "").trim();

  function configured() {
    if (!key || !/^[1-9]\d*$/.test(organization))
      throw new UniqodeError(
        "QR analytics are not configured. Set UNIQODE_API and UNIQODE_ORGANIZATION_ID on the server.",
        503,
      );
  }
  async function request(path, body) {
    configured();
    const url = new URL(path, API_ROOT);
    // Never forward the token to an arbitrary pagination URL.
    if (
      url.origin !== new URL(API_ROOT).origin ||
      !url.pathname.startsWith("/api/2.0/") ||
      url.username ||
      url.password
    )
      throw invalidResponse();
    const cacheKey = `${url.href}:${JSON.stringify(body)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > now()) return cached.promise;
    const entry = { expires: now() + cacheMs };
    entry.promise = (async () => {
      let response;
      try {
        response = await fetcher(url.href, {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Token ${key}`,
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        });
      } catch {
        throw new UniqodeError(
          "Uniqode could not be reached. Please retry.",
          503,
        );
      }
      if (!response.ok) {
        if ([401, 403].includes(response.status))
          throw new UniqodeError(
            "Uniqode denied access. Check the API key, organization, and analytics access in your Uniqode plan.",
            503,
          );
        if (response.status === 429)
          throw new UniqodeError(
            "Uniqode’s request limit was reached. Wait a minute, then retry.",
            429,
          );
        throw new UniqodeError(
          "Uniqode could not load this data. Please retry.",
          502,
        );
      }
      try {
        return await response.json();
      } catch {
        throw invalidResponse();
      }
    })();
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, entry);
    try {
      return await entry.promise;
    } catch (error) {
      if (cache.get(cacheKey) === entry) cache.delete(cacheKey);
      throw error;
    }
  }

  async function listCodes() {
    configured();
    let next = new URL(
      `qrcodes/?organization=${organization}&page_size=100`,
      API_ROOT,
    );
    const seen = new Set();
    const codes = new Map();
    while (next) {
      if (
        next.origin !== new URL(API_ROOT).origin ||
        next.pathname !== "/api/2.0/qrcodes/" ||
        seen.has(next.href) ||
        seen.size >= 100
      )
        throw invalidResponse();
      next.searchParams.set("organization", organization);
      seen.add(next.href);
      const data = await request(next.href);
      for (const qr of results(data)) {
        if (String(qr.organization) !== organization) throw invalidResponse();
        const id = count(qr.id);
        if (!id || ![1, 2].includes(qr.qr_type)) throw invalidResponse();
        codes.set(id, {
          id,
          name: qr.name || `QR Code ${id}`,
          dynamic: qr.qr_type === 2,
          status: { A: "Active", S: "Inactive" }[qr.state] || "Unknown",
          url: safeUrl(qr.url),
          destination: safeUrl(qr.campaign?.custom_url),
          created: qr.created || null,
          product: qr.campaign?.gs1_code ? "gs1" : "qr",
        });
      }
      if (data.next != null && typeof data.next !== "string")
        throw invalidResponse();
      try {
        next = data.next ? new URL(data.next, API_ROOT) : null;
      } catch {
        throw invalidResponse();
      }
    }
    return [...codes.values()];
  }

  function analytics(path, range, ids, product = "qr", extra = {}) {
    if (!ids.length) throw invalidResponse(); // [] means all products in Uniqode.
    return request(
      `organizations/${organization}/products/${product}/${path}/`,
      {
        from_timestamp: range.fromTimestamp,
        to_timestamp: range.toTimestamp,
        product_ids: ids,
        hide_anomalies: true,
        ...extra,
      },
    );
  }

  async function overview(range) {
    const codes = await listCodes();
    const scans = new Map();
    let analyticsError = null;
    try {
      for (const product of ["qr", "gs1"]) {
        const ids = codes
          .filter((qr) => qr.dynamic && qr.product === product)
          .map((qr) => qr.id);
        // Batch explicitly so Uniqode's result cap cannot silently drop codes.
        for (let index = 0; index < ids.length; index += 500) {
          const batch = ids.slice(index, index + 500);
          const data = await analytics("scans/list", range, batch, product, {
            limit: batch.length,
            sort_key: "scans",
            descending: true,
          });
          for (const row of results(data)) {
            if (!batch.includes(row.qr_id)) throw invalidResponse();
            scans.set(row.qr_id, count(row.scans));
          }
        }
      }
    } catch (error) {
      analyticsError = publicError(error);
    }
    const rows = codes.map((qr) => ({
      ...qr,
      scans: qr.dynamic && !analyticsError ? scans.get(qr.id) || 0 : null,
    }));
    rows.sort(
      (a, b) =>
        (b.scans ?? -1) - (a.scans ?? -1) || a.name.localeCompare(b.name),
    );
    return {
      codes: rows,
      analyticsError,
      range,
      fetchedAt: new Date(now()).toISOString(),
    };
  }

  async function detail(id, range) {
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
      throw new UniqodeError("Invalid QR code identifier.", 400);
    // Verify organization membership before requesting analytics for this ID.
    const code = (await listCodes()).find((qr) => qr.id === Number(id));
    if (!code)
      throw new UniqodeError("QR code not found in this organization.", 404);
    if (!code.dynamic) return { code, range, trackable: false };
    const specs = [
      ["scans", "scans/count", {}, (data) => count(data.scans)],
      [
        "uniqueScanners",
        "scanners/unique",
        {},
        (data) => count(data.unique_scanners),
      ],
      [
        "daily",
        "scans/distribution",
        { interval: "1d", timezone: "UTC" },
        (data) =>
          results(data)
            .map((row) => {
              const date = new Date(count(row.time_in_ms))
                .toISOString()
                .slice(0, 10);
              return { date, scans: count(row.scans) };
            })
            .filter((row) => row.date >= range.from && row.date <= range.to)
            .sort((a, b) => a.date.localeCompare(b.date)),
      ],
      [
        "devices",
        "scans/device-os",
        {},
        (data) =>
          results(data).map((row) => ({
            label: String(row.device_os || "Unknown"),
            count: count(row.scans),
          })),
      ],
      [
        "locations",
        "scans/city",
        {},
        (data) =>
          results(data).map((row) => ({
            label:
              [row.city, row.state, row.country].filter(Boolean).join(", ") ||
              "Unknown",
            count: count(row.scans),
          })),
      ],
    ];
    const responses = await Promise.allSettled(
      specs.map(async ([, path, extra, normalize]) =>
        normalize(await analytics(path, range, [code.id], code.product, extra)),
      ),
    );
    const data = { code, range, trackable: true, errors: {} };
    responses.forEach((result, index) => {
      const name = specs[index][0];
      data[name] = result.status === "fulfilled" ? result.value : null;
      if (result.status === "rejected")
        data.errors[name] = publicError(result.reason);
    });
    return data;
  }
  return { overview, detail };
}

let client;
let configuration;
export function getUniqodeClient() {
  const apiKey = process.env.UNIQODE_API;
  const organizationId = process.env.UNIQODE_ORGANIZATION_ID;
  if (
    !client ||
    configuration.apiKey !== apiKey ||
    configuration.organizationId !== organizationId
  ) {
    configuration = { apiKey, organizationId };
    client = createUniqodeClient(configuration);
  }
  return client;
}
