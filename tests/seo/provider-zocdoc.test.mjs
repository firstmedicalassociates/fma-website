import test from "node:test";
import assert from "node:assert/strict";
import { getProviderZocdocUrl, validateZocdocUrl } from "../../src/app/lib/zocdoc.js";

test("Zocdoc buttons require a saved safe link and never fall back to a slug mapping", () => {
  for (const zocdocUrl of [undefined, null, "", "  ", "javascript:alert(1)", "https://zocdoc.com.evil.test/", "https://user:password@www.zocdoc.com/", {}, "https://example.com/"]) {
    assert.equal(getProviderZocdocUrl({ slug: "alisha-singh", zocdocUrl }), "");
  }
  const link = "https://www.zocdoc.com/booking-link/doctor/example-123?source=provider";
  assert.equal(getProviderZocdocUrl({ zocdocUrl: ` ${link} ` }), link);
  assert.equal(validateZocdocUrl(""), "");
  assert.equal(validateZocdocUrl(null), "");
  assert.ok(validateZocdocUrl(123));
  assert.ok(validateZocdocUrl("https://www.zocdoc.com/" + "a".repeat(2048)));
});
