// Kept separate from the server transport because the records form also imports
// validation helpers. AWS credentials and the SDK never belong in that bundle.
export function getEmailConfig(env = process.env) {
  return {
    region: (env.SES_REGION || env.AWS_REGION || "").trim(),
    fromEmail: (env.SES_FROM_EMAIL || "").trim().toLowerCase(),
    fromName: (env.SES_FROM_NAME || "First Medical Associates").replace(/[\r\n]/g, " ").trim(),
    configurationSet: (env.SES_CONFIGURATION_SET || "").trim(),
  };
}

export function emailDeliveryConfigured(env = process.env) {
  const { region, fromEmail } = getEmailConfig(env);
  // Credentials are resolved by the AWS SDK's standard provider chain (IAM
  // role, environment, or local profile), not required to be static keys.
  return /^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region)
    && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(fromEmail);
}
