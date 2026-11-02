import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { emailDeliveryConfigured, getEmailConfig } from "./email-config.mjs";

function mailbox(value) {
  const email = String(value?.email || "").trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error("Invalid email address.");
  const name = String(value?.name || "").replace(/[\r\n]/g, " ").trim();
  return name ? `"${name.replace(/[\\"]/g, "\\$&")}" <${email}>` : email;
}

// All four form flows use this transport. It does not add recipients or redirect
// patient records to a test inbox. Tests supply a client that cannot send mail.
export function createSesEmailSender({ env = process.env, client } = {}) {
  let ses = client;
  return async function send(message) {
    if (!emailDeliveryConfigured(env)) throw new Error("Amazon SES is not configured.");
    const config = getEmailConfig(env);
    const to = message.To?.map(mailbox);
    if (!to?.length) throw new Error("An email recipient is required.");
    const body = {};
    if (message.HTMLContent) body.Html = { Data: message.HTMLContent, Charset: "UTF-8" };
    if (message.PlainContent) body.Text = { Data: message.PlainContent, Charset: "UTF-8" };
    const input = {
      FromEmailAddress: mailbox({ email: config.fromEmail, name: config.fromName }),
      Destination: { ToAddresses: to },
      ...(message.ReplyTo?.length && { ReplyToAddresses: message.ReplyTo.map(mailbox) }),
      Content: {
        Simple: {
          Subject: { Data: String(message.Subject || "").replace(/[\r\n]/g, " "), Charset: "UTF-8" },
          Body: body,
          ...(message.Attachments?.length && {
            Attachments: message.Attachments.map(attachment => ({
              // The SDK base64-encodes bytes. Decode the existing PDF representation
              // once here to avoid sending a double-encoded, unreadable attachment.
              RawContent: Buffer.from(attachment.Content, "base64"),
              FileName: attachment.Filename,
              ContentType: attachment.Type,
              ContentDisposition: "ATTACHMENT",
              ContentTransferEncoding: "BASE64",
            })),
          }),
        },
      },
      ...(message.Tags?.length && {
        EmailTags: message.Tags.map((value, index) => ({ Name: `form-tag-${index + 1}`, Value: value })),
      }),
      ...(config.configurationSet && { ConfigurationSetName: config.configurationSet }),
    };
    // Sending is not idempotent. Do not retry an ambiguous timeout and risk
    // duplicate inquiries or duplicate medical-records authorizations.
    ses ||= new SESv2Client({
      region: config.region,
      maxAttempts: 1,
      ...(env.AWS_ROLE_ARN?.trim() && {
        credentials: awsCredentialsProvider({
          roleArn: env.AWS_ROLE_ARN.trim(),
          clientConfig: { region: config.region },
        }),
      }),
    });
    try {
      const result = await ses.send(new SendEmailCommand(input), { abortSignal: AbortSignal.timeout(15000) });
      if (typeof result?.MessageId !== "string" || !result.MessageId.trim()) throw new Error("Missing acknowledgement");
      return result.MessageId;
    } catch (cause) {
      // AWS errors can include addresses or content. Expose only a generic error
      // and numeric status to the routes, which already avoid logging form data.
      const error = new Error("Amazon SES did not acknowledge the email.");
      error.status = Number(cause?.$metadata?.httpStatusCode) || 0;
      throw error;
    }
  };
}

export const sendFormEmail = createSesEmailSender();
