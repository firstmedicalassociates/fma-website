import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const locationsSource = await readFile(
  new URL("../../src/app/lib/locations.js", import.meta.url),
  "utf8"
);
const locationsModuleUrl = `data:text/javascript;base64,${Buffer.from(locationsSource).toString("base64")}`;
const { formatCondensedOfficeHoursForDisplay } = await import(locationsModuleUrl);

const standardHours = (day) => ({ day, startTime: "08:00", endTime: "17:00" });

test("condenses identical weekday hours into the existing compact layout", () => {
  const hours = [
    { day: "Sunday", closed: true },
    standardHours("Monday"),
    standardHours("Tuesday"),
    standardHours("Wednesday"),
    standardHours("Thursday"),
    standardHours("Friday"),
    { day: "Saturday", closed: true },
  ];

  assert.deepEqual(formatCondensedOfficeHoursForDisplay(hours), [
    { label: "Mon - Fri", value: "8:00 AM - 5:00 PM" },
    { label: "Saturday", value: "Closed" },
    { label: "Sunday", value: "Closed" },
  ]);
});

test("splits weekday ranges when a midweek day is closed", () => {
  const hours = [
    { day: "Sunday", closed: true },
    standardHours("Monday"),
    standardHours("Tuesday"),
    { day: "Wednesday", closed: true },
    standardHours("Thursday"),
    standardHours("Friday"),
    { day: "Saturday", closed: true },
  ];

  assert.deepEqual(formatCondensedOfficeHoursForDisplay(hours), [
    { label: "Mon - Tue", value: "8:00 AM - 5:00 PM" },
    { label: "Wednesday", value: "Closed" },
    { label: "Thu - Fri", value: "8:00 AM - 5:00 PM" },
    { label: "Saturday", value: "Closed" },
    { label: "Sunday", value: "Closed" },
  ]);
});

test("does not merge adjacent weekdays with different hours", () => {
  const hours = [
    standardHours("Monday"),
    { day: "Tuesday", startTime: "09:00", endTime: "16:00" },
    standardHours("Wednesday"),
    standardHours("Thursday"),
    standardHours("Friday"),
    { day: "Saturday", closed: true },
    { day: "Sunday", closed: true },
  ];

  assert.deepEqual(formatCondensedOfficeHoursForDisplay(hours), [
    { label: "Monday", value: "8:00 AM - 5:00 PM" },
    { label: "Tuesday", value: "9:00 AM - 4:00 PM" },
    { label: "Wed - Fri", value: "8:00 AM - 5:00 PM" },
    { label: "Saturday", value: "Closed" },
    { label: "Sunday", value: "Closed" },
  ]);
});

test("supports legacy range labels", () => {
  assert.deepEqual(
    formatCondensedOfficeHoursForDisplay([
      "Mon - Fri: 8:00 AM - 5:00 PM",
      "Saturday: Closed",
      "Sunday: Closed",
    ]),
    [
      { label: "Mon - Fri", value: "8:00 AM - 5:00 PM" },
      { label: "Saturday", value: "Closed" },
      { label: "Sunday", value: "Closed" },
    ]
  );
});

test("shows an explicit fallback when no hours are configured", () => {
  assert.deepEqual(formatCondensedOfficeHoursForDisplay([]), [
    { label: "Mon - Fri", value: "Hours unavailable" },
    { label: "Saturday", value: "Hours unavailable" },
    { label: "Sunday", value: "Hours unavailable" },
  ]);
});
