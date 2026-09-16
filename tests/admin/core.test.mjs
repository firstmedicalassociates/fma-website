import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  hasPermission,
  normalizePermissions,
  permissionForRequest,
  normalizeAdminEmail,
  validateAdminPassword,
  isSameOrigin,
  CONTENT_SECTIONS,
} from "../../src/app/lib/admin-permissions.mjs";
import {
  signAdminSession,
  verifyAdminSession,
  sessionMatchesUser,
} from "../../src/app/lib/admin-session.mjs";
import {
  parseAnalyticsQuery,
  percent,
} from "../../src/app/lib/ai-dashboard-query.mjs";
import {
  normalizeUsage,
  withUsageCapture,
  trackOpenAiCall,
} from "../../src/app/lib/ai-usage.mjs";
import {
  signInteractionTarget,
  verifyInteractionTarget,
  buildInteractionTargets,
} from "../../src/app/lib/ai-interactions.mjs";
import { loadReportedCosts } from "../../src/app/lib/openai-costs.mjs";
process.env.ADMIN_AUTH_SECRET = crypto.randomBytes(32).toString("hex");
const full = {
  id: "full-admin",
  role: "ADMIN",
  isActive: true,
  sessionVersion: 1,
  permissions: [],
};
const sub = { ...full, id: "sub-admin", role: "SUB_ADMIN", permissions: [] };
for (const section of CONTENT_SECTIONS) {
  test(`${section}: deny / view / edit / delete permissions and endpoint routing`, () => {
    for (const action of ["view", "edit", "delete"]) {
      assert.equal(hasPermission(sub, `${section}.${action}`), false);
      assert.equal(hasPermission(full, `${section}.${action}`), true);
      const selected = {
        ...sub,
        permissions: normalizePermissions([`${section}.${action}`]),
      };
      assert.equal(hasPermission(selected, `${section}.view`), true);
      for (const other of ["edit", "delete"].filter((item) => item !== action))
        assert.equal(hasPermission(selected, `${section}.${other}`), false);
    }
    assert.equal(
      permissionForRequest(`/api/admin/${section}`, "POST"),
      `${section}.edit`,
    );
    assert.equal(
      permissionForRequest(`/api/admin/${section}/id`, "DELETE"),
      `${section}.delete`,
    );
    assert.equal(
      permissionForRequest(`/api/admin/${section}/id`, "GET"),
      `${section}.view`,
    );
  });
}
test("sub-admin cannot grant admin access, diagnostics, or spending implicitly", () => {
  const user = {
    ...sub,
    permissions: normalizePermissions(["ai-search.edit"]),
  };
  assert.equal(hasPermission(user, "admin"), false);
  assert.equal(hasPermission(user, "spending.view"), false);
  assert.equal(
    permissionForRequest("/api/admin/ai-search/diagnostics", "POST"),
    "admin",
  );
  assert.equal(permissionForRequest("/api/debug/counts"), "admin");
  assert.equal(permissionForRequest("/api/admin/users", "POST"), "admin");
  assert.throws(() => normalizePermissions(["admin"]));
  assert.deepEqual(normalizePermissions(["spending.view"]), [
    "ai-search.view",
    "spending.view",
  ]);
});
test("uploads require an editor and provider images require provider access", () => {
  const permissions = permissionForRequest("/api/admin/uploads", "POST");
  assert.equal(hasPermission(sub, permissions), false);
  assert.equal(
    hasPermission({ ...sub, permissions: ["posts.view"] }, permissions),
    false,
  );
  assert.equal(
    hasPermission(
      { ...sub, permissions: ["providers.edit", "providers.view"] },
      permissions,
    ),
    true,
  );
  assert.equal(
    permissionForRequest("/api/admin/provider-images/id"),
    "providers.view",
  );
});
test("temporary and deactivated users cannot access protected actions", () => {
  assert.equal(
    hasPermission({ ...full, mustChangePassword: true }, "admin"),
    false,
  );
  assert.equal(
    hasPermission({ ...full, mustChangePassword: true }, "account"),
    true,
  );
  assert.equal(hasPermission({ ...full, isActive: false }, "account"), false);
});
test("password and case-insensitive email validation", () => {
  assert.equal(
    normalizeAdminEmail("  Person@Example.COM "),
    "person@example.com",
  );
  assert.throws(() => normalizeAdminEmail("broken"));
  assert.throws(() => validateAdminPassword("short"));
  assert.throws(() => validateAdminPassword("🔒".repeat(19)));
  assert.equal(validateAdminPassword("a".repeat(72)).length, 72);
});
test("sessions reject legacy, tampered, expired, revoked, and deactivated tokens", () => {
  const token = signAdminSession(full);
  const payload = verifyAdminSession(token);
  assert.ok(sessionMatchesUser(payload, full));
  assert.equal(
    sessionMatchesUser(payload, { ...full, sessionVersion: 2 }),
    false,
  );
  assert.equal(
    sessionMatchesUser(payload, { ...full, isActive: false }),
    false,
  );
  assert.equal(
    verifyAdminSession(
      signAdminSession({ ...full, sessionVersion: undefined }),
    ),
    null,
  );
  assert.equal(verifyAdminSession(`${token}x`), null);
  assert.equal(verifyAdminSession(`${token}.extra`), null);
  const json = JSON.stringify({ sub: full.id, version: 1, exp: 1 });
  const expired = `${Buffer.from(json).toString("base64url")}.${crypto.createHmac("sha256", process.env.ADMIN_AUTH_SECRET).update(json).digest("base64url")}`;
  assert.equal(verifyAdminSession(expired), null);
});
test("same-origin mutation checks", () => {
  assert.equal(
    isSameOrigin(
      new Request("https://example.com/api", {
        headers: { origin: "https://example.com" },
      }),
    ),
    true,
  );
  assert.equal(
    isSameOrigin(
      new Request("https://example.com/api", {
        headers: { origin: "https://attacker.example" },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOrigin(
      new Request("https://example.com/api", {
        headers: { "sec-fetch-site": "cross-site" },
      }),
    ),
    false,
  );
});
test("UTC date bounds, leap days, year limit, pagination and filters", () => {
  const query = parseAnalyticsQuery(
    new URLSearchParams("range=7&page=2"),
    new Date("2026-09-14T23:59:59Z"),
  );
  assert.equal(query.from, "2026-09-08T00:00:00.000Z");
  assert.equal(query.to, "2026-09-15T00:00:00.000Z");
  assert.equal(query.page, 2);
  assert.throws(() =>
    parseAnalyticsQuery(new URLSearchParams("from=2026-02-29")),
  );
  assert.throws(() =>
    parseAnalyticsQuery(new URLSearchParams("from=2020-01-01&to=2026-01-01")),
  );
  assert.throws(() =>
    parseAnalyticsQuery(new URLSearchParams("status=x%27%3BDROP")),
  );
  assert.equal(percent(0, 0), null);
  assert.equal(percent(1, 4), 25);
});
test("Responses, chat completions and embeddings normalize token usage and cached pricing", () => {
  const response = normalizeUsage(
    {
      model: "gpt-5.5",
      usage: {
        input_tokens: 1000,
        input_tokens_details: { cached_tokens: 200 },
        output_tokens: 100,
      },
    },
    "response",
    "gpt-5.5",
  );
  assert.equal(response.estimatedCostUsd, 0.0071);
  const chat = normalizeUsage(
    {
      usage: {
        prompt_tokens: 1000,
        prompt_tokens_details: { cached_tokens: 200 },
        completion_tokens: 100,
      },
    },
    "chat_completion",
    "gpt-5.5",
  );
  assert.equal(chat.estimatedCostUsd, response.estimatedCostUsd);
  assert.equal(
    normalizeUsage(
      { usage: { total_tokens: 1000 } },
      "embedding",
      "text-embedding-3-small",
    ).estimatedCostUsd,
    0.00002,
  );
  assert.equal(
    normalizeUsage({}, "response", "gpt-5.5").estimatedCostUsd,
    null,
  );
  assert.equal(
    normalizeUsage(
      { usage: { input_tokens: 100, output_tokens: 5 } },
      "response",
      "unknown-model",
    ).estimatedCostUsd,
    null,
  );
});
test("concurrent usage contexts stay separate; failures preserve partial usage", async () => {
  const run = (purpose) =>
    withUsageCapture(purpose, async ({ records }) => {
      await trackOpenAiCall(
        { operation: "embedding", model: "text-embedding-3-small" },
        async () => ({ usage: { total_tokens: 100 } }),
      );
      await assert.rejects(
        trackOpenAiCall(
          { operation: "response", model: "gpt-5.5" },
          async () => {
            throw new Error("upstream");
          },
        ),
      );
      return records;
    });
  const [search, evaluation] = await Promise.all([
    run("search"),
    run("evaluation"),
  ]);
  assert.equal(search.length, 2);
  assert.ok(search.every((r) => r.purpose === "search"));
  assert.ok(evaluation.every((r) => r.purpose === "evaluation"));
  assert.equal(search[1].status, "failed_usage_unknown");
  await withUsageCapture("search", ({ records }) =>
    assert.equal(records.length, 0),
  );
});
test("signed clicks reject forgery and expiry and strip query strings from stored references", () => {
  const token = signInteractionTarget(
    "event-id",
    "provider",
    "/providers/example/",
  );
  assert.equal(verifyInteractionTarget(token).targetRef, "/providers/example/");
  assert.equal(verifyInteractionTarget(token + "x"), null);
  assert.equal(verifyInteractionTarget(token, Date.now() + 86400001), null);
  const targets = buildInteractionTargets("event-id", {
    appointmentOptions: [
      {
        providerUrl: "/providers/a/",
        bookingUrl: "https://booking.example/a?token=secret",
      },
    ],
  });
  assert.equal(targets.length, 2);
  assert.equal(targets[1].ref, "https://booking.example/a");
  assert.equal(buildInteractionTargets("event-id", {}, []).length, 0);
});
test("project costs paginate, cache, retain stale data, and distinguish missing configuration", async () => {
  let snapshot = null,
    calls = 0;
  const db = {
    openAiCostSnapshot: {
      findUnique: async () => snapshot,
      upsert: async ({ create }) => {
        snapshot = create;
      },
    },
  };
  const range = {
    from: "2026-09-01T00:00:00.000Z",
    to: "2026-09-03T00:00:00.000Z",
  };
  const fetcher = async (url) => {
    calls++;
    assert.match(url, /project_ids/);
    return new Response(
      JSON.stringify({
        data: [
          {
            start_time: 1788220800,
            results: [{ amount: { currency: "usd", value: 1.5 } }],
          },
        ],
        has_more: calls === 1,
        next_page: calls === 1 ? "next" : null,
      }),
      { status: 200 },
    );
  };
  const options = {
    db,
    apiKey: "test-only",
    projectId: "project-test",
    fetcher,
    now: new Date("2026-09-14T00:00:00Z"),
  };
  const result = await loadReportedCosts(range, options);
  assert.equal(result.total, 3);
  assert.equal(calls, 2);
  await loadReportedCosts(range, options);
  assert.equal(calls, 2);
  const stale = await loadReportedCosts(range, {
    ...options,
    now: new Date("2026-09-14T02:00:00Z"),
    fetcher: async () => new Response("", { status: 403 }),
  });
  assert.equal(stale.total, 3);
  assert.equal(stale.stale, true);
  assert.match(stale.error, /key/);
  assert.equal(
    (await loadReportedCosts(range, { ...options, apiKey: "" })).configured,
    false,
  );
});
