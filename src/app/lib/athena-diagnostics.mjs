export class AthenaRequestError extends Error {
  constructor(operation, status) {
    super(
      `Athena ${operation} request could not be completed${status ? ` (HTTP ${status})` : ""}.`,
    );
    this.name = "AthenaRequestError";
    this.code =
      operation === "time_limit"
        ? "diagnostic_time_limit"
        : `athena_${operation}_failed`;
    this.status = status || null;
  }
}

// Read every directory page. An incomplete directory must never become a cached match result.
export async function readAthenaCollection(
  getPage,
  key,
  { pageSize = 100, maxPages = 50 } = {},
) {
  const rows = [];
  let offset = 0;
  const seen = new Set();
  for (let page = 0; page < maxPages; page += 1) {
    const response = await getPage({ limit: pageSize, offset });
    if (!response.ok) throw new AthenaRequestError(key, response.status);
    const items = response.body?.[key];
    if (!Array.isArray(items))
      throw new AthenaRequestError(`${key}_invalid_response`);
    const fingerprint = JSON.stringify(items);
    if (items.length && seen.has(fingerprint))
      throw new AthenaRequestError(`${key}_pagination`);
    seen.add(fingerprint);
    rows.push(...items);
    offset += items.length;
    const total = Number(response.body?.totalcount);
    const more =
      Boolean(response.body?.next) ||
      (Number.isFinite(total) && offset < total) ||
      (!Number.isFinite(total) && items.length === pageSize);
    if (!more) return rows;
    if (!items.length) throw new AthenaRequestError(`${key}_pagination`);
  }
  throw new AthenaRequestError(`${key}_pagination_limit`);
}

export function onlineProviderExclusions(provider) {
  return [
    provider.entitytype !== "Person" && "Not a person record",
    provider.billable !== true && "Not marked billable",
    provider.hideinportal === true && "Hidden from the patient portal",
  ].filter(Boolean);
}

export async function auditProviderDepartments({
  departments,
  check,
  deadline = Infinity,
  now = Date.now,
}) {
  const checks = [];
  for (const department of departments) {
    if (now() >= deadline) break;
    try {
      const result = await check(department);
      checks.push({
        departmentId: department.departmentid,
        departmentName: department.patientdepartmentname || department.name,
        ...result,
      });
      if (result.slotCount > 0)
        return {
          slotStatus: "slots_found",
          slotCount: result.slotCount,
          checks,
          departmentsAvailable: departments.length,
          complete: true,
        };
    } catch (error) {
      checks.push({
        departmentId: department.departmentid,
        departmentName: department.patientdepartmentname || department.name,
        slotStatus: "lookup_unavailable",
        slotCount: 0,
        errorCode: error.code || "athena_request_failed",
        httpStatus: error.status || null,
        reasonCount: error.reasonCount ?? null,
        reasonsChecked: error.reasonsChecked ?? 0,
      });
    }
  }
  const incomplete =
    checks.length < departments.length ||
    checks.some((row) => row.slotStatus === "lookup_unavailable");
  return {
    slotStatus: incomplete
      ? "lookup_unavailable"
      : !departments.length
        ? "not_checked"
        : checks.every((row) => row.slotStatus === "no_reasons")
          ? "no_reasons"
          : "no_slots_found",
    slotCount: 0,
    checks,
    departmentsAvailable: departments.length,
    complete: !incomplete && departments.length > 0,
  };
}

export function getProviderProfileGaps(providers) {
  return providers
    .map((provider) => ({
      name: provider.name,
      slug: provider.slug,
      gaps: [
        !provider.locations?.length && "No public location assigned",
        !provider.languages?.length && "Languages not entered",
      ].filter(Boolean),
    }))
    .filter((row) => row.gaps.length);
}

export function mappingRecommendation(row) {
  if (row.status === "excluded_from_online")
    return "Review the provider's online-scheduling settings in Athena. The website will not bypass those settings.";
  if (
    [
      "missing_mapping",
      "configured_provider_missing",
      "unsafe_multiple_matches",
    ].includes(row.status)
  )
    return "Confirm this provider's Athena ID with the scheduling team, then enter it in the provider editor. Do not guess an ID.";
  if (row.slotStatus === "lookup_unavailable")
    return "The check is incomplete. Review the HTTP/error details and recheck this provider; this does not mean there are no appointments.";
  if (row.slotStatus === "no_reasons")
    return "Athena returned no online appointment reasons in the checked departments. Review online appointment-reason configuration with the scheduling team.";
  if (row.slotStatus === "no_slots_found")
    return "No online slots were returned for the checked reasons and dates. Confirm availability in Athena; this is not a provider-mapping error.";
  if (
    String(row.checks?.find((check) => check.slotCount > 0)?.departmentId) !==
      String(row.matchedDepartmentId) &&
    row.slotStatus === "slots_found"
  )
    return "Slots were found in another department. Review the department details before changing an explicit mapping.";
  return "Automatic name and department matching is working. Manual overrides are optional.";
}
