const INVALID_ZOCDOC_URL = "Enter a full HTTPS Zocdoc link, or leave it blank to hide the button.";

export function validateZocdocUrl(value) {
  if (value == null) return "";
  if (typeof value !== "string") return INVALID_ZOCDOC_URL;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > 2048) return INVALID_ZOCDOC_URL;
  try {
    const url = new URL(trimmed);
    if (
      url.protocol !== "https:" ||
      !(url.hostname === "zocdoc.com" || url.hostname.endsWith(".zocdoc.com")) ||
      url.username || url.password || url.port
    ) return INVALID_ZOCDOC_URL;
    return "";
  } catch {
    return INVALID_ZOCDOC_URL;
  }
}

export function getProviderZocdocUrl(provider = {}) {
  const value = provider?.zocdocUrl;
  return typeof value === "string" && !validateZocdocUrl(value) ? value.trim() : "";
}
