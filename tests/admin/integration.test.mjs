import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/app/lib/prisma.js";
import {
  createAdminAccount,
  updateAdminAccount,
} from "../../src/app/lib/admin-accounts.js";
import { signAdminSession } from "../../src/app/lib/admin-session.mjs";
import { signInteractionTarget } from "../../src/app/lib/ai-interactions.mjs";
const schema = process.env.ADMIN_TEST_SCHEMA || "";
if (!/^fma_admin_test_\d+$/.test(schema))
  throw new Error(
    "Integration tests require an isolated .env.admin-test schema.",
  );
const base = process.env.ADMIN_TEST_URL || "http://localhost:3157";
const password = process.env.ADMIN_TEST_PASSWORD;
let owner, sub, viewer, editor;
let sequence = 1;
async function call(
  path,
  {
    user = owner,
    method = "GET",
    body,
    cookie,
    origin = base,
    headers = {},
  } = {},
) {
  const token =
    cookie ?? (user ? `admin_session=${signAdminSession(user)}` : "");
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      origin,
      cookie: token,
      "x-forwarded-for": `192.0.2.${sequence++ % 250}`,
      ...headers,
    },
    ...(body
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { response, data };
}
before(async () => {
  const [current] =
    await prisma.$queryRaw`SELECT current_schema()::text AS schema`;
  assert.equal(
    current.schema,
    schema,
    "Refusing to write outside the isolated schema",
  );
  await prisma.adminUser.deleteMany({
    where: { id: { not: "integration-owner" } },
  });
  owner = await prisma.adminUser.update({
    where: { id: "integration-owner" },
    data: {
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      sessionVersion: 1,
      password: await bcrypt.hash(password, 12),
    },
  });
  await prisma.aiSearchEvent.deleteMany();
  await prisma.aiApiUsage.deleteMany();
  await prisma.adminCredentialAttempt.deleteMany();
  await prisma.service.deleteMany({ where: { slug: "permission-test" } });
  const create = (id, permissions) =>
    prisma.adminUser.create({
      data: {
        id,
        email: `${id}@example.test`,
        role: "SUB_ADMIN",
        permissions,
        password: owner.password,
      },
    });
  sub = await create("integration-sub", []);
  viewer = await create("integration-viewer", [
    "posts.view",
    "providers.view",
    "services.view",
    "locations.view",
    "ai-search.view",
  ]);
  editor = await create("integration-editor", [
    "posts.view",
    "posts.edit",
    "providers.view",
    "providers.edit",
    "services.view",
    "services.edit",
    "locations.view",
    "locations.edit",
    "ai-search.view",
    "ai-search.edit",
  ]);
  await prisma.provider.upsert({
    where: { id: "integration-provider" },
    create: {
      id: "integration-provider",
      slug: "integration-provider",
      name: "Example Provider",
      title: "MD",
      bio: "Primary care",
      imageUrl: "/images/provider-placeholder.svg",
      locations: ["/location/test"],
      languages: ["English"],
    },
    update: {},
  });
  await prisma.blogPost.upsert({
    where: { id: "integration-post" },
    create: {
      id: "integration-post",
      slug: "integration-post",
      title: "Example draft",
      contentHtml: "<p>Test content</p>",
    },
    update: {},
  });
});
after(async () => {
  await prisma.$disconnect();
});
test("legacy admin is preserved and user responses exclude password hashes", async () => {
  assert.equal(owner.email, "owner@example.test");
  const { response, data } = await call("/api/admin/users");
  assert.equal(response.status, 200);
  assert.ok(data.users.length >= 4);
  assert.ok(data.users.every((user) => !("password" in user)));
  assert.equal(
    (await call("/api/admin/users", { user: null })).response.status,
    401,
  );
});
test("temporary account creation, duplicate email and mandatory first-login password change", async () => {
  const created = await call("/api/admin/users", {
    method: "POST",
    body: {
      email: " New@Example.test ",
      password,
      role: "SUB_ADMIN",
      permissions: ["providers.view"],
    },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.user.mustChangePassword, true);
  assert.equal(created.data.user.email, "new@example.test");
  const duplicate = await call("/api/admin/users", {
    method: "POST",
    body: { email: "NEW@example.test", password, role: "ADMIN" },
  });
  assert.equal(duplicate.response.status, 409);
  const login = await call("/api/admin/login", {
    method: "POST",
    user: null,
    body: { email: "NEW@example.test", password },
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.redirect, "/admin/account");
  const cookie = login.response.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await call("/api/admin/providers", { method: "POST", cookie, body: {} }))
      .response.status,
    403,
  );
  const changed = await call("/api/admin/account/password", {
    method: "POST",
    cookie,
    body: {
      currentPassword: password,
      newPassword: password + "new",
      confirmPassword: password + "new",
    },
  });
  assert.equal(changed.response.status, 200, JSON.stringify(changed.data));
  assert.ok(changed.response.headers.get("set-cookie"));
  assert.equal(
    (await call("/api/admin/provider-images/integration-provider", { cookie }))
      .response.status,
    401,
  );
  const wrong = await call("/api/admin/account/password", {
    method: "POST",
    user: viewer,
    body: {
      currentPassword: "wrong",
      newPassword: password + "new",
      confirmPassword: password + "new",
    },
  });
  assert.equal(wrong.response.status, 400);
});
test("direct API calls enforce all content permissions and separate deletion", async () => {
  for (const section of ["posts", "locations", "services", "providers"]) {
    for (const user of [sub, viewer]) {
      assert.equal(
        (
          await call(`/api/admin/${section}`, {
            user,
            method: "POST",
            body: {},
          })
        ).response.status,
        403,
        section,
      );
      assert.equal(
        (
          await call(`/api/admin/${section}/missing-record`, {
            user,
            method: "DELETE",
          })
        ).response.status,
        403,
        section,
      );
    }
    assert.equal(
      (
        await call(`/api/admin/${section}`, {
          user: editor,
          method: "POST",
          body: {},
        })
      ).response.status,
      400,
      section,
    );
    assert.equal(
      (
        await call(`/api/admin/${section}/missing-record`, {
          user: editor,
          method: "DELETE",
        })
      ).response.status,
      403,
      section,
    );
  }
  const created = await call("/api/admin/services", {
    user: editor,
    method: "POST",
    body: {
      title: "Permission test",
      slug: "permission-test",
      description: "Test service",
    },
  });
  assert.equal(created.response.status, 200);
  const remover = await prisma.adminUser.create({
    data: {
      email: "remover@example.test",
      role: "SUB_ADMIN",
      password: owner.password,
      permissions: ["services.view", "services.delete"],
    },
  });
  assert.equal(
    (
      await call(`/api/admin/services/${created.data.id}`, {
        user: remover,
        method: "DELETE",
      })
    ).response.status,
    200,
  );
});
test("direct page routes, creation routes, upload kinds and diagnostic routes enforce access", async () => {
  for (const section of [
    "posts",
    "locations",
    "services",
    "providers",
    "ai-search",
    "users",
  ]) {
    const denied = await call(`/admin/${section}`, { user: sub });
    assert.ok(
      denied.response.url.includes("access-denied") ||
        String(denied.data).includes("/admin/access-denied"),
      section,
    );
  }
  for (const section of ["posts", "locations", "services", "providers"]) {
    const denied = await call(`/admin/${section}/new`, { user: viewer });
    assert.ok(
      denied.response.url.includes("access-denied") ||
        String(denied.data).includes("/admin/access-denied"),
      section,
    );
  }
  for (const path of [
    "/api/admin/index-embeddings",
    "/api/admin/ai-search/diagnostics",
  ])
    assert.equal(
      (await call(path, { user: editor, method: "POST" })).response.status,
      403,
    );
  assert.equal(
    (await call("/api/debug/counts", { user: viewer })).response.status,
    403,
  );
  assert.equal(
    (await call("/api/admin/ai-search/spending", { user: viewer })).response
      .status,
    403,
  );
  assert.equal(
    (
      await call("/api/admin/uploads", {
        user: viewer,
        method: "POST",
        body: new FormData(),
      })
    ).response.status,
    403,
  );
  const postOnly = { ...viewer, permissions: ["posts.view", "posts.edit"] };
  await prisma.adminUser.update({
    where: { id: viewer.id },
    data: { permissions: postOnly.permissions },
  });
  const form = new FormData();
  form.set("kind", "provider");
  form.set("file", new Blob(["fake"], { type: "image/png" }), "test.png");
  assert.equal(
    (
      await call("/api/admin/uploads", {
        user: postOnly,
        method: "POST",
        body: form,
      })
    ).response.status,
    403,
  );
  await prisma.adminUser.update({
    where: { id: viewer.id },
    data: { permissions: viewer.permissions },
  });
});
test("account updates revoke sessions; deactivated admins and cross-origin writes are denied", async () => {
  assert.equal(
    (
      await call(`/api/admin/users/${owner.id}`, {
        method: "PATCH",
        user: sub,
        body: { role: "ADMIN", isActive: true },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await call("/api/admin/users", {
        method: "POST",
        origin: "https://attacker.test",
        body: {},
      })
    ).response.status,
    403,
  );
  const disabled = await call(`/api/admin/users/${sub.id}`, {
    method: "PATCH",
    body: { role: "SUB_ADMIN", permissions: [], isActive: false },
  });
  assert.equal(disabled.response.status, 200, JSON.stringify(disabled.data));
  assert.equal(
    (await call("/api/admin/users", { user: sub })).response.status,
    401,
  );
  assert.equal(
    (
      await call("/api/admin/login", {
        method: "POST",
        user: null,
        body: { email: sub.email, password },
      })
    ).response.status,
    401,
  );
  const self = await call(`/api/admin/users/${owner.id}`, {
    method: "PATCH",
    body: { role: "ADMIN", isActive: false },
  });
  assert.equal(self.response.status, 400);
  const reset = await call(`/api/admin/users/${viewer.id}/reset-password`, {
    method: "POST",
    body: { password: password + "reset" },
  });
  assert.equal(reset.response.status, 200);
  assert.equal(reset.data.user.mustChangePassword, true);
  assert.equal(
    (await call("/api/admin/ai-search/analytics", { user: viewer })).response
      .status,
    401,
  );
  viewer = await prisma.adminUser.update({
    where: { id: viewer.id },
    data: { mustChangePassword: false, password: owner.password },
  });
});
test("concurrent full-admin demotions cannot remove the final administrator", async () => {
  const second = await createAdminAccount(prisma, owner, {
    email: "second@example.test",
    password,
    role: "ADMIN",
  });
  const activeSecond = await prisma.adminUser.update({
    where: { id: second.id },
    data: { mustChangePassword: false },
  });
  const results = await Promise.allSettled([
    updateAdminAccount(prisma, owner, owner.id, {
      role: "SUB_ADMIN",
      permissions: [],
      isActive: true,
    }),
    updateAdminAccount(prisma, activeSecond, activeSecond.id, {
      role: "SUB_ADMIN",
      permissions: [],
      isActive: true,
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    await prisma.adminUser.count({ where: { role: "ADMIN", isActive: true } }),
    1,
  );
  owner = await prisma.adminUser.update({
    where: { id: owner.id },
    data: { role: "ADMIN", permissions: [] },
  });
});
test("analytics totals, pagination, feedback, permission-safe details and estimated costs", async () => {
  const now = new Date();
  await prisma.aiSearchEvent.createMany({
    data: Array.from({ length: 60 }, (_, index) => ({
      id: `integration-event-${index}`,
      status: index < 40 ? "answered" : "failed",
      surface: "search_modal",
      intent: "integration",
      latencyMs: (index + 1) * 100,
      grounded: index < 40,
      telemetryVersion: index < 50 ? 1 : null,
      bookingTargetCount: index < 20 ? 1 : 0,
      feedbackRating: index < 5 ? "not_helpful" : null,
      feedbackCreatedAt: index < 5 ? now : null,
      sourceRefs: ["provider:example"],
      createdAt: now,
    })),
  });
  await prisma.aiApiUsage.create({
    data: {
      eventId: "integration-event-0",
      purpose: "search",
      operation: "response",
      model: "gpt-5.5",
      status: "recorded",
      inputTokens: 100,
      cachedInputTokens: 0,
      outputTokens: 10,
      estimatedCostUsd: 0.0008,
    },
  });
  const overview = await call(
    "/api/admin/ai-search/analytics?intent=integration",
  );
  assert.equal(overview.response.status, 200, JSON.stringify(overview.data));
  assert.equal(overview.data.summary.total, 60);
  assert.equal(overview.data.summary.answered, 40);
  assert.equal(overview.data.summary.avgLatencyMs, 3050);
  assert.equal(overview.data.summary.tracked, 50);
  const page = await call(
    "/api/admin/ai-search/analytics?intent=integration&section=activity&page=2",
  );
  assert.equal(page.data.rows.length, 25);
  assert.equal(page.data.total, 60);
  const feedback = await call(
    "/api/admin/ai-search/analytics?intent=integration&section=feedback",
  );
  assert.equal(feedback.data.rows.length, 5);
  const detail = await call(
    "/api/admin/ai-search/analytics?eventId=integration-event-0",
    { user: viewer },
  );
  assert.equal(detail.response.status, 200);
  assert.equal("apiUsage" in detail.data.event, false);
  const budget = await call("/api/admin/ai-search/spending");
  assert.equal(budget.response.status, 200, JSON.stringify(budget.data));
  assert.equal(Number(budget.data.summary.knownCost), 0.0008);
  const reported = await call("/api/admin/ai-search/spending?reported=1");
  assert.equal(reported.data.configured, false);
  assert.equal(
    (await call("/api/admin/ai-search/analytics?from=2020-01-01")).response
      .status,
    400,
  );
  assert.equal(
    (
      await call("/api/admin/ai-search/feedback/integration-event-0", {
        user: viewer,
        method: "PATCH",
        body: { reviewStatus: "resolved" },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await call("/api/admin/ai-search/feedback/integration-event-0", {
        user: editor,
        method: "PATCH",
        body: { reviewStatus: "resolved" },
      })
    ).response.status,
    200,
  );
});
test("click endpoint deduplicates events and rejects forged targets", async () => {
  const token = signInteractionTarget(
    "integration-event-0",
    "booking",
    "https://booking.example/test",
  );
  const id = crypto.randomUUID();
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await call("/api/ai-search/interactions", {
          user: null,
          method: "POST",
          body: { id, token },
        })
      ).response.status,
      202,
    );
  assert.equal(await prisma.aiSearchInteraction.count({ where: { id } }), 1);
  assert.equal(
    (
      await call("/api/ai-search/interactions", {
        user: null,
        method: "POST",
        body: { id: crypto.randomUUID(), token: token + "bad" },
      })
    ).response.status,
    400,
  );
});
test("public search retains deterministic answers, screens PHI and logs both API surfaces", async () => {
  for (const path of ["/api/search", "/api/ai-search"]) {
    const valid = await call(path, {
      user: null,
      method: "POST",
      body: { query: "what is the phone number for FMA", surface: "home_hero" },
    });
    assert.equal(valid.response.status, 200, JSON.stringify(valid.data));
    const ai = valid.data.ai || valid.data;
    assert.ok(ai.answer);
    assert.ok(ai.eventId);
    const event = await prisma.aiSearchEvent.findUnique({
      where: { id: ai.eventId },
      include: { apiUsage: true },
    });
    assert.equal(event.surface, "home_hero");
    assert.equal(event.apiUsage.length, 0);
    const blocked = await call(path, {
      user: null,
      method: "POST",
      body: { query: "My date of birth is 01/01/1980" },
    });
    assert.equal(blocked.response.status, 400);
    const blockedId = (blocked.data.ai || blocked.data).eventId;
    const blockedEvent = await prisma.aiSearchEvent.findUnique({
      where: { id: blockedId },
    });
    assert.equal(blockedEvent.status, "blocked");
    assert.equal(blockedEvent.queryHash, null);
    assert.equal(blockedEvent.queryLength, 0);
  }
});
test("warm overview handles 100,000 events without external-service latency", async () => {
  await prisma.$executeRaw`INSERT INTO "AiSearchEvent" (id, status, intent, "createdAt", "updatedAt", "latencyMs", "telemetryVersion") SELECT 'scale-' || n, 'answered', 'scale_probe', NOW() - (n % 29) * INTERVAL '1 day', NOW(), 1000, 1 FROM generate_series(1, 100000) n`;
  const cold = await call("/api/admin/ai-search/analytics?intent=scale_probe");
  assert.equal(cold.response.status, 200, JSON.stringify(cold.data));
  assert.equal(cold.data.summary.total, 100000);
  const durations = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const result = await call(
      "/api/admin/ai-search/analytics?intent=scale_probe",
    );
    assert.equal(result.response.status, 200);
    durations.push(performance.now() - start);
  }
  console.log(
    `Warm overview with 100,000 events: maximum ${Math.round(Math.max(...durations))} ms across 5 requests.`,
  );
  assert.ok(Math.max(...durations) < 2000);
});
test("removed Athena Test routes return 404", async () => {
  assert.equal((await call("/admin/athena-test")).response.status, 404);
  assert.equal(
    (await call("/api/admin/athena-test", { method: "POST", body: {} }))
      .response.status,
    404,
  );
});
test("credential attempts and public rate-limit failures are bounded and recorded", async () => {
  let last;
  for (let i = 0; i < 11; i++)
    last = await call("/api/admin/login", {
      user: null,
      method: "POST",
      body: { email: "absent@example.test", password: "test-wrong-password" },
      headers: { "x-forwarded-for": "192.0.2.251" },
    });
  assert.equal(last.response.status, 429);
  assert.ok(last.response.headers.get("retry-after"));
  for (let i = 0; i < 13; i++)
    last = await call("/api/ai-search", {
      user: null,
      method: "POST",
      body: { query: "a" },
      headers: { "x-forwarded-for": "192.0.2.252" },
    });
  assert.equal(last.response.status, 429);
  assert.ok(last.data.eventId);
  const event = await prisma.aiSearchEvent.findUnique({
    where: { id: last.data.eventId },
  });
  assert.equal(event.status, "blocked");
  assert.equal(event.code, "rate_limited");
});
