import test from "node:test";
import assert from "node:assert/strict";
import { AdpError, createAdpClient, getAdpApplyUrl, isPublicJob, readAdpConfig } from "../../src/app/lib/adp.mjs";

const config = { clientId: "test-client", clientSecret: "test-secret" };
const token = { access_token: "test-token", expires_in: 3600 };
const job = (id, overrides = {}) => ({
  itemID: String(id),
  requisitionStatusCode: { codeValue: "ON" },
  externalIndicator: true,
  visibleToJobSeekerIndicator: true,
  ...overrides,
});
const fullPage = Array.from({ length: 20 }, (_, i) => job(i));

test("an API key alone fails before making a request and is never echoed", () => {
  assert.throws(() => readAdpConfig({ ADP_API_KEY: "private-value" }), (error) => {
    assert.match(error.message, /ADP_CLIENT_ID/);
    assert.match(error.message, /ADP_CERT_PATH/);
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
});

test("only explicitly public, open, accepting requisitions qualify", () => {
  assert.equal(isPublicJob(job(1)), true);
  for (const overrides of [
    { externalIndicator: false }, { externalIndicator: undefined },
    { externalIndicator: "true" }, { visibleToJobSeekerIndicator: false },
    { requisitionStatusCode: { codeValue: "CD" } },
  ]) assert.equal(isPublicJob(job(1, overrides)), false);
  assert.equal(isPublicJob(null), false);
});

test("uses the external default channel's application URL and excludes internal links", () => {
  const external = "https://workforcenow.adp.com/jobs?jobId=1&source=CC2";
  const requisition = job(1, {
    postingInstructions: [
      { postingChannel: { externalIndicator: false, nameCode: { codeValue: "CC1" } } },
      { postingChannel: { externalIndicator: true, defaultIndicator: true, nameCode: { codeValue: "CC2" }, internetAddress: { uri: external } } },
    ],
    links: [{ href: "https://workforcenow.adp.com/jobs?source=CC1" }],
  });
  assert.equal(getAdpApplyUrl(requisition), external);
  assert.equal(getAdpApplyUrl({ ...requisition, externalIndicator: false }), null);
  assert.equal(getAdpApplyUrl(job(1, { postingInstructions: requisition.postingInstructions.slice(0, 1), links: requisition.links })), null);
});

test("falls back to a matching external source link and rejects unsafe or unrelated URLs", () => {
  const requisition = job(1, {
    postingInstructions: [{ postingChannel: { externalIndicator: true, nameCode: { codeValue: "CC3" } } }],
  });
  for (const href of ["javascript:alert(1)", "http://workforcenow.adp.com/jobs?source=CC3", "https://adp.com.example.org/jobs?source=CC3", "https://workforcenow.adp.com/jobs?source=CC1"]) {
    assert.equal(getAdpApplyUrl({ ...requisition, links: [{ href }] }), null);
  }
  const href = "https://workforcenow.adp.com/jobs?source=CC3";
  assert.equal(getAdpApplyUrl({ ...requisition, links: [{ href }] }), href);
});

test("paginates in batches of 20 with OAuth, shares TLS agent, reuses token, filters locally", async (t) => {
  const calls = [];
  const client = createAdpClient(config, { request: async (url, options) => {
    calls.push({ url: new URL(url), options });
    if (options.method === "POST") return token;
    const skip = new URL(url).searchParams.get("$skip");
    return { jobRequisitions: skip === "0"
      ? [...fullPage.slice(0, 19), job(19, { externalIndicator: false })]
      : [job(20), job(21, { visibleToJobSeekerIndicator: false })] };
  } });
  t.after(() => client.close());
  assert.equal((await client.getPublicJobRequisitions()).length, 20);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url.href, "https://accounts.adp.com/auth/oauth/v2/token");
  assert.equal(calls[0].options.body, "grant_type=client_credentials");
  assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from("test-client:test-secret").toString("base64")}`);
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-token");
  assert.equal(calls[0].options.agent, calls[1].options.agent);
  assert.equal(calls[1].options.agent.options.rejectUnauthorized, true);
  assert.equal(calls[1].url.searchParams.get("$top"), "20");
  assert.equal(calls[2].url.searchParams.get("$skip"), "20");
  assert.equal(calls[1].url.searchParams.get("$filter"), "requisitionStatusCode/codeValue eq ON");
});

test("retrieves all five public jobs when ADP's combined visibility filters under-return", async (t) => {
  const published = Array.from({ length: 5 }, (_, i) => job(`public-${i}`));
  const client = createAdpClient(config, { request: async (url, options) => {
    if (options.method === "POST") return token;
    const filter = new URL(url).searchParams.get("$filter");
    // Reproduce the live ADP discrepancy: all five records have both flags true,
    // but adding those flags to the upstream query returns only one of them.
    if (/externalIndicator|visibleToJobSeekerIndicator/.test(filter)) {
      return { jobRequisitions: published.slice(0, 1), meta: { totalNumber: 1 } };
    }
    return { jobRequisitions: [
      ...published,
      job("internal", { externalIndicator: false }),
      job("unpublished", { visibleToJobSeekerIndicator: false }),
      job("closed", { requisitionStatusCode: { codeValue: "CD" } }),
    ], meta: { totalNumber: 8 } };
  } });
  t.after(() => client.close());
  assert.deepEqual((await client.getPublicJobRequisitions()).map((entry) => entry.itemID), published.map((entry) => entry.itemID));
});

test("uses ADP's total to stop at a full last page instead of requesting an out-of-range page", async (t) => {
  let pages = 0;
  const client = createAdpClient(config, { request: async (_url, options) => {
    if (options.method === "POST") return token;
    if (++pages > 1) throw new AdpError("Not found", 404);
    return { jobRequisitions: fullPage, meta: { totalNumber: 20 } };
  } });
  t.after(() => client.close());
  assert.equal((await client.getPublicJobRequisitions()).length, 20);
  assert.equal(pages, 1);
});

test("refreshes an expired token once on HTTP 401", async (t) => {
  let tokens = 0, pages = 0;
  const client = createAdpClient(config, { request: async (_url, options) => {
    if (options.method === "POST") return { ...token, access_token: `token-${++tokens}` };
    if (++pages === 1) throw new AdpError("Unauthorized", 401);
    assert.equal(options.headers.Authorization, "Bearer token-2");
    return { jobRequisitions: [job(1)] };
  } });
  t.after(() => client.close());
  assert.equal((await client.getPublicJobRequisitions()).length, 1);
  assert.equal(tokens, 2);
});

test("persistent authentication/permission failures are bounded", async (t) => {
  for (const status of [401, 403]) {
    let calls = 0;
    const client = createAdpClient(config, { request: async (_url, options) => {
      calls++;
      if (options.method === "POST") return token;
      throw new AdpError("Denied", status);
    } });
    t.after(() => client.close());
    await assert.rejects(client.getPublicJobRequisitions(), { status });
    assert.equal(calls, status === 401 ? 4 : 2);
  }
});

test("renews the token before its expiry", async (t) => {
  let time = 0, tokens = 0;
  const client = createAdpClient(config, { now: () => time, request: async (_url, options) => {
    if (options.method === "POST") { tokens++; return token; }
    return null;
  } });
  t.after(() => client.close());
  assert.deepEqual(await client.getPublicJobRequisitions(), []);
  time = 1000;
  await client.getPublicJobRequisitions();
  assert.equal(tokens, 1);
  time = 3550000;
  await client.getPublicJobRequisitions();
  assert.equal(tokens, 2);
});

test("repeated full pages fail instead of silently returning a partial list", async (t) => {
  const client = createAdpClient(config, { request: async (_url, options) =>
    options.method === "POST" ? token : { jobRequisitions: fullPage } });
  t.after(() => client.close());
  await assert.rejects(client.getPublicJobRequisitions(), /repeated a page/);
});

test("invalid upstream payloads fail instead of reporting zero openings", async (t) => {
  for (const response of [{}, { jobRequisitions: [null] }]) {
    const client = createAdpClient(config, { request: async (_url, options) =>
      options.method === "POST" ? token : response });
    t.after(() => client.close());
    await assert.rejects(client.getPublicJobRequisitions(), AdpError);
  }
});
