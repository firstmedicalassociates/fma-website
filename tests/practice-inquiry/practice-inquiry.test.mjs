import test from "node:test";
import assert from "node:assert/strict";
import { buildPracticeEmails, validatePracticeInquiry } from "../../src/app/lib/practice-inquiry.mjs";
import { createPracticeInquiryHandler } from "../../src/app/lib/practice-inquiry-handler.mjs";
import { hasPotentialPhi } from "../../src/app/lib/no-phi-guard.js";

export const sampleInquiry = { firstName: "Alex", lastName: "Morgan", email: "alex@example.com", phone: "301-555-0123", practiceName: "Example Primary Care", role: "Practice owner / physician owner", city: "Rockville", state: "Maryland", specialty: "Family medicine", providerCount: "2–5", goal: "Explore selling my practice", timeline: "6–12 months", preferredContact: "Email", message: "I would like to continue practicing while planning a transition.", consent: true, attribution: { utm_source: "facebook", utm_campaign: "practice-transition" } };
const env = { NODE_ENV: "test", SENDLAYER_API_KEY: "test-key", SENDLAYER_FROM_EMAIL: "from@example.com", SENDLAYER_TO_EMAILS: "team@example.com,archive@example.com" };
const request = (payload = sampleInquiry) => new Request("http://localhost/api/practice-inquiry", { method: "POST", body: JSON.stringify(payload) });
function setup(overrides = {}) {
  const sent = [];
  return { sent, handler: createPracticeInquiryHandler({ checkLimit: async () => null, hasPotentialPhi, env, send: async (key, message) => { assert.equal(key, "test-key"); sent.push(message); }, logError: () => {}, ...overrides }) };
}

test("delivers the full inquiry to the existing recipients, then welcomes the visitor", async () => {
  const { sent, handler } = setup();
  assert.deepEqual(await (await handler(request())).json(), { ok: true, confirmationSent: true });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0].To.map(x => x.email), ["team@example.com", "archive@example.com"]);
  assert.equal(sent[0].ReplyTo[0].email, sampleInquiry.email);
  assert.match(sent[0].PlainContent, /utm_source: facebook/);
  assert.match(sent[0].HTMLContent, /Example Primary Care/);
  assert.equal(sent[1].To[0].email, sampleInquiry.email);
  assert.equal(sent[1].ReplyTo[0].email, "team@example.com");
  assert.match(sent[1].HTMLContent, /Dear Alex/);
  assert.ok(!sent[1].HTMLContent.includes(sampleInquiry.practiceName));
  assert.ok(!sent[1].PlainContent.includes(sampleInquiry.message));
});
test("supports a dedicated practice inbox without notifying the default recipients", async () => {
  const { sent, handler } = setup({ env: { ...env, SENDLAYER_PRACTICE_TO_EMAILS: "acquisitions@example.com" } });
  await handler(request());
  assert.deepEqual(sent[0].To.map(x => x.email), ["acquisitions@example.com"]);
  assert.equal(sent[1].ReplyTo[0].email, "acquisitions@example.com");
});
test("does not send a welcome or claim success when team delivery fails", async () => {
  let attempts = 0;
  const { handler } = setup({ send: async () => { attempts++; throw new Error("Rejected"); } });
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
  assert.equal(attempts, 1);
});
test("reports accepted inquiry with failed welcome so visitors do not resubmit", async () => {
  let attempts = 0;
  const { handler } = setup({ send: async () => { if (++attempts === 2) throw new Error("Rejected"); } });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, confirmationSent: false });
});
test("rejects invalid, missing, oversized, unconsented, and honeypot submissions without delivery", async () => {
  const { handler, sent } = setup();
  for (const payload of [null, [], { ...sampleInquiry, email: "bad" }, { ...sampleInquiry, firstName: " " }, { ...sampleInquiry, phone: "123" }, { ...sampleInquiry, role: "Forged" }, { ...sampleInquiry, consent: "true" }, { ...sampleInquiry, message: "a".repeat(1001) }, { ...sampleInquiry, firstName: {} }, { ...sampleInquiry, website: "spam" }]) {
    assert.equal((await handler(request(payload))).status, 400);
  }
  assert.equal(sent.length, 0);
});
test("rejects malformed JSON and oversized request bodies", async () => {
  const { handler, sent } = setup();
  assert.equal((await handler(new Request("http://localhost/api/practice-inquiry", { method: "POST", body: "{" }))).status, 400);
  assert.equal((await handler(request({ extra: "x".repeat(16001) }))).status, 413);
  assert.equal(sent.length, 0);
});
test("retains the existing PHI guard for free text", async () => {
  const { handler, sent } = setup();
  assert.equal((await handler(request({ ...sampleInquiry, message: "My patient has diabetes and takes insulin." }))).status, 400);
  assert.equal(sent.length, 0);
});
test("fails closed when production mail configuration is not reviewed or is missing", async () => {
  for (const settings of [{ ...env, NODE_ENV: "production" }, { ...env, SENDLAYER_API_KEY: "" }, { ...env, SENDLAYER_PRACTICE_TO_EMAILS: "invalid" }]) {
    const { handler, sent } = setup({ env: settings });
    assert.equal((await handler(request())).status, 503);
    assert.equal(sent.length, 0);
  }
});
test("preserves rate limit status and retry headers without delivery", async () => {
  const { handler, sent } = setup({ checkLimit: async () => Response.json({ ok: false }, { status: 429, headers: { "Retry-After": "60" } }) });
  const response = await handler(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(sent.length, 0);
});
test("escapes user content in both HTML emails and bounds campaign attribution", () => {
  const { data } = validatePracticeInquiry({ ...sampleInquiry, firstName: '<img src=x onerror="bad">', practiceName: "A&B <Clinic>", attribution: { utm_source: "x".repeat(500), unwanted: "discard" } });
  const { team, welcome } = buildPracticeEmails(data);
  assert.match(team.html, /A&amp;B &lt;Clinic&gt;/);
  assert.match(welcome.html, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.ok(!welcome.html.includes('<img src=x'));
  assert.equal(data.attribution.utm_source.length, 200);
  assert.equal(data.attribution.unwanted, undefined);
});
