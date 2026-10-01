import test from "node:test";
import assert from "node:assert/strict";
import {
  createUniqodeClient,
  parseQrRange,
  UniqodeError,
} from "../../src/app/lib/uniqode.mjs";
import {
  hasPermission,
  normalizePermissions,
  permissionForRequest,
} from "../../src/app/lib/admin-permissions.mjs";
import {
  ADMIN_PRIMARY_LINK_BY_KEY,
  canSeeAdminLink,
} from "../../src/app/lib/config/admin-navigation.mjs";

const now = new Date("2026-10-01T12:00:00Z");
const range = parseQrRange(new URLSearchParams(), now);
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status });
const qr = (id, extra = {}) => ({
  id,
  organization: 42,
  name: `Code ${id}`,
  qr_type: 2,
  state: "A",
  url: `https://uniqode.io/${id}`,
  ...extra,
});
const client = (fetcher, extra = {}) =>
  createUniqodeClient({
    apiKey: "test-only",
    organizationId: "42",
    fetcher,
    ...extra,
  });

test("QR ranges use inclusive UTC dates and reject invalid or excessive windows", () => {
  assert.equal(range.from, "2026-09-02");
  assert.equal(range.to, "2026-10-01");
  assert.equal(range.toTimestamp - range.fromTimestamp, 30 * 86400000 - 1);
  assert.ok(
    range.fromTimestamp > 1e12,
    "Uniqode expects milliseconds, not seconds",
  );
  for (const query of [
    "to=bad",
    "from=2026-02-30",
    "to=2026-02-30",
    "from=2026-10-02",
    "to=2026-10-02",
    "from=2024-01-01",
  ]) {
    assert.throws(
      () => parseQrRange(new URLSearchParams(query), now),
      (error) => error instanceof UniqodeError && error.status === 400,
    );
  }
  const single = parseQrRange(
    new URLSearchParams("from=2026-10-01&to=2026-10-01"),
    now,
  );
  assert.equal(single.toTimestamp - single.fromTimestamp, 86400000 - 1);
});

test("QR navigation, page permissions, and API permissions are independent of other analytics", () => {
  const user = {
    role: "SUB_ADMIN",
    isActive: true,
    permissions: ["ai-search.view"],
  };
  const link = ADMIN_PRIMARY_LINK_BY_KEY["qr-codes"];
  assert.equal(link.href, "/admin/qr-codes");
  assert.equal(canSeeAdminLink(user, link), false);
  user.permissions = normalizePermissions(["qr-codes.view"]);
  assert.equal(canSeeAdminLink(user, link), true);
  assert.equal(hasPermission(user, "ai-search.view"), false);
  assert.equal(
    hasPermission({ ...user, mustChangePassword: true }, "qr-codes.view"),
    false,
  );
  assert.equal(permissionForRequest("/api/admin/qr-codes"), "qr-codes.view");
  assert.equal(
    permissionForRequest("/api/admin/qr-codes/123", "HEAD"),
    "qr-codes.view",
  );
  assert.equal(permissionForRequest("/api/admin/qr-codes", "POST"), "admin");
});

test("list pagination is organization scoped, includes unscanned and static codes, and caches requests", async () => {
  let calls = 0;
  const api = client(async (url, options) => {
    calls++;
    assert.equal(options.headers.Authorization, "Token test-only");
    assert.equal(options.redirect, "error");
    if (url.includes("qrcodes/")) {
      assert.equal(new URL(url).searchParams.get("organization"), "42");
      return new URL(url).searchParams.has("page")
        ? json({ results: [qr(3), qr(4, { qr_type: 1 })], next: null })
        : json({
            results: [qr(1), qr(2)],
            next: "https://api.uniqode.com/api/2.0/qrcodes/?page=2",
          });
    }
    const body = JSON.parse(options.body);
    assert.deepEqual(body.product_ids, [1, 2, 3]);
    assert.equal(body.hide_anomalies, true);
    assert.equal(body.from_timestamp, range.fromTimestamp);
    assert.equal(body.limit, 3);
    return json({
      results: [
        { qr_id: 2, scans: 10 },
        { qr_id: 1, scans: 3 },
      ],
    });
  });
  const result = await api.overview(range);
  assert.deepEqual(
    result.codes.map(({ id, scans }) => [id, scans]),
    [
      [2, 10],
      [1, 3],
      [3, 0],
      [4, null],
    ],
  );
  assert.equal(result.analyticsError, null);
  await api.overview(range);
  assert.equal(calls, 3);
});

test("large inventories are batched without truncating comparison counts", async () => {
  const ids = [];
  const api = client(async (url, options) => {
    if (url.includes("qrcodes/"))
      return json({
        results: Array.from({ length: 501 }, (_, i) => qr(i + 1)),
        next: null,
      });
    const body = JSON.parse(options.body);
    assert.ok(body.product_ids.length <= 500);
    assert.equal(body.limit, body.product_ids.length);
    ids.push(...body.product_ids);
    return json({
      results: body.product_ids.map((id) => ({ qr_id: id, scans: id })),
    });
  });
  const result = await api.overview(range);
  assert.equal(ids.length, 501);
  assert.equal(result.codes[0].id, 501);
  assert.equal(result.codes.at(-1).scans, 1);
});

test("empty organizations do not issue an unscoped analytics request", async () => {
  let calls = 0;
  const result = await client(async () => {
    calls++;
    return json({ results: [], next: null });
  }).overview(range);
  assert.deepEqual(result.codes, []);
  assert.equal(calls, 1);
});

test("tokens never follow foreign pagination, redirects, or another organization", async () => {
  for (const data of [
    { results: [qr(1)], next: "https://attacker.example/api/2.0/qrcodes/" },
    { results: [qr(1)], next: "https://api.uniqode.com/api/2.0/users/" },
    { results: [qr(1, { organization: 99 })], next: null },
  ]) {
    let calls = 0;
    await assert.rejects(
      client(async () => {
        calls++;
        return json(data);
      }).overview(range),
      /unexpected response/,
    );
    assert.equal(calls, 1);
  }
});

test("analytics failures retain the inventory with unknown counts and are retryable", async () => {
  let attempts = 0;
  const api = client(async (url) => {
    if (url.includes("qrcodes/")) return json({ results: [qr(1)], next: null });
    attempts++;
    return attempts === 1
      ? json({ detail: "private upstream details" }, 429)
      : json({ results: [] });
  });
  const failed = await api.overview(range);
  assert.equal(failed.codes[0].scans, null);
  assert.match(failed.analyticsError, /request limit/);
  assert.doesNotMatch(failed.analyticsError, /private/);
  const retried = await api.overview(range);
  assert.equal(retried.codes[0].scans, 0);
  assert.equal(retried.analyticsError, null);
});

test("malformed metrics are unavailable, never fabricated zeroes", async () => {
  const result = await client(async (url) =>
    url.includes("qrcodes/")
      ? json({ results: [qr(1)], next: null })
      : json({ results: [{ qr_id: 1 }] }),
  ).overview(range);
  assert.equal(result.codes[0].scans, null);
  assert.match(result.analyticsError, /unexpected response/);
});

test("details scope every metric and use distinct scanners, preserving partial failures", async () => {
  const api = client(async (url, options) => {
    if (url.includes("qrcodes/"))
      return json({
        results: [qr(1, { campaign: { custom_url: "javascript:alert(1)" } })],
        next: null,
      });
    const body = JSON.parse(options.body);
    assert.deepEqual(body.product_ids, [1]);
    assert.equal(body.hide_anomalies, true);
    if (url.endsWith("/scans/count/")) return json({ scans: 9 });
    if (url.endsWith("/scanners/unique/")) return json({ unique_scanners: 2 });
    if (url.endsWith("/scans/distribution/")) {
      assert.equal(body.timezone, "UTC");
      return json({ results: [{ time_in_ms: range.fromTimestamp, scans: 9 }] });
    }
    if (url.endsWith("/scans/device-os/"))
      return json({ results: [{ device_os: "iPhone", scans: 9 }] });
    return json({ secret: "upstream body" }, 403);
  });
  const result = await api.detail("1", range);
  assert.equal(result.scans, 9);
  assert.equal(result.uniqueScanners, 2);
  assert.equal(result.code.destination, null);
  assert.deepEqual(result.daily, [{ date: "2026-09-02", scans: 9 }]);
  assert.deepEqual(result.devices, [{ label: "iPhone", count: 9 }]);
  assert.equal(result.locations, null);
  assert.match(result.errors.locations, /denied access/);
  assert.doesNotMatch(JSON.stringify(result), /upstream body/);
});

test("unknown IDs and static codes never request analytics", async () => {
  let calls = 0;
  const api = client(async () => {
    calls++;
    return json({ results: [qr(1, { qr_type: 1 })], next: null });
  });
  await assert.rejects(
    api.detail("1/../../2", range),
    (error) => error.status === 400,
  );
  assert.equal(calls, 0);
  await assert.rejects(api.detail("2", range), (error) => error.status === 404);
  assert.equal((await api.detail("1", range)).trackable, false);
  assert.equal(calls, 1);
});

test("missing configuration returns a safe actionable error without a network call", async () => {
  await assert.rejects(
    client(
      () => {
        throw new Error("Must not be called");
      },
      { apiKey: "" },
    ).overview(range),
    (error) => error.status === 503 && /UNIQODE_API/.test(error.message),
  );
});

test("GS1 QR codes use their own analytics product scope", async () => {
  const api = client(async (url, options) => {
    if (url.includes("qrcodes/"))
      return json({
        results: [
          qr(1),
          qr(2, { campaign: { gs1_code: { gtin: "example" } } }),
        ],
        next: null,
      });
    const body = JSON.parse(options.body);
    const gs1 = url.includes("/products/gs1/");
    assert.deepEqual(body.product_ids, [gs1 ? 2 : 1]);
    return json({ results: [{ qr_id: gs1 ? 2 : 1, scans: 5 }] });
  });
  assert.deepEqual(
    (await api.overview(range)).codes.map((code) => code.scans),
    [5, 5],
  );
});
