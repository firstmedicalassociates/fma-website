import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { GENERAL_BOOK_APPOINTMENT_URL } from "../../src/app/lib/config/site.js";
import {
  getProviderInitials,
  resolveProviderBookingHref,
  resolveProviderImageSrc,
} from "../../src/app/lib/providers.js";
import {
  getLocationSeoContent,
  getProviderSeoContent,
  isPlaceholderProviderBio,
} from "../../src/app/lib/seo.js";

const require = createRequire(import.meta.url);
const locationSeedData = require("../../prisma/location-seed-data.js");
const locationInfoSeedData = require("../../prisma/location-info-seed-data.js");
const providerSeedData = require("../../prisma/provider-seed-data.js");

test("Alexandria seed data contains the approved launch details", () => {
  const location = locationSeedData.find((entry) => entry.href === "/location/alexandria/");

  assert.ok(location);
  assert.equal(location.name, "Alexandria, VA");
  assert.equal(location.cityStatePhone, "571-200-7128");
  assert.deepEqual(location.addressLines, [
    "4660 Kenmore Ave Suite #1210",
    "Alexandria, VA 22304",
  ]);
  assert.equal(location.img, "/assets/locations/alexandria-kenmore.webp");
  assert.equal(location.bookingUrl, GENERAL_BOOK_APPOINTMENT_URL);

  const info = locationInfoSeedData["/location/alexandria"];
  assert.deepEqual(
    info.sections.map(({ key }) => key),
    ["same-day-clinic", "family-doctor", "doctors", "primary-care", "geriatric-care"]
  );
  assert.match(JSON.stringify(info), /Northern Virginia/);
});

test("Khai-El Johnson is assigned only to Alexandria with launch-safe placeholder content", () => {
  const provider = providerSeedData.find((entry) => entry.slug === "khai-el-johnson");

  assert.ok(provider);
  assert.equal(provider.name, "Khai-El Johnson");
  assert.equal(provider.title, "MD");
  assert.deepEqual(provider.locations, ["Alexandria"]);
  assert.deepEqual(provider.languages, []);
  assert.equal(provider.imageUrl, "");
  assert.equal(provider.linkUrl, null);
  assert.equal(provider.bio, "Coming soon.");
});

test("Alexandria and Khai-El Johnson return exact optimized SEO content", () => {
  assert.deepEqual(
    getLocationSeoContent({
      slug: "/location/alexandria",
      title: "Alexandria, VA",
      addressCity: "Alexandria",
      addressState: "VA",
    }),
    {
      title: "Primary Care in Alexandria, VA | First Medical Associates",
      h1: "Primary Care Doctor in Alexandria, VA",
      description:
        "Visit First Medical Associates in Alexandria, VA for primary care, family medicine, same-day appointments, preventive care, and chronic condition support.",
      placeLabel: "Alexandria, VA",
    }
  );

  const providerSeo = getProviderSeoContent({
    slug: "khai-el-johnson",
    name: "Khai-El Johnson",
    bio: "Coming soon.",
  });

  assert.equal(providerSeo.h1, "Khai-El Johnson, MD");
  assert.equal(
    providerSeo.description,
    "Khai-El Johnson, MD, sees patients at First Medical Associates in Alexandria, VA. View location details and request an appointment."
  );
  assert.equal(isPlaceholderProviderBio("Bio coming soon."), true);
  assert.doesNotMatch(providerSeo.description, /^coming soon/i);
});

test("provider booking and headshot fallbacks preserve direct-link precedence", () => {
  assert.equal(
    resolveProviderBookingHref(
      { linkUrl: "https://example.com/direct" },
      { bookingUrl: "https://example.com/location" }
    ),
    "https://example.com/direct"
  );
  assert.equal(
    resolveProviderBookingHref({}, { bookingUrl: "https://example.com/location" }),
    "https://example.com/location"
  );
  assert.equal(resolveProviderBookingHref({}, {}), GENERAL_BOOK_APPOINTMENT_URL);
  assert.equal(resolveProviderImageSrc({ slug: "khai-el-johnson", imageUrl: "" }), "");
  assert.equal(getProviderInitials("Khai-El Johnson"), "KJ");
});
