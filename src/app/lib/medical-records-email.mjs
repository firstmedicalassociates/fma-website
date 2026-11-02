export async function sendMedicalRecordsEmail(apiKey, message, request = fetch) {
  const response = await request("https://console.sendlayer.com/api/v1/email", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(message), signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.MessageID !== "string" || !result.MessageID) throw new Error("Email service did not accept the authorization.");
}
