import "dotenv/config";

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 100;

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

function formatAthenaDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function addQuery(pathname, params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value).trim());
    }
  }
  return `${pathname}?${searchParams.toString()}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
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

async function getAccessToken(config) {
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
    throw new Error(`Token request failed with status ${response.status}`);
  }

  return response.body.access_token;
}

async function getAthena(config, accessToken, path) {
  return fetchJson(`${config.baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function getOpenAppointments(config, accessToken, params, fetchAll) {
  const limit = Number.parseInt(params.limit, 10) || DEFAULT_LIMIT;
  const appointments = [];
  let offset = 0;
  let status = null;
  let totalcount = null;
  let error = "";
  let pageCount = 0;

  while (true) {
    const response = await getAthena(
      config,
      accessToken,
      addQuery(`/v1/${encodeURIComponent(config.practiceId)}/appointments/open`, {
        ...params,
        limit,
        offset,
      })
    );
    pageCount += 1;
    status = response.status;

    if (!response.ok) {
      error = response.body?.error || response.body;
      break;
    }

    const batch = Array.isArray(response.body?.appointments) ? response.body.appointments : [];
    totalcount = response.body?.totalcount ?? totalcount ?? batch.length;
    appointments.push(...batch);

    if (!fetchAll) break;
    if (batch.length < limit) break;
    if (totalcount !== null && appointments.length >= totalcount) break;

    offset += limit;
  }

  return {
    status,
    totalcount: totalcount ?? appointments.length,
    pageCount,
    error,
    appointments,
  };
}

function normalizeAppointment(appointment) {
  return {
    appointmentid: appointment.appointmentid,
    date: appointment.date || appointment.appointmentdate,
    starttime: appointment.starttime,
    duration: appointment.duration,
    appointmenttypeid: appointment.appointmenttypeid,
    departmentid: appointment.departmentid,
    providerid: appointment.providerid,
  };
}

async function main() {
  const providerId = getArg("provider-id");
  const departmentId = getArg("department-id");
  const limit = Number.parseInt(getArg("limit", String(DEFAULT_LIMIT)), 10);
  const days = Number.parseInt(getArg("days", String(DEFAULT_DAYS)), 10);
  const fetchAll = hasFlag("all");
  const start = getArg("startdate") || formatAthenaDate(new Date());
  const end =
    getArg("enddate") ||
    formatAthenaDate(new Date(Date.now() + Math.max(days, 1) * 24 * 60 * 60 * 1000));

  if (!providerId || !departmentId) {
    throw new Error("Usage: node scripts/debug-athena-open-slots.mjs --provider-id=104 --department-id=17");
  }

  const config = createConfig();
  const accessToken = await getAccessToken(config);

  const reasonsResponse = await getAthena(
    config,
    accessToken,
    addQuery(`/v1/${encodeURIComponent(config.practiceId)}/patientappointmentreasons`, {
      providerid: providerId,
      departmentid: departmentId,
      limit: 100,
    })
  );
  const reasons = Array.isArray(reasonsResponse.body?.patientappointmentreasons)
    ? reasonsResponse.body.patientappointmentreasons
    : [];

  const result = {
    providerId,
    departmentId,
    startdate: start,
    enddate: end,
    reasonsStatus: reasonsResponse.status,
    reasons: reasons.map((reason) => ({
      reason: reason.reason || reason.description || "",
      reasonid: reason.reasonid || reason.appointmentreasonid || reason.patientappointmentreasonid,
    })),
    openCalls: [],
  };

  for (const reason of reasons) {
    const reasonid = reason.reasonid || reason.appointmentreasonid || reason.patientappointmentreasonid;
    if (!reasonid) continue;

    const openResponse = await getOpenAppointments(
      config,
      accessToken,
      {
        departmentid: departmentId,
        providerid: providerId,
        reasonid,
        startdate: start,
        enddate: end,
        limit: String(limit),
      },
      fetchAll
    );
    const appointments = openResponse.appointments;

    result.openCalls.push({
      reason: reason.reason || reason.description || "",
      reasonid,
      status: openResponse.status,
      totalcount: openResponse.totalcount,
      count: appointments.length,
      pageCount: openResponse.pageCount,
      error: openResponse.error,
      appointments: appointments.map(normalizeAppointment),
    });
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
