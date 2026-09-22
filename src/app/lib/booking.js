import { GENERAL_BOOK_APPOINTMENT_URL } from "./config/site.js";

// Verified against Provider Match's location search on September 22, 2026.
// These are scheduler names, not site slugs (the secondary offices differ).
export const BOOKING_LOCATION_NAMES = {
  "/location/alexandria": "Alexandria",
  "/location/annapolis": "Annapolis",
  "/location/bowie": "Bowie",
  "/bowie-health-center-dr": "Bowie II",
  "/location/columbia": "Columbia",
  "/columbia-broken-land-parkway": "Columbia II",
  "/location/crofton": "Crofton",
  "/location/frederick": "Frederick",
  "/location/gaithersburg": "Gaithersburg",
  "/location/germantown": "Germantown",
  "/location/glen-burnie": "Glen Burnie",
  "/location/greenbelt": "Greenbelt",
  "/location/laurel": "Laurel",
  "/location/lutherville": "Lutherville",
  "/location/nottingham": "Nottingham",
  "/location/owings-mills": "Owings Mills",
  "/location/rockville": "Rockville",
  "/location/severna-park": "Severna Park",
  "/location/silver-spring": "Silver Spring",
};

// Newly verified destinations missing from the CMS. Keep public pages and AI
// search usable before the idempotent booking-link sync has been applied.
export const VERIFIED_PROVIDER_BOOKING_PATHS = {
  "christopher-costa": "book/7094373",
  "jacob-scott": "book/7367823",
  "karen-lizarraga": "book/6803195",
  "khai-el-johnson": "book/7261386",
};

export const BOOKING_PHONE_HREF = "tel:+13015152901";

export function isLegacyBookingUrl(value = "") {
  try {
    const host = new URL(String(value).trim()).hostname.toLowerCase();
    return host === "inquicker.com" || host.endsWith(".inquicker.com");
  } catch {
    return false;
  }
}

export function resolveLocationBookingHref(location = {}) {
  if (location?.isComingSoon) return "";
  const slug = String(location?.slug || "").trim().replace(/\/+$/, "");
  const title = String(location?.title || location?.name || "").trim().replace(/,\s*(MD|VA)$/i, "");
  const name = BOOKING_LOCATION_NAMES[slug] || Object.values(BOOKING_LOCATION_NAMES)
    .find((entry) => entry.toLowerCase() === title.toLowerCase());
  if (name) {
    return `${GENERAL_BOOK_APPOINTMENT_URL}search?location_name=${encodeURIComponent(name)}`;
  }
  const saved = String(location?.bookingUrl || "").trim();
  return saved && saved !== "#" && !isLegacyBookingUrl(saved) ? saved : GENERAL_BOOK_APPOINTMENT_URL;
}

export function bookingActionLabel(href = "") {
  if (href.startsWith("tel:")) return "Call to book";
  if (href.includes("provider-match.com/provider/")) return "View scheduling options";
  return "Book appointment";
}

// Both search surfaces must render the destinations supplied by their results,
// including when a named provider has no live appointment times to display.
export function getSearchBookingActions({ cards = [], appointmentOptions = [], recoveryActions = [] } = {}) {
  const actions = [
    ...appointmentOptions.map((option) => ({
      href: option.bookingUrl,
      label: `${bookingActionLabel(option.bookingUrl)}: ${option.providerName || "FMA provider"}`,
    })),
    ...cards.filter((card) => card.bookingUrl).map((card) => ({
      href: card.bookingUrl,
      label: `${bookingActionLabel(card.bookingUrl)}: ${card.title}`,
    })),
    ...recoveryActions.filter((action) => String(action.value || "").startsWith("book_")),
  ];
  return actions.filter((action, index) => action.href &&
    actions.findIndex((entry) => entry.href === action.href && entry.label === action.label) === index
  ).slice(0, 4);
}
