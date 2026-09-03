export const SITE_NAME = "First Medical Associates";
export const CANONICAL_ORIGIN = "https://drsfirst.com";
export const DEFAULT_SITE_URL = CANONICAL_ORIGIN;
export const PATIENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_PATIENT_PORTAL_URL?.trim() || "https://4332.portal.athenahealth.com/";
export const BILL_PAY_URL =
  "https://payment.patient.athenahealth.com/statement/?src=statement";
export const SITE_CALL_HREF =
  process.env.NEXT_PUBLIC_SITE_CALL_HREF?.trim() || "tel:+13012843181";
export const SITE_CALL_LABEL =
  process.env.NEXT_PUBLIC_SITE_CALL_LABEL?.trim() || "301-284-3181";
export const GENERAL_BOOK_APPOINTMENT_URL =
  process.env.NEXT_PUBLIC_GENERAL_BOOK_APPOINTMENT_URL?.trim() ||
  "https://first-medical-associates.inquicker.com/search?appointmentTypes=2791&insurancePlans=&isVirtual=false&service=find-a-doctor&serviceName=Find%20A%20Doctor&service_id=5175%2C5176&specialtyId=&specialtyName=&specialtyType=&subservice_ids=5175&subservice_ids=5176&timestamp=2023-09-14T17%3A25%3A32-04%3A00&ux_mode=default&viewName=list&zip=";
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
export const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "";

const CANONICAL_PAGE_ALIASES = new Map([
  ["/about-us", "/about"],
  ["/accessibility-notice", "/accessibility"],
  ["/billing-questions", "/patient-resources/insurance"],
  ["/contact-us", "/contact"],
  ["/insurance", "/patient-resources/insurance"],
  ["/insurances", "/patient-resources/insurance"],
  ["/jobs", "/about/careers"],
  ["/location", "/locations"],
  ["/resources", "/patient-resources"],
  ["/service", "/services"],
]);

export function getSiteUrl() {
  return CANONICAL_ORIGIN;
}

function splitPathSuffix(value = "/") {
  const input = String(value || "/").trim() || "/";
  const suffixIndex = input.search(/[?#]/);

  if (suffixIndex === -1) {
    return { pathname: input, suffix: "" };
  }

  return {
    pathname: input.slice(0, suffixIndex) || "/",
    suffix: input.slice(suffixIndex),
  };
}

export function hasFileExtension(pathname = "") {
  const { pathname: cleanPathname } = splitPathSuffix(pathname);
  const lastSegment = cleanPathname.split("/").filter(Boolean).at(-1) || "";
  return /\.[a-z0-9]{1,12}$/i.test(lastSegment);
}

export function normalizePagePath(pathname = "/") {
  const { pathname: rawPathname, suffix } = splitPathSuffix(pathname);
  const withLeadingSlash = rawPathname.startsWith("/") ? rawPathname : `/${rawPathname}`;
  const normalizedPathname = withLeadingSlash.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  const pagePathname = normalizedPathname ? `${normalizedPathname}/` : "/";

  return `${pagePathname}${suffix}`;
}

export function pageUrl(pathname = "/") {
  return new URL(normalizePagePath(pathname), `${CANONICAL_ORIGIN}/`).toString();
}

export function absoluteUrl(pathname = "/") {
  const path = String(pathname || "/").trim() || "/";
  return new URL(path.startsWith("/") ? path : `/${path}`, `${CANONICAL_ORIGIN}/`).toString();
}

export function isPublicPagePath(pathname = "/") {
  const { pathname: cleanPathname } = splitPathSuffix(pathname);

  if (!cleanPathname.startsWith("/") || cleanPathname === "/") return false;
  if (
    cleanPathname === "/robots.txt" ||
    cleanPathname === "/sitemap.xml" ||
    cleanPathname === "/favicon.ico" ||
    cleanPathname === "/api" ||
    cleanPathname.startsWith("/api/") ||
    cleanPathname === "/admin" ||
    cleanPathname.startsWith("/admin/") ||
    cleanPathname === "/_next" ||
    cleanPathname.startsWith("/_next/") ||
    cleanPathname === "/.well-known" ||
    cleanPathname.startsWith("/.well-known/")
  ) {
    return false;
  }

  return !hasFileExtension(cleanPathname);
}

export function normalizeInternalPageHref(href = "") {
  const value = String(href || "").trim();
  if (!value || value === "/" || !value.startsWith("/") || !isPublicPagePath(value)) {
    return value;
  }

  const { pathname, suffix } = splitPathSuffix(value);
  const comparablePath = pathname.replace(/\/+$/, "") || "/";
  const canonicalPath = CANONICAL_PAGE_ALIASES.get(comparablePath) || comparablePath;
  return normalizePagePath(`${canonicalPath}${suffix}`);
}

export function normalizeInternalHtmlLinks(html = "") {
  return String(html || "").replace(
    /(\bhref\s*=\s*)(["'])(.*?)\2/gi,
    (match, prefix, quote, rawHref) => {
      const href = String(rawHref || "").trim();
      if (!href) return match;

      if (href.startsWith("/")) {
        return `${prefix}${quote}${normalizeInternalPageHref(href)}${quote}`;
      }

      if (/^https?:\/\/(?:www\.)?drsfirst\.com(?:\/|$)/i.test(href)) {
        const url = new URL(href);
        const pathWithSuffix = `${url.pathname}${url.search}${url.hash}`;
        const normalizedPath = isPublicPagePath(url.pathname)
          ? normalizeInternalPageHref(pathWithSuffix)
          : pathWithSuffix;
        return `${prefix}${quote}${CANONICAL_ORIGIN}${normalizedPath}${quote}`;
      }

      return match;
    }
  );
}

export function getTrailingSlashRedirectUrl(input, method = "GET") {
  const normalizedMethod = String(method || "GET").toUpperCase();
  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") return null;

  const url = input instanceof URL ? new URL(input.toString()) : new URL(String(input));
  if (!isPublicPagePath(url.pathname) || url.pathname.endsWith("/")) return null;

  url.pathname = normalizePagePath(url.pathname);
  return url;
}

export function shouldNoIndexDeployment(environment = process.env) {
  const vercelEnvironment = String(environment?.VERCEL_ENV || "").toLowerCase();
  return Boolean(vercelEnvironment) && vercelEnvironment !== "production";
}
