import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ATHENA_BASE_URL = "https://api.platform.athenahealth.com";
const TOKEN_PATH = "/oauth2/v1/token";
const ATHENA_REQUEST_TIMEOUT_MS = 20000;

function normalizeUrl(rawUrl, fallback) {
  const value = String(rawUrl || fallback || "").trim();
  if (!value) return "";

  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/+$/, "");
}

function getAthenaConfig() {
  const clientId = process.env.ATHENA_CLIENT_ID?.trim();
  const clientSecret = process.env.ATHENA_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      error: "ATHENA_CLIENT_ID and ATHENA_CLIENT_SECRET must be configured on the server.",
    };
  }

  try {
    const baseUrl = normalizeUrl(process.env.ATHENA_BASE_URL, DEFAULT_ATHENA_BASE_URL);
    const tokenUrl = normalizeUrl(process.env.ATHENA_TOKEN_URL, `${baseUrl}${TOKEN_PATH}`);

    return {
      ok: true,
      clientId,
      clientSecret,
      baseUrl,
      tokenUrl,
      defaultScope: process.env.ATHENA_DEFAULT_SCOPE?.trim() || "",
      defaultPracticeId: process.env.ATHENA_DEFAULT_PRACTICE_ID?.trim() || "",
      defaultDepartmentId: process.env.ATHENA_DEFAULT_DEPARTMENT_ID?.trim() || "",
    };
  } catch {
    return {
      ok: false,
      error: "Athena URL configuration is invalid.",
    };
  }
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get("content-type") || "";
  const trimmed = text.trim();

  if (
    contentType.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

function sanitizeTokenResponse(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const sanitized = { ...body };
  const accessToken = sanitized.access_token;
  delete sanitized.access_token;
  delete sanitized.refresh_token;
  delete sanitized.id_token;

  return {
    ...sanitized,
    accessTokenReceived: Boolean(accessToken),
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATHENA_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestAthenaToken(config, scope) {
  const formBody = new URLSearchParams({ grant_type: "client_credentials" });
  const normalizedScope = String(scope || config.defaultScope || "").trim();
  if (normalizedScope) {
    formBody.set("scope", normalizedScope);
  }

  try {
    const response = await fetchWithTimeout(config.tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
          "base64"
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "Athena token request failed.",
        body: sanitizeTokenResponse(body),
      };
    }

    if (!body?.access_token) {
      return {
        ok: false,
        status: response.status,
        error: "Athena token response did not include an access token.",
        body: sanitizeTokenResponse(body),
      };
    }

    return {
      ok: true,
      accessToken: body.access_token,
      summary: sanitizeTokenResponse(body),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error:
        error?.name === "AbortError"
          ? "Athena token request timed out."
          : "Athena token request could not be completed.",
    };
  }
}

function buildAthenaEndpointUrl(baseUrl, practiceId, endpointPath) {
  const rawEndpointPath = String(endpointPath || "").trim();

  if (!rawEndpointPath) {
    return {
      ok: false,
      error: "Enter an Athena endpoint path to test.",
    };
  }

  if (/^(https?:)?\/\//i.test(rawEndpointPath)) {
    return {
      ok: false,
      error: "Use a relative Athena API path, not a full URL.",
    };
  }

  let apiPath;
  if (rawEndpointPath.startsWith("/v1/")) {
    apiPath = rawEndpointPath;
  } else {
    const normalizedPracticeId = String(practiceId || "").trim();
    if (!/^[A-Za-z0-9_-]+$/.test(normalizedPracticeId)) {
      return {
        ok: false,
        error: "Practice ID is required unless the endpoint path starts with /v1/.",
      };
    }

    apiPath = `/v1/${encodeURIComponent(normalizedPracticeId)}/${rawEndpointPath.replace(
      /^\/+/,
      ""
    )}`;
  }

  if (!apiPath.startsWith("/v1/")) {
    return {
      ok: false,
      error: "Athena test endpoints must be under /v1/.",
    };
  }

  const base = new URL(baseUrl);
  const url = new URL(apiPath, base);

  if (url.origin !== base.origin) {
    return {
      ok: false,
      error: "Athena endpoint must stay on the configured Athena API host.",
    };
  }

  return {
    ok: true,
    url,
    displayPath: `${url.pathname}${url.search}`,
  };
}

function normalizePracticeId(value) {
  const practiceId = String(value || "").trim();
  return /^[A-Za-z0-9_-]+$/.test(practiceId) ? practiceId : "";
}

function normalizeLimit(value, fallback = 25, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function formatAthenaDate(value, fallbackDate) {
  const rawValue = String(value || "").trim();
  const dateValue = rawValue || fallbackDate;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    return dateValue;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-");
    return `${month}/${day}/${year}`;
  }

  return "";
}

function addQueryParams(path, params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value).trim());
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

async function fetchAthenaJson(config, accessToken, path) {
  const endpoint = buildAthenaEndpointUrl(config.baseUrl, "", path);
  if (!endpoint.ok) {
    return {
      ok: false,
      status: 400,
      endpoint: path,
      error: endpoint.error,
    };
  }

  try {
    const response = await fetchWithTimeout(endpoint.url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const body = await parseResponseBody(response);

    return {
      ok: response.ok,
      status: response.status,
      endpoint: endpoint.displayPath,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      endpoint: path,
      error:
        error?.name === "AbortError"
          ? "Athena API request timed out."
          : "Athena API request could not be completed.",
    };
  }
}

function getProviderDisplayName(provider) {
  const fullName = [provider?.firstname, provider?.lastname].filter(Boolean).join(" ").trim();
  return fullName || provider?.schedulingname || provider?.displayname || "";
}

function normalizeProvider(provider) {
  return {
    providerid: provider?.providerid,
    name: getProviderDisplayName(provider),
    firstname: provider?.firstname,
    lastname: provider?.lastname,
    schedulingname: provider?.schedulingname,
    specialty: provider?.specialty,
    providertype: provider?.providertype,
    acceptingnewpatients: provider?.acceptingnewpatients,
    billable: provider?.billable,
    hideinportal: provider?.hideinportal,
  };
}

function normalizeDepartment(department) {
  return {
    departmentid: department?.departmentid,
    name: department?.patientdepartmentname || department?.name,
    phone: department?.phone,
    city: department?.city,
    state: department?.state,
    timezone: department?.timezonename,
  };
}

function normalizeAppointmentType(appointmentType) {
  return {
    appointmenttypeid: appointmentType?.appointmenttypeid,
    name: appointmentType?.patientdisplayname || appointmentType?.name,
    shortname: appointmentType?.shortname,
    duration: appointmentType?.duration,
    patient: appointmentType?.patient,
  };
}

function normalizeOpenAppointment(appointment, providersById, departmentsById, appointmentTypesById) {
  const provider = providersById.get(String(appointment?.providerid || ""));
  const department = departmentsById.get(String(appointment?.departmentid || ""));
  const appointmentType = appointmentTypesById.get(String(appointment?.appointmenttypeid || ""));

  return {
    appointmentid: appointment?.appointmentid,
    date: appointment?.date || appointment?.appointmentdate,
    starttime: appointment?.starttime,
    duration: appointment?.duration,
    providerid: appointment?.providerid,
    providername: provider?.name || appointment?.providername || "",
    departmentid: appointment?.departmentid,
    departmentname: department?.name || "",
    appointmenttypeid: appointment?.appointmenttypeid,
    appointmenttypename: appointmentType?.name || appointment?.appointmenttypename || "",
    raw: appointment,
  };
}

function createLookup(items, key) {
  return new Map(
    items
      .map((item) => [String(item?.[key] || ""), item])
      .filter(([itemKey]) => Boolean(itemKey))
  );
}

async function runProviderAvailabilityLookup(config, tokenResult, body) {
  const practiceId = normalizePracticeId(body?.practiceId || config.defaultPracticeId);
  if (!practiceId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Practice ID is required for provider availability lookup." },
        { status: 400 }
      ),
    };
  }

  const departmentId = String(body?.departmentId || config.defaultDepartmentId || "").trim();
  if (!departmentId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Department ID is required for open appointment availability." },
        { status: 400 }
      ),
    };
  }

  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 14);
  const toInputDate = (date) => date.toISOString().slice(0, 10);
  const startdate = formatAthenaDate(body?.startDate, toInputDate(today));
  const enddate = formatAthenaDate(body?.endDate, toInputDate(end));

  if (!startdate || !enddate) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Start date and end date must be YYYY-MM-DD or MM/DD/YYYY." },
        { status: 400 }
      ),
    };
  }

  const limit = normalizeLimit(body?.limit, 25, 100);
  const providerId = String(body?.providerId || "").trim();
  const appointmentTypeId = String(body?.appointmentTypeId || "").trim();
  const basePath = `/v1/${encodeURIComponent(practiceId)}`;

  const providerPath = providerId
    ? `${basePath}/providers/${encodeURIComponent(providerId)}`
    : addQueryParams(`${basePath}/providers`, { limit: 100 });
  const departmentsPath = addQueryParams(`${basePath}/departments`, { limit: 100 });
  const appointmentTypesPath = addQueryParams(`${basePath}/appointmenttypes`, { limit: 100 });
  const openAppointmentsPath = addQueryParams(`${basePath}/appointments/open`, {
    departmentid: departmentId,
    providerid: providerId,
    appointmenttypeid: appointmentTypeId,
    startdate,
    enddate,
    limit,
  });

  const [providersResponse, departmentsResponse, appointmentTypesResponse, openResponse] =
    await Promise.all([
      fetchAthenaJson(config, tokenResult.accessToken, providerPath),
      fetchAthenaJson(config, tokenResult.accessToken, departmentsPath),
      fetchAthenaJson(config, tokenResult.accessToken, appointmentTypesPath),
      fetchAthenaJson(config, tokenResult.accessToken, openAppointmentsPath),
    ]);

  const failedResponse = [providersResponse, departmentsResponse, appointmentTypesResponse, openResponse].find(
    (response) => !response.ok
  );
  if (failedResponse) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          step: "providerAvailability",
          athenaStatus: failedResponse.status,
          endpoint: failedResponse.endpoint,
          error: failedResponse.error || "Athena provider availability lookup failed.",
          response: failedResponse.body,
        },
        { status: 502 }
      ),
    };
  }

  const providerItems = providerId
    ? Array.isArray(providersResponse.body)
      ? providersResponse.body
      : [providersResponse.body].filter(Boolean)
    : providersResponse.body?.providers || [];
  const providers = providerItems.map(normalizeProvider);
  const departments = (departmentsResponse.body?.departments || []).map(normalizeDepartment);
  const appointmentTypes = (appointmentTypesResponse.body?.appointmenttypes || []).map(
    normalizeAppointmentType
  );
  const providersById = createLookup(providers, "providerid");
  const departmentsById = createLookup(departments, "departmentid");
  const appointmentTypesById = createLookup(appointmentTypes, "appointmenttypeid");
  const appointments = (openResponse.body?.appointments || []).map((appointment) =>
    normalizeOpenAppointment(appointment, providersById, departmentsById, appointmentTypesById)
  );

  return {
    ok: true,
    response: NextResponse.json({
      ok: true,
      step: "providerAvailability",
      practiceId,
      filters: {
        departmentId,
        providerId: providerId || null,
        appointmentTypeId: appointmentTypeId || null,
        startdate,
        enddate,
        limit,
      },
      endpoints: {
        providers: providersResponse.endpoint,
        departments: departmentsResponse.endpoint,
        appointmentTypes: appointmentTypesResponse.endpoint,
        openAppointments: openResponse.endpoint,
      },
      token: tokenResult.summary,
      providers,
      departments,
      appointmentTypes,
      availability: {
        totalcount: openResponse.body?.totalcount ?? appointments.length,
        appointments,
      },
    }),
  };
}

export async function POST(request) {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const config = getAthenaConfig();
  if (!config.ok) {
    return NextResponse.json({ ok: false, error: config.error }, { status: 500 });
  }

  const action = String(body?.action || "").trim();
  const tokenResult = await requestAthenaToken(config, body?.scope);

  if (!tokenResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        step: "token",
        athenaStatus: tokenResult.status,
        error: tokenResult.error,
        response: tokenResult.body,
      },
      { status: 502 }
    );
  }

  if (action === "token") {
    return NextResponse.json({
      ok: true,
      step: "token",
      token: tokenResult.summary,
    });
  }

  if (action === "providerAvailability") {
    const providerAvailabilityResult = await runProviderAvailabilityLookup(config, tokenResult, body);
    return providerAvailabilityResult.response;
  }

  if (action !== "get") {
    return NextResponse.json(
      { ok: false, error: "Unsupported Athena test action." },
      { status: 400 }
    );
  }

  const endpoint = buildAthenaEndpointUrl(config.baseUrl, body?.practiceId, body?.endpointPath);
  if (!endpoint.ok) {
    return NextResponse.json({ ok: false, error: endpoint.error }, { status: 400 });
  }

  try {
    const response = await fetchWithTimeout(endpoint.url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
    });

    const responseBody = await parseResponseBody(response);

    return NextResponse.json(
      {
        ok: response.ok,
        step: "get",
        athenaStatus: response.status,
        endpoint: endpoint.displayPath,
        token: tokenResult.summary,
        response: responseBody,
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        step: "get",
        error:
          error?.name === "AbortError"
            ? "Athena API request timed out."
            : "Athena API request could not be completed.",
      },
      { status: 502 }
    );
  }
}
