import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../prisma/owings-mills-seed-data.js";
import { getLocationSeoContent } from "../../src/app/lib/seo.js";

test("upcoming office metadata advertises an estimate without claiming current appointments", () => {
  const meta = getLocationSeoContent(seed.location);
  assert.match(meta.title, /Owings Mills.*Coming Soon/);
  assert.match(meta.description, /Estimated opening date: October 5/);
  const updated = getLocationSeoContent({ ...seed.location, openingDateLabel: "October 12" });
  assert.match(updated.description, /Estimated opening date: October 12/);
  assert.doesNotMatch(updated.description, /October 5/);
  assert.doesNotMatch(
    meta.description,
    /same-day|sees patients|visit.*for primary care/i,
  );
});
test("incomplete launch data leaves scheduling and unconfirmed provider details unavailable", () => {
  assert.equal(seed.location.isComingSoon, true);
  assert.equal(seed.location.bookingUrl, null);
  assert.equal(seed.location.officeHours.length, 5);
  assert.deepEqual(seed.location.serviceIds, []);
  assert.equal(seed.provider.isActive, false);
  assert.equal(seed.provider.linkUrl, null);
  assert.equal(seed.provider.imageUrl, "");
  assert.deepEqual(seed.provider.languages, []);
  assert.deepEqual(seed.provider.locations, [seed.location.slug]);
});
