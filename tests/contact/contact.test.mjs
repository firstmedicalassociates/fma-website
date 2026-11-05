import test from "node:test";
import assert from "node:assert/strict";
import { createContactHandler } from "../../src/app/lib/contact-handler.mjs";
import { getNoPhiError, hasPotentialPhi } from "../../src/app/lib/no-phi-guard.js";

const env = { NODE_ENV: "production", CONTACT_FORM_VENDOR_REVIEWED: "true", SES_REGION: "us-east-1", SES_FROM_EMAIL: "forms@example.com", CONTACT_TO_EMAILS: "team@example.com;archive@example.com" };
const sample = { firstName: "Jordan", lastName: "Example", email: "visitor@example.com", phone: "301-555-0100", message: "Please share your office hours.", locationTitle: "Rockville", locationSlug: "/rockville/" };
const request = (data = sample) => new Request("https://drsfirst.com/api/location-info-contact", { method: "POST", body: JSON.stringify(data) });
function setup(overrides = {}) {
  const sent = [];
  return { sent, handler: createContactHandler({ env, checkLimit: async () => null, hasPotentialPhi, getNoPhiError, send: async message => sent.push(message), logError: () => {}, ...overrides }) };
}

test("general, location and legacy vendor forms notify the configured team, then confirm receipt", async () => {
  for (const source of [{ locationSlug: "/contact", locationTitle: "" }, {}, { locationSlug: "/contact-partner/", organization: "Example Vendor" }]) {
    const { handler, sent } = setup();
    const payload = { ...sample, ...source, recipients: ["attacker@example.com"] };
    assert.deepEqual(await (await handler(request(payload))).json(), { ok: true, confirmationSent: true });
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[0].To.map(x => x.email), ["team@example.com", "archive@example.com"]);
    assert.equal(sent[0].ReplyTo[0].email, sample.email);
    for (const value of [sample.firstName, sample.lastName, sample.email, sample.phone, sample.message, payload.locationSlug]) assert.ok(sent[0].PlainContent.includes(value));
    assert.equal(sent[1].To[0].email, sample.email);
    assert.ok(!sent[1].PlainContent.includes(sample.message));
  }
});

test("delivery failures distinguish failed team notification from failed visitor confirmation", async () => {
  for (const failOn of [1, 2]) {
    let attempts = 0;
    const { handler } = setup({ send: async () => { if (++attempts === failOn) throw new Error("Rejected"); } });
    const response = await handler(request());
    assert.equal(response.status, failOn === 1 ? 502 : 200);
    const result = await response.json();
    assert.equal(result.ok, failOn === 2);
    if (failOn === 2) assert.equal(result.confirmationSent, false);
    assert.equal(attempts, failOn);
  }
});

test("preserves legacy recipient-only settings while sending through the new transport", async () => {
  const { handler, sent } = setup({ env: { ...env, CONTACT_TO_EMAILS: "", SENDLAYER_TO_EMAILS: "existing@example.com" } });
  assert.equal((await handler(request())).status, 200);
  assert.deepEqual(sent[0].To.map(x => x.email), ["existing@example.com"]);
});

test("missing configuration, PHI, malformed forms, and rate limiting never send email", async () => {
  for (const config of [{ ...env, SES_REGION: "" }, { ...env, CONTACT_TO_EMAILS: "" }, { ...env, CONTACT_FORM_VENDOR_REVIEWED: "false" }]) {
    const { handler, sent } = setup({ env: config });
    assert.ok((await handler(request())).status >= 500);
    assert.equal(sent.length, 0);
  }
  const { handler, sent } = setup();
  for (const data of [null, { ...sample, email: "invalid" }, { ...sample, message: "My patient takes insulin." }, { ...sample, locationSlug: "/contact-partner", organization: "" }]) assert.equal((await handler(request(data))).status, 400);
  assert.equal(sent.length, 0);
  const limited = setup({ checkLimit: async () => Response.json({ ok: false }, { status: 429 }) });
  assert.equal((await limited.handler(request())).status, 429);
  assert.equal(limited.sent.length, 0);
});
