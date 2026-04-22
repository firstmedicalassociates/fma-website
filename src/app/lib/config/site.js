export const SITE_NAME = "First Medical Associates";
export const PATIENT_PORTAL_URL = process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL?.trim() || "#";
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "";

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const normalized = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";
  return normalized || "http://localhost:3000";
}

export function absoluteUrl(pathname = "/") {
  const path = String(pathname || "/");
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
