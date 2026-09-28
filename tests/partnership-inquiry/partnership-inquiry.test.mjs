import test from "node:test";
import assert from "node:assert/strict";
import { buildPartnershipEmails, validatePartnershipInquiry } from "../../src/app/lib/partnership-inquiry.mjs";
import { PARTNERSHIP_TYPES } from "../../src/app/lib/partnership-options.mjs";
import { createPartnershipInquiryHandler } from "../../src/app/lib/partnership-inquiry-handler.mjs";
import { hasPotentialPhi } from "../../src/app/lib/no-phi-guard.js";

const sample = { firstName: "Jordan", lastName: "Morgan", email: "jordan@example.com", phone: "301-555-0123", organization: "Example Community Organization", role: "Director", partnershipType: "Community Organizations", message: "We would like to explore expanding access to primary care in our community.", consent: true };
const env = { NODE_ENV: "test", SENDLAYER_API_KEY: "test-key", SENDLAYER_FROM_EMAIL: "from@example.com", SENDLAYER_TO_EMAILS: "patients@example.com", SENDLAYER_PRACTICE_TO_EMAILS: "practices@example.com" };
const request = (payload = sample) => new Request("http://localhost/api/partnership-inquiry", { method: "POST", body: JSON.stringify(payload) });
function setup(overrides = {}) {
  const sent = [];
  return { sent, handler: createPartnershipInquiryHandler({ checkLimit: async () => null, hasPotentialPhi, env, send: async (key, message) => { assert.equal(key, "test-key"); sent.push(message); }, logError: () => {}, ...overrides }) };
}

test("notifies both designated inboxes before welcoming the visitor, with separate reply-to addresses", async () => {
  const { handler, sent } = setup();
  assert.deepEqual(await (await handler(request({ ...sample, recipients: ["unwanted@example.com"], source: "/forged" }))).json(), { ok: true, confirmationSent: true });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0].To.map(item => item.email), ["Partnerships@drsfirst.com", "citryn.contactforms@gmail.com"]);
  assert.equal(sent[0].ReplyTo[0].email, sample.email);
  for (const value of [sample.organization, sample.role, sample.partnershipType, sample.message, "/partner-with-us/"]) {
    assert.ok(sent[0].PlainContent.includes(value));
  }
  assert.deepEqual(sent[1].To, [{ email: sample.email, name: "Jordan Morgan" }]);
  assert.equal(sent[1].ReplyTo[0].email, "Partnerships@drsfirst.com");
  assert.match(sent[1].HTMLContent, /Dear Jordan/);
  assert.match(sent[1].HTMLContent, /email-logo-white.png/);
  assert.match(sent[1].HTMLContent, /https:\/\/drsfirst.com\/about\/partners\//);
  for (const content of [sent[1].HTMLContent, sent[1].PlainContent]) {
    assert.ok(!content.includes(sample.organization));
    assert.ok(!content.includes(sample.message));
    assert.ok(!content.includes("citryn.contactforms"));
    assert.ok(!content.includes("Practice transitions"));
  }
});

test("never sends a welcome or claims success if team delivery fails", async () => {
  let attempts = 0;
  const { handler } = setup({ send: async () => { attempts++; throw new Error("Rejected"); } });
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
  assert.equal(attempts, 1);
});

test("returns accepted inquiry with failed welcome without prompting a duplicate submission", async () => {
  let attempts = 0;
  const { handler } = setup({ send: async () => { if (++attempts === 2) throw new Error("Rejected"); } });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, confirmationSent: false });
});

test("validates required fields, types, lengths, contact consent, email, phone, and honeypot before delivery", async () => {
  const { handler, sent } = setup();
  for (const payload of [null, [], { ...sample, organization: " " }, { ...sample, message: " " }, { ...sample, firstName: {} }, { ...sample, email: "bad" }, { ...sample, phone: "123" }, { ...sample, partnershipType: "Forged" }, { ...sample, consent: "true" }, { ...sample, message: "x".repeat(1501) }, { ...sample, website: "spam" }]) {
    assert.equal((await handler(request(payload))).status, 400);
  }
  assert.equal(sent.length, 0);
});

test("accepts every offered partnership category and an omitted role", () => {
  for (const partnershipType of PARTNERSHIP_TYPES) {
    const { data, error } = validatePartnershipInquiry({ ...sample, partnershipType, role: undefined, email: " JORDAN@EXAMPLE.COM " });
    assert.equal(error, undefined);
    assert.equal(data.role, "");
    assert.equal(data.email, "jordan@example.com");
  }
});

test("rejects malformed JSON, oversized bodies, and potential patient information without sending", async () => {
  const { handler, sent } = setup();
  assert.equal((await handler(new Request("http://localhost/api/partnership-inquiry", { method: "POST", body: "{" }))).status, 400);
  assert.equal((await handler(request({ extra: "x".repeat(16001) }))).status, 413);
  assert.equal((await handler(request({ ...sample, message: "My patient takes insulin." }))).status, 400);
  assert.equal(sent.length, 0);
});

test("requires sender credentials and the existing production vendor review flag", async () => {
  for (const settings of [{ ...env, NODE_ENV: "production" }, { ...env, SENDLAYER_API_KEY: "" }, { ...env, SENDLAYER_FROM_EMAIL: "invalid" }]) {
    const { handler, sent } = setup({ env: settings });
    assert.equal((await handler(request())).status, 503);
    assert.equal(sent.length, 0);
  }
  const { handler } = setup({ env: { ...env, NODE_ENV: "production", CONTACT_FORM_VENDOR_REVIEWED: "true" } });
  assert.equal((await handler(request())).status, 200);
});

test("preserves rate limit and unavailable responses without delivery", async () => {
  for (const status of [429, 503]) {
    const { handler, sent } = setup({ checkLimit: async () => Response.json({ ok: false }, { status, headers: { "Retry-After": "60" } }) });
    const response = await handler(request());
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Retry-After"), "60");
    assert.equal(sent.length, 0);
  }
});

test("escapes submitted HTML in both templates and normalizes header names", async () => {
  const { data } = validatePartnershipInquiry({ ...sample, firstName: '<img src=x onerror="bad">', organization: "A&B <Organization>", message: "<script>bad()</script>\nNext line" });
  const { team, welcome } = buildPartnershipEmails(data);
  assert.match(team.html, /A&amp;B &lt;Organization&gt;/);
  assert.match(team.html, /&lt;script&gt;bad\(\)&lt;\/script&gt;<br>Next line/);
  assert.match(welcome.html, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.ok(!welcome.html.includes('<img src=x'));
  const { handler, sent } = setup();
  await handler(request({ ...sample, firstName: "Jordan\r\nBcc: other" }));
  assert.ok(!/[\r\n]/.test(sent[0].ReplyTo[0].name));
});
