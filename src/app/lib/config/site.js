export const SITE_NAME = "First Medical Associates";

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const normalized = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";
  return normalized || "http://localhost:3000";
}

export function absoluteUrl(pathname = "/") {
  const path = String(pathname || "/");
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
