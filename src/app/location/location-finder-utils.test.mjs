import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDistanceMiles,
  findExactLocationGroups,
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

test("treats Maryland and MD as the same state for future city groups", () => {
  const groups = groupLocationsByStructuredCity([
    office("/columbia-one", "Columbia, MD", "Columbia", "MD", null),
    office("/columbia-two", "Columbia II, MD", "Columbia", "Maryland", null),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].title, "Columbia");
  assert.equal(groups[0].locations.length, 2);
});

test("finds an exact office city before using ambiguous geocoded distance results", () => {
  const groups = groupLocationsByStructuredCity([
    office("/bowie-one", "Bowie, MD", "Bowie", "MD", 1200),
    office("/bowie-two", "Bowie II, MD", "Bowie", "MD", 1202),
    office("/columbia-one", "Columbia, MD", "Columbia", "MD", 1180),
    office("/columbia-two", "Columbia II, MD", "Columbia", "MD", 1182),
  ]);

  const exactGroups = findExactLocationGroups(groups, { city: "bowie" });
  const selection = selectLocationGroupsForSearch(groups, { city: "bowie" });

  assert.deepEqual(exactGroups.map(({ title }) => title), ["Bowie"]);
  assert.equal(selection.usedExactMatch, true);
  assert.equal(selection.usedNearestFallback, false);
  assert.deepEqual(flattenLocationGroups(selection.groups).map(({ slug }) => slug), [
    "/bowie-one",
    "/bowie-two",
  ]);
});

test("matches an office state whether the search uses MD or Maryland", () => {
  const groups = groupLocationsByStructuredCity([
    office("/columbia-one", "Columbia, MD", "Columbia", "MD", 4),
    office("/columbia-two", "Columbia II, MD", "Columbia", "MD", 6),
  ]);

  const selection = selectLocationGroupsForSearch(groups, {
    city: "Columbia",
    state: "Maryland",
  });

  assert.equal(selection.usedExactMatch, true);
  assert.deepEqual(selection.groups.map(({ title }) => title), ["Columbia"]);
});

test("returns every city group within 25 miles without exact ZIP matching", () => {
  const groups = groupLocationsByStructuredCity([
    office("/nearby", "Nearby", "Nearby", "MD", 24.9),
    office("/boundary", "Boundary", "Boundary", "MD", 25),
    office("/far", "Far", "Far", "MD", 25.1),
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
