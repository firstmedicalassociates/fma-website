import test from "node:test";
import assert from "node:assert/strict";
import {
  readAthenaCollection,
  AthenaRequestError,
  auditProviderDepartments,
  getProviderProfileGaps,
  onlineProviderExclusions,
} from "../../src/app/lib/athena-diagnostics.mjs";
import {
  describeSpendingCoverage,
  fillDailyDates,
} from "../../src/app/lib/ai-spending-summary.mjs";

test("directory pagination includes providers beyond the first hundred", async () => {
  const calls = [];
  const all = await readAthenaCollection(async ({ offset, limit }) => {
    calls.push({ offset, limit });
    return {
      ok: true,
      body: {
        providers: Array.from({ length: offset ? 1 : 100 }, (_, i) => ({
          providerid: offset + i,
        })),
        totalcount: 101,
      },
    };
  }, "providers");
  assert.equal(all.length, 101);
  assert.deepEqual(
    calls.map((x) => x.offset),
    [0, 100],
  );
});
test("directory failures and incomplete pagination are not valid empty directories", async () => {
  await assert.rejects(
    readAthenaCollection(async () => ({ ok: false, status: 403 }), "providers"),
    { status: 403 },
  );
  await assert.rejects(
    readAthenaCollection(
      async () => ({
        ok: true,
        body: { providers: [{ id: 1 }], next: "more" },
      }),
      "providers",
    ),
    { code: "athena_providers_pagination_failed" },
  );
  await assert.rejects(
    readAthenaCollection(async () => ({ ok: true, body: {} }), "providers"),
    { code: "athena_providers_invalid_response_failed" },
  );
});
test("department fallback can find openings outside the primary mapping", async () => {
  const result = await auditProviderDepartments({
    departments: [{ departmentid: 1 }, { departmentid: 2 }],
    check: async (d) => ({
      slotStatus: d.departmentid === 2 ? "slots_found" : "no_slots_found",
      slotCount: d.departmentid === 2 ? 1 : 0,
    }),
  });
  assert.equal(result.slotStatus, "slots_found");
  assert.equal(result.checks.length, 2);
});
test("failed or timed-out checks do not become no-slots results", async () => {
  const result = await auditProviderDepartments({
    departments: [{ departmentid: 1 }],
    check: async () => {
      throw Object.assign(new AthenaRequestError("open_slots", 429), {
        reasonCount: 3,
        reasonsChecked: 1,
      });
    },
  });
  assert.equal(result.slotStatus, "lookup_unavailable");
  assert.equal(result.checks[0].httpStatus, 429);
  assert.equal(result.checks[0].reasonCount, 3);
  assert.equal(result.checks[0].reasonsChecked, 1);
  assert.equal(result.complete, false);
  const timed = await auditProviderDepartments({
    departments: [{ departmentid: 1 }],
    deadline: 1,
    now: () => 2,
    check: () => assert.fail("must not call after deadline"),
  });
  assert.equal(timed.slotStatus, "lookup_unavailable");
  assert.equal(timed.checks.length, 0);
});
test("successful empty checks distinguish no reasons from no openings", async () => {
  for (const status of ["no_reasons", "no_slots_found"]) {
    const result = await auditProviderDepartments({
      departments: [{ departmentid: 1 }],
      check: async () => ({ slotStatus: status, slotCount: 0 }),
    });
    assert.equal(result.slotStatus, status);
    assert.equal(result.complete, true);
  }
});
test("optional overrides and general-booking fallback are not profile gaps", () => {
  assert.deepEqual(
    getProviderProfileGaps([
      {
        name: "Example",
        locations: ["Office"],
        languages: ["English"],
        athenaProviderId: null,
        athenaDepartmentId: null,
        linkUrl: null,
      },
    ]),
    [],
  );
  assert.equal(
    getProviderProfileGaps([{ name: "New", locations: [], languages: [] }])[0]
      .gaps.length,
    2,
  );
  assert.deepEqual(
    onlineProviderExclusions({
      entitytype: "Person",
      billable: true,
      hideinportal: true,
    }),
    ["Hidden from the patient portal"],
  );
});
test("spending explains historical, deterministic, missing-usage and empty states", () => {
  assert.equal(
    describeSpendingCoverage({ summary: { calls: 0 }, historicalSearches: 10 })
      .state,
    "historical",
  );
  const zero = describeSpendingCoverage({
    summary: { calls: 0 },
    trackedSearches: 2,
  });
  assert.equal(zero.state, "recorded");
  assert.match(zero.message, /\$0/);
  assert.equal(
    describeSpendingCoverage({
      summary: { calls: 2, unknownCalls: 2 },
      trackedSearches: 1,
    }).label,
    "Unavailable",
  );
  assert.equal(
    describeSpendingCoverage({ summary: { calls: 0 } }).label,
    "No activity",
  );
});
test("daily charts fill missing UTC days without overwriting unknown costs", () => {
  const rows = fillDailyDates(
    [{ date: "2026-09-02", cost: null }],
    "2026-09-01T00:00:00Z",
    "2026-09-04T00:00:00Z",
    "cost",
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].cost, 0);
  assert.equal(rows[1].cost, null);
  assert.equal(rows[2].date, "2026-09-03");
});

test("Athena integration fixture: pagination, portal exclusions, all reasons, fallback, and HTTP errors", async () => {
  const { prisma } = await import("../../src/app/lib/prisma.js");
  const oldFetch = globalThis.fetch;
  const oldFind = prisma.provider.findMany;
  const envKeys = [
    "ATHENA_CLIENT_ID",
    "ATHENA_CLIENT_SECRET",
    "ATHENA_BASE_URL",
    "ATHENA_DEFAULT_SCOPE",
    "ATHENA_DEFAULT_PRACTICE_ID",
    "ATHENA_TOKEN_URL",
  ];
  const previous = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, {
    ATHENA_CLIENT_ID: "fixture",
    ATHENA_CLIENT_SECRET: "fixture",
    ATHENA_BASE_URL: "https://athena.example.test",
    ATHENA_DEFAULT_SCOPE: "fixture",
    ATHENA_DEFAULT_PRACTICE_ID: "1",
    ATHENA_TOKEN_URL: "https://athena.example.test/token",
  });
  const names = [
    "Anmol Singh",
    "Audrey Boadu",
    "Grace Nzouatcham",
    "Susan George",
    "Khai-El Johnson",
    "Empty Example",
  ];
  prisma.provider.findMany = async () =>
    names.map((name) => ({
      name,
      slug: name.toLowerCase().replaceAll(" ", "-"),
      title: "MD",
    }));
  const clinician = (id, name, hidden = false) => ({
    providerid: id,
    firstname: name.split(" ")[0],
    lastname: name.split(" ").slice(1).join(" "),
    homedepartment: "Alpha",
    entitytype: "Person",
    billable: true,
    hideinportal: hidden,
  });
  const providers = Array.from({ length: 100 }, (_, i) =>
    clinician(String(i), `Fixture${i} Person${i}`),
  );
  providers.push(
    clinician("101", names[0]),
    clinician("102", names[1], true),
    clinician("103", names[2]),
    clinician("104", names[3]),
    clinician("105", names[5]),
  );
  const requests = [];
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    requests.push(u);
    const offset = Number(u.searchParams.get("offset") || 0);
    const pid = u.searchParams.get("providerid");
    const dept = u.searchParams.get("departmentid");
    let data;
    let status = 200;
    if (u.pathname === "/token")
      data = { access_token: "fixture", expires_in: 3600 };
    else if (u.pathname.endsWith("/departments"))
      data = {
        departments: [
          { departmentid: "1", name: "Alpha" },
          { departmentid: "2", name: "Beta" },
        ],
        totalcount: 2,
      };
    else if (u.pathname.endsWith("/providers"))
      data = {
        providers: providers.slice(offset, offset + 100),
        totalcount: providers.length,
      };
    else if (u.pathname.endsWith("/patientappointmentreasons")) {
      if (pid === "104" && dept === "1") {
        data = {};
        status = 403;
      } else
        data = {
          patientappointmentreasons:
            dept === "2" && pid !== "103"
              ? []
              : [1, 2, 3].map((id) => ({
                  reasonid: String(id),
                  reason: `Reason ${id}`,
                })),
        };
    } else if (u.pathname.endsWith("/appointments/open"))
      data = {
        appointments:
          (pid === "101" && u.searchParams.get("reasonid") === "3") ||
          (pid === "103" && dept === "2")
            ? [
                {
                  appointmentid: "fixture",
                  date: "09/20/2026",
                  starttime: "10:00",
                },
              ]
            : [],
      };
    else throw Error("Unexpected fixture path");
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const {
      getAthenaProviderMappingCoverage,
      getAppointmentAvailabilityForQuery,
    } = await import(
      "../../src/app/lib/athena-availability.js?diagnostics-fixture"
    );
    const result = await getAthenaProviderMappingCoverage();
    assert.equal(result.available, true);
    const row = (name) => result.rows.find((row) => row.name === name);
    assert.equal(row(names[0]).slotStatus, "slots_found");
    assert.equal(row(names[0]).checks[0].reasonsChecked, 3);
    assert.equal(row(names[1]).status, "excluded_from_online");
    assert.equal(row(names[1]).slotStatus, "not_checked");
    assert.equal(
      row(names[2]).checks.find((x) => x.slotCount).departmentId,
      "2",
    );
    assert.equal(row(names[3]).slotStatus, "lookup_unavailable");
    assert.equal(row(names[3]).checks[0].httpStatus, 403);
    assert.equal(row(names[3]).checks[0].reasonCount, null);
    assert.equal(row(names[4]).status, "missing_mapping");
    assert.ok(row(names[4]).warnings.length);
    assert.equal(row(names[5]).slotStatus, "no_slots_found");
    assert.ok(requests.some((u) => u.searchParams.get("offset") === "100"));
    const publicResult = await getAppointmentAvailabilityForQuery(
      "When can I see Susan George?",
      { force: true },
    );
    assert.equal(publicResult.meta.availabilityStatus, "unavailable");
  } finally {
    globalThis.fetch = oldFetch;
    prisma.provider.findMany = oldFind;
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    await prisma.$disconnect();
  }
});
