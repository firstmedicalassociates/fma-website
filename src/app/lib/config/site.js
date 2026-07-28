export const SITE_NAME = "First Medical Associates";
export const DEFAULT_SITE_URL = "https://drsfirst.com";
export const PATIENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL?.trim() || "https://4332.portal.athenahealth.com/";
export const BILL_PAY_URL =
  "https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=7ee8b673-7155-41a3-9ef1-249815a30f92&ccId=19000101_000001&type=JS&lang=en_US";
export const SITE_CALL_HREF =
  process.env.NEXT_PUBLIC_SITE_CALL_HREF?.trim() || "tel:+13012843181";
export const SITE_CALL_LABEL =
  process.env.NEXT_PUBLIC_SITE_CALL_LABEL?.trim() || "301-284-3181";
export const GENERAL_BOOK_APPOINTMENT_URL =
  process.env.NEXT_PUBLIC_GENERAL_BOOK_APPOINTMENT_URL?.trim() ||
  "https://first-medical-associates.inquicker.com/search?appointmentTypes=2791&insurancePlans=&isVirtual=false&service=find-a-doctor&serviceName=Find%20A%20Doctor&service_id=5175%2C5176&specialtyId=&specialtyName=&specialtyType=&subservice_ids=5175&subservice_ids=5176&timestamp=2023-09-14T17%3A25%3A32-04%3A00&ux_mode=default&viewName=list&zip=";
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "";

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const normalized = envUrl ? envUrl.trim().replace(/\/+$/, "") : "";
  return normalized || DEFAULT_SITE_URL;
}

export function absoluteUrl(pathname = "/") {
  const path = String(pathname || "/");
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
