import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_PHONE_HREF,
  bookingActionLabel,
  getSearchBookingActions,
  resolveLocationBookingHref,
} from "../../src/app/lib/booking.js";
import { resolveProviderBookingHref } from "../../src/app/lib/providers.js";
import { GENERAL_BOOK_APPOINTMENT_URL } from "../../src/app/lib/config/site.js";
import { sanitizeGeneratedAnswerResult } from "../../src/app/lib/ai-search-output-guard.js";

const root = "https://pmc-firstmedicalassociates.provider-match.com/";

test("general and stale location CTAs use the new scheduler with the selected office", () => {
  assert.equal(GENERAL_BOOK_APPOINTMENT_URL, root);
  assert.equal(resolveLocationBookingHref({ slug: "/location/alexandria/", bookingUrl: "https://first-medical-associates.inquicker.com/search?zip=" }), `${root}search?location_name=Alexandria`);
  assert.equal(resolveLocationBookingHref({ slug: "/location/germantown", bookingUrl: root }), `${root}search?location_name=Germantown`);
  assert.equal(resolveLocationBookingHref({ slug: "/location/owings-mills", isComingSoon: true }), "");
});

test("secondary locations never send patients to the first office in that city", () => {
  assert.equal(resolveLocationBookingHref({ slug: "/bowie-health-center-dr" }), `${root}search?location_name=Bowie%20II`);
  assert.equal(resolveLocationBookingHref({ slug: "/columbia-broken-land-parkway" }), `${root}search?location_name=Columbia%20II`);
  assert.equal(resolveLocationBookingHref({ title: "Silver Spring, MD" }), `${root}search?location_name=Silver%20Spring`);
});

test("Karen's Asana booking link works before and after the CMS update", () => {
  const expected = `${root}book/6803195`;
  for (const linkUrl of [null, "", "https://first-medical-associates.inquicker.com/", expected]) {
    assert.equal(resolveProviderBookingHref({ name: "Karen Lizarraga", slug: "karen-lizarraga", linkUrl }), expected);
  }
});

test("saved provider links retain their identity and phone fallbacks are labeled", () => {
  const robin = `${root}book/6803155`;
  assert.equal(resolveProviderBookingHref({ name: "Robin Codjoe", linkUrl: robin }, { slug: "/location/bowie" }), robin);
  const unavailable = resolveProviderBookingHref({ name: "Ronald Thomas", slug: "ronald-thomas" });
  assert.equal(unavailable, BOOKING_PHONE_HREF);
  assert.equal(bookingActionLabel(unavailable), "Call to book");
  assert.equal(bookingActionLabel(resolveProviderBookingHref({ slug: "khai-el-johnson" })), "Book appointment");
});

test("AI answers accept the supplied booking URL and reject invented or retired destinations", () => {
  const expected = `${root}book/6803195`;
  const options = { bookingUrls: [root, expected] };
  const result = (url) => sanitizeGeneratedAnswerResult({ answer: `Book at ${url}.`, confidence: "high", grounded: true }, options);
  assert.equal(result(expected).safetyIssue, "");
  assert.equal(result(`${expected}/`).safetyIssue, "");
  assert.equal(result(`${root}book/6803155`).safetyIssue, "unsupported_url");
  assert.equal(result("https://first-medical-associates.inquicker.com/").safetyIssue, "unsupported_url");
  assert.equal(result("https://pmc-firstmedicalassociates.provider-match.com.evil.example/book/6803195").safetyIssue, "unsupported_url");
});

test("search booking buttons keep the provider or office selected by the AI result", () => {
  const href = `${root}book/7261386`;
  assert.deepEqual(getSearchBookingActions({ cards: [{ type: "provider", title: "Khai-El Johnson", href: "/providers/khai-el-johnson/", bookingUrl: href }] }), [
    { href, label: "Book appointment: Khai-El Johnson" },
  ]);
  assert.deepEqual(getSearchBookingActions({ recoveryActions: [{ value: "book_karen-lizarraga", label: "Book appointment: Karen Lizarraga", href: `${root}book/6803195` }] }).map((action) => action.href), [`${root}book/6803195`]);
  assert.equal(getSearchBookingActions({ cards: [{ title: "Ronald Thomas", bookingUrl: BOOKING_PHONE_HREF }] })[0].label, "Call to book: Ronald Thomas");
  assert.equal(getSearchBookingActions({ cards: [{ title: "Bowie II", bookingUrl: `${root}search?location_name=Bowie%20II` }] })[0].href, `${root}search?location_name=Bowie%20II`);
});
