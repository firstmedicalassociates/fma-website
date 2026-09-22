import test from "node:test";
import assert from "node:assert/strict";
import seed from "../../prisma/owings-mills-seed-data.js";
import { getLocationSeoContent } from "../../src/app/lib/seo.js";

test("upcoming office metadata advertises an estimate without claiming current appointments", () => {
  const upcoming = {
    ...seed.location,
    isComingSoon: true,
    openingDateLabel: "October 5",
    intro: "Our Owings Mills office is coming soon.",
  };
  const meta = getLocationSeoContent(upcoming);
  assert.match(meta.title, /Owings Mills.*Coming Soon/);
  assert.match(meta.description, /Estimated opening date: October 5/);
  const updated = getLocationSeoContent({ ...upcoming, openingDateLabel: "October 12" });
  assert.match(updated.description, /Estimated opening date: October 12/);
  assert.doesNotMatch(updated.description, /October 5/);
  assert.doesNotMatch(
    meta.description,
    /same-day|sees patients|visit.*for primary care/i,
  );
});
test("launched office and provider have verified booking links", () => {
  assert.equal(seed.location.isComingSoon, false);
  assert.equal(seed.location.bookingUrl, "https://pmc-firstmedicalassociates.provider-match.com/search?location_name=Owings%20Mills");
  assert.equal(seed.location.officeHours.length, 7);
  assert.deepEqual(seed.location.serviceIds, []);
  assert.equal(seed.provider.isActive, true);
  assert.equal(seed.provider.linkUrl, "https://pmc-firstmedicalassociates.provider-match.com/book/7367823");
  assert.equal(seed.provider.imageUrl, "");
  assert.deepEqual(seed.provider.languages, []);
  assert.deepEqual(seed.provider.locations, [seed.location.slug]);
});
