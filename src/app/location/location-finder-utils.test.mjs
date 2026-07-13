import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDistanceMiles,
  flattenLocationGroups,
  groupLocationsByStructuredCity,
  selectLocationGroupsForSearch,
} from "./location-finder-utils.mjs";

function office(slug, title, city, state, distanceMiles) {
  return {
    slug,
    title,
    addressCity: city,
    addressState: state,
    distanceMiles,
    providers: [],
  };
}

test("groups offices only when their structured city and state match", () => {
  const groups = groupLocationsByStructuredCity([
    office("/location/bowie", "Bowie, MD", "Bowie", "MD", 12),
    office("/bowie-dev", "Bowie II, MD", "Bowie", "MD", 15),
    office("/location/bowie-pa", "Bowie, PA", "Bowie", "PA", 140),
    office("/unstructured-one", "Unstructured", "", "", 20),
    office("/unstructured-two", "Unstructured II", "", "", 21),
  ]);

  assert.equal(groups.length, 4);
  assert.deepEqual(groups[0].locations.map(({ slug }) => slug), [
    "/location/bowie",
    "/bowie-dev",
  ]);
  assert.equal(groups[0].title, "Bowie");
  assert.equal(groups[0].nearestDistanceMiles, 12);
});

test("returns every city group within 50 miles without exact ZIP matching", () => {
  const groups = groupLocationsByStructuredCity([
    office("/nearby", "Nearby", "Nearby", "MD", 49.9),
    office("/boundary", "Boundary", "Boundary", "MD", 50),
    office("/far", "Far", "Far", "MD", 50.1),
  ]);
  const selection = selectLocationGroupsForSearch(groups);

  assert.equal(selection.usedNearestFallback, false);
  assert.deepEqual(selection.groups.map(({ title }) => title), ["Nearby", "Boundary"]);
});

test("falls back to the nearest three unique city groups and keeps every branch", () => {
  const groups = groupLocationsByStructuredCity([
    office("/bowie-one", "Bowie", "Bowie", "MD", 62),
    office("/bowie-two", "Bowie II", "Bowie", "MD", 64),
    office("/columbia", "Columbia", "Columbia", "MD", 70),
    office("/crofton", "Crofton", "Crofton", "MD", 80),
    office("/frederick", "Frederick", "Frederick", "MD", 90),
  ]);
  const selection = selectLocationGroupsForSearch(groups);

  assert.equal(selection.usedNearestFallback, true);
  assert.deepEqual(selection.groups.map(({ title }) => title), ["Bowie", "Columbia", "Crofton"]);
  assert.deepEqual(flattenLocationGroups(selection.groups).map(({ slug }) => slug), [
    "/bowie-one",
    "/bowie-two",
    "/columbia",
    "/crofton",
  ]);
});

test("reports unavailable distance data when no office was geocoded", () => {
  const groups = groupLocationsByStructuredCity([
    office("/one", "One", "One", "MD", null),
    office("/two", "Two", "Two", "MD", null),
  ]);
  const selection = selectLocationGroupsForSearch(groups);

  assert.equal(selection.hasDistanceData, false);
  assert.equal(selection.usedNearestFallback, false);
  assert.deepEqual(selection.groups, []);
});

test("calculates geographic distance in miles", () => {
  const distance = calculateDistanceMiles(
    { lat: 38.9784, lng: -76.4922 },
    { lat: 39.0068, lng: -76.7791 }
  );

  assert.ok(distance > 15 && distance < 17);
});
