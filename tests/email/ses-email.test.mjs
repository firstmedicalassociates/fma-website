import test from "node:test";
import assert from "node:assert/strict";
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { createSesEmailSender } from "../../src/app/lib/ses-email.mjs";
import { emailDeliveryConfigured } from "../../src/app/lib/email-config.mjs";

const env = { SES_REGION: "us-east-1", SES_FROM_EMAIL: "forms@example.com", SES_FROM_NAME: 'FMA "Forms"' };
const message = {
  To: [{ email: "team@example.com", name: "Team" }],
  ReplyTo: [{ email: "visitor@example.com", name: "Jordan López" }],
  Subject: "Website inquiry", HTMLContent: "<p>Test</p>", PlainContent: "Test",
  Tags: ["website-contact", "team-notification"],
  Attachments: [{ Content: Buffer.from("%PDF-1.7 synthetic").toString("base64"), Type: "application/pdf", Filename: "test.pdf" }],
};

test("the real SDK signs an SES v2 request and serializes PDF bytes exactly once", async () => {
  let calls = 0;
  const client = new SESv2Client({
    region: env.SES_REGION, maxAttempts: 1,
    credentials: { accessKeyId: "synthetic-access-key", secretAccessKey: "synthetic-secret" },
    requestHandler: { async handle(request) {
      calls++;
      assert.equal(request.hostname, "email.us-east-1.amazonaws.com");
      assert.equal(request.path, "/v2/email/outbound-emails");
      assert.match(request.headers.authorization, /^AWS4-HMAC-SHA256 /);
      const input = JSON.parse(Buffer.from(request.body).toString("utf8"));
      assert.equal(input.FromEmailAddress, '"FMA \\"Forms\\"" <forms@example.com>');
      assert.deepEqual(input.Destination, { ToAddresses: ['"Team" <team@example.com>'] });
      assert.deepEqual(input.ReplyToAddresses, ['"Jordan López" <visitor@example.com>']);
      assert.equal(input.Content.Simple.Subject.Data, message.Subject);
      assert.equal(input.Content.Simple.Body.Html.Data, message.HTMLContent);
      assert.equal(input.Content.Simple.Body.Text.Data, message.PlainContent);
      assert.equal(input.Content.Simple.Attachments[0].RawContent, message.Attachments[0].Content);
      assert.equal(input.ConfigurationSetName, "forms");
      assert.equal(input.EmailTags[0].Value, "website-contact");
      return { response: { statusCode: 200, headers: { "content-type": "application/json" }, body: new TextEncoder().encode('{"MessageId":"accepted-id"}') } };
    } },
  });
  const send = createSesEmailSender({ env: { ...env, SES_CONFIGURATION_SET: "forms" }, client });
  assert.equal(await send(message), "accepted-id");
  assert.equal(calls, 1);
  client.destroy();
});

test("only an acknowledged MessageId counts as success; provider details are discarded", async () => {
  for (const result of [undefined, {}, { MessageId: "" }, { MessageId: " " }]) {
    const send = createSesEmailSender({ env, client: { send: async () => result } });
    await assert.rejects(send(message), /did not acknowledge/);
  }
  let attempts = 0;
  const send = createSesEmailSender({ env, client: { async send() {
    attempts++;
    throw Object.assign(new Error("sensitive-provider-content"), { $metadata: { httpStatusCode: 403 } });
  } } });
  await assert.rejects(send(message), error => {
    assert.equal(error.status, 403);
    assert.ok(!error.stack.includes("sensitive-provider-content"));
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(attempts, 1);
});

test("requires SES configuration and rejects address injection without calling AWS", async () => {
  const client = { send: async () => assert.fail("Must not send") };
  for (const settings of [{}, { ...env, SES_REGION: "" }, { ...env, SES_FROM_EMAIL: "invalid" }]) {
    assert.equal(emailDeliveryConfigured(settings), false);
    await assert.rejects(createSesEmailSender({ env: settings, client })(message));
  }
  assert.equal(emailDeliveryConfigured(env), true); // IAM-role credentials need no static keys.
  const send = createSesEmailSender({ env, client });
  await assert.rejects(send({ ...message, To: [] }));
  await assert.rejects(send({ ...message, ReplyTo: [{ email: "a@example.com\r\nBcc: attacker@example.com" }] }));
});

test("test-recipient settings never redirect or copy a real message", async () => {
  const send = createSesEmailSender({ env: { ...env, SES_TEST_TO_EMAIL: "test@example.com" }, client: { async send(command) {
    assert.deepEqual(command.input.Destination, { ToAddresses: ['"Team" <team@example.com>'] });
    return { MessageId: "id" };
  } } });
  await send(message);
});
