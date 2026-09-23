export const OFFICE_HOUR_DAYS = [
  { value: "Sunday", shortLabel: "Sun" },
  { value: "Monday", shortLabel: "Mon" },
  { value: "Tuesday", shortLabel: "Tue" },
  { value: "Wednesday", shortLabel: "Wed" },
  { value: "Thursday", shortLabel: "Thu" },
  { value: "Friday", shortLabel: "Fri" },
  { value: "Saturday", shortLabel: "Sat" },
];

export const HIDDEN_LOCATION_SLUGS = [];
export const VISIBLE_LOCATION_WHERE = {
  slug: {
    notIn: HIDDEN_LOCATION_SLUGS,
  },
};

export function withVisibleLocationWhere(where = {}) {
  const filters = [VISIBLE_LOCATION_WHERE];
  if (where && Object.keys(where).length > 0) {
    filters.push(where);
  }

  return filters.length === 1 ? VISIBLE_LOCATION_WHERE : { AND: filters };
}

export function isHiddenLocationSlug(value = "") {
  return HIDDEN_LOCATION_SLUGS.includes(normalizeLocationSlug(value));
}

const DAY_ALIASES = new Map([
  ["monday", "Monday"],
  ["mon", "Monday"],
  ["tuesday", "Tuesday"],
  ["tue", "Tuesday"],
  ["tues", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["wed", "Wednesday"],
  ["thursday", "Thursday"],
  ["thu", "Thursday"],
  ["thur", "Thursday"],
  ["thurs", "Thursday"],
  ["friday", "Friday"],
  ["fri", "Friday"],
  ["saturday", "Saturday"],
  ["sat", "Saturday"],
  ["sunday", "Sunday"],
  ["sun", "Sunday"],
]);

const OFFICE_HOUR_DISPLAY_DAYS = [
  { value: "Monday", shortLabel: "Mon", group: "weekday" },
  { value: "Tuesday", shortLabel: "Tue", group: "weekday" },
  { value: "Wednesday", shortLabel: "Wed", group: "weekday" },
  { value: "Thursday", shortLabel: "Thu", group: "weekday" },
  { value: "Friday", shortLabel: "Fri", group: "weekday" },
  { value: "Saturday", shortLabel: "Sat", group: "weekend" },
  { value: "Sunday", shortLabel: "Sun", group: "weekend" },
];

export const OFFICE_HOUR_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? 0 : 30;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    value,
    label: formatOfficeHourTime(value),
  };
});

function cleanText(value) {
  return String(value ?? "").trim();
}

export function normalizeStreetAddress(value = "") {
  return cleanText(value)
    .replace(/[,\s]*\b(?:suite|ste)\b\.?\s*#?\s*/gi, " Ste ")
    .replace(/[,\s]*#\s*(?=\d)/g, " Ste ")
    .replace(/\b(Dr|Rd|Ave|Ln|Blvd|Pkwy|Cir)\.(?=\s|$)/gi, "$1")
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/, "");
}

export function normalizeAddressState(value = "") {
  const state = cleanText(value);
  return { maryland: "MD", virginia: "VA", "district of columbia": "DC" }[state.toLowerCase()]
    || (state.length === 2 ? state.toUpperCase() : state);
}

export function buildStructuredAddress(parts = {}) {
  return buildDisplayAddress(parts).replace(/\n/g, ", ");
}

export function buildDisplayAddress(parts = {}) {
  const streetAddress = normalizeStreetAddress(parts.streetAddress);
  const city = cleanText(parts.addressCity);
  const state = normalizeAddressState(parts.addressState);
  const postalCode = cleanText(parts.postalCode);
  const cityStatePostal = [city, [state, postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return [streetAddress, cityStatePostal].filter(Boolean).join("\n");
}

export function resolveLocationAddressParts(location = {}) {
  const source = cleanText(location.displayAddress || location.address);
  // Work from the ZIP backwards so a comma or separate line before the suite
  // never gets mistaken for the city. Structured CMS values take precedence.
  const match = source.match(/^([\s\S]+)[,\n]\s*([^,\n]+),\s*([A-Za-z ]+)\s+(\d{5}(?:-\d{4})?)(?:[,\n]\s*(.+))?$/);
  const fallback = match ? {
    streetAddress: match[1], addressCity: match[2], addressState: match[3],
    postalCode: match[4], addressCountry: match[5],
  } : { streetAddress: source };
  return {
    streetAddress: normalizeStreetAddress(location.streetAddress || fallback.streetAddress),
    addressCity: cleanText(location.addressCity || fallback.addressCity),
    addressState: normalizeAddressState(location.addressState || fallback.addressState),
    postalCode: cleanText(location.postalCode || fallback.postalCode),
    addressCountry: cleanText(location.addressCountry || fallback.addressCountry),
  };
}

export function formatLocationAddress(location = {}) {
  return buildDisplayAddress(resolveLocationAddressParts(location));
}

export function buildPostalAddressSchema(location = {}) {
  const parts = resolveLocationAddressParts(location);
  const hasStructuredAddress = Object.values(parts).some(Boolean);

  if (!hasStructuredAddress) {
    return location.address || undefined;
  }

  return {
    "@type": "PostalAddress",
    streetAddress: parts.streetAddress || undefined,
    addressLocality: parts.addressCity || undefined,
    addressRegion: parts.addressState || undefined,
    postalCode: parts.postalCode || undefined,
    addressCountry: parts.addressCountry || undefined,
  };
}

export function splitLocationSlug(value = "") {
  return String(value || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function joinLocationSegments(segments = []) {
  const normalizedSegments = Array.isArray(segments)
    ? segments
        .map((segment) => String(segment || "").trim())
        .filter(Boolean)
    : [];

  return normalizedSegments.length > 0 ? `/${normalizedSegments.join("/")}` : "";
}

export function normalizeLocationSlug(value = "") {
  const segments = String(value)
    .split("/")
    .map((segment) =>
      String(segment)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean);

  return segments.length > 0 ? `/${segments.join("/")}` : "";
}

export function groupLocationServices(services = []) {
  const entries = Array.isArray(services) ? services : [];

  return entries.reduce((groups, service) => {
    if (!service?.title || !service?.description) {
      return groups;
    }

    const category = String(service.category || "General Care").trim() || "General Care";
    const existingGroup = groups.find((group) => group.category === category);

    if (existingGroup) {
      existingGroup.items.push(service);
      return groups;
    }

    groups.push({
      category,
      items: [service],
    });
    return groups;
  }, []);
}

export function formatLocationPathname(pathname = "") {
  const normalized = String(pathname || "").trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function normalizeOfficeHourDay(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");

  return DAY_ALIASES.get(key) || "";
}

export function normalizeOfficeHourTime(value) {
  const raw = String(value || "").trim();
  const timeMatch = raw.match(/^(\d{1,2}):([0-5]\d)$/);

  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);

    if (hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  const meridianMatch = raw.match(/^(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (!meridianMatch) return "";

  let hour = Number(meridianMatch[1]);
  const minute = Number(meridianMatch[2] || "00");
  const meridian = meridianMatch[3].toLowerCase();

  if (hour < 1 || hour > 12) return "";
  if (meridian.startsWith("p") && hour !== 12) hour += 12;
  if (meridian.startsWith("a") && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatOfficeHourTime(value) {
  const normalized = normalizeOfficeHourTime(value);
  if (!normalized) return "";

  const [hourValue, minuteValue] = normalized.split(":");
  const hour = Number(hourValue);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minuteValue} ${period}`;
}

function getDayIndex(day) {
  return OFFICE_HOUR_DAYS.findIndex((item) => item.value === day);
}

function expandOfficeHourDays(value) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return [];

  const rangeMatch = normalizedValue.match(/^(.+?)\s*(?:-|\u2013|to)\s*(.+)$/i);
  if (rangeMatch) {
    const startDay = normalizeOfficeHourDay(rangeMatch[1]);
    const endDay = normalizeOfficeHourDay(rangeMatch[2]);
    const startIndex = getDayIndex(startDay);
    const endIndex = getDayIndex(endDay);

    if (startIndex >= 0 && endIndex >= startIndex) {
      return OFFICE_HOUR_DAYS.slice(startIndex, endIndex + 1).map((day) => day.value);
    }
  }

  return normalizedValue
    .split(/[,/&]+/)
    .map((day) => normalizeOfficeHourDay(day))
    .filter(Boolean);
}

function parseOfficeHourLabel(value) {
  const label = String(value || "").trim();
  if (!label) return [];

  const closedMatch = label.match(/^(.+?):\s*closed$/i);
  if (closedMatch) {
    const days = expandOfficeHourDays(closedMatch[1]);
    return days.length > 0 ? days.map((day) => ({ day, closed: true })) : [{ label }];
  }

  const match = label.match(/^(.+?):\s*(.+?)\s*(?:-|\u2013|to)\s*(.+)$/i);
  if (!match) {
    return [{ label }];
  }

  const days = expandOfficeHourDays(match[1]);
  const startTime = normalizeOfficeHourTime(match[2]);
  const endTime = normalizeOfficeHourTime(match[3]);

  if (days.length === 0 || !startTime || !endTime) {
    return [{ label }];
  }

  return days.map((day) => ({
    day,
    startTime,
    endTime,
  }));
}

export function normalizeOfficeHours(values) {
  if (!Array.isArray(values)) return [];

  return values.flatMap((value) => {
    if (typeof value === "string") {
      return parseOfficeHourLabel(value);
    }

    if (!value || typeof value !== "object") return [];

    const day = normalizeOfficeHourDay(value.day);
    const startTime = normalizeOfficeHourTime(value.startTime);
    const endTime = normalizeOfficeHourTime(value.endTime);
    const closed = Boolean(value.closed);
    const label = String(value.label || "").trim();

    if (day && closed) {
      return [{ day, closed: true }];
    }

    if (day && startTime && endTime) {
      return [{ day, startTime, endTime }];
    }

    return label ? [{ label }] : [];
  });
}

export function formatOfficeHourRange(value) {
  if (typeof value === "string") return value.trim();

  const normalized = normalizeOfficeHours([value])[0];
  if (!normalized) return "";
  if (normalized.label) return normalized.label;
  if (normalized.closed) return `${normalized.day}: Closed`;

  return `${normalized.day}: ${formatOfficeHourTime(normalized.startTime)} - ${formatOfficeHourTime(
    normalized.endTime
  )}`;
}

export function formatOfficeHoursForDisplay(values) {
  return normalizeOfficeHours(values)
    .map((value) => formatOfficeHourRange(value))
    .filter(Boolean);
}

function formatOfficeHourValue(value) {
  if (!value) return "Hours unavailable";
  if (value.closed) return "Closed";

  const startTime = formatOfficeHourTime(value.startTime);
  const endTime = formatOfficeHourTime(value.endTime);
  return startTime && endTime ? `${startTime} - ${endTime}` : "Hours unavailable";
}

function formatOfficeHourDayRange(startDay, endDay) {
  if (startDay.value === endDay.value) return startDay.value;
  return `${startDay.shortLabel} - ${endDay.shortLabel}`;
}

function formatCustomOfficeHourLabel(value) {
  const label = String(value || "").trim();
  const separatorIndex = label.indexOf(":");

  if (separatorIndex <= 0) {
    return { label: "Hours", value: label };
  }

  return {
    label: label.slice(0, separatorIndex).trim(),
    value: label.slice(separatorIndex + 1).trim(),
  };
}

export function formatCondensedOfficeHoursForDisplay(values) {
  const normalized = normalizeOfficeHours(values);
  const hoursByDay = new Map(
    normalized.filter((value) => value.day).map((value) => [value.day, value])
  );
  const customRows = normalized
    .filter((value) => value.label)
    .map((value) => formatCustomOfficeHourLabel(value.label));

  if (hoursByDay.size === 0) {
    return customRows.length > 0
      ? customRows
      : [
          { label: "Mon - Fri", value: "Hours unavailable" },
          { label: "Saturday", value: "Hours unavailable" },
          { label: "Sunday", value: "Hours unavailable" },
        ];
  }

  const groupedRows = [];

  for (const day of OFFICE_HOUR_DISPLAY_DAYS) {
    const value = formatOfficeHourValue(hoursByDay.get(day.value));
    const previousRow = groupedRows.at(-1);
    const canJoinPrevious =
      day.group === "weekday" &&
      previousRow?.group === "weekday" &&
      previousRow.value === value;

    if (canJoinPrevious) {
      previousRow.endDay = day;
      continue;
    }

    groupedRows.push({
      startDay: day,
      endDay: day,
      group: day.group,
      value,
    });
  }

  return [
    ...groupedRows.map((row) => ({
      label: formatOfficeHourDayRange(row.startDay, row.endDay),
      value: row.value,
    })),
    ...customRows,
  ];
}

export function buildOpeningHoursSpecification(values) {
  return normalizeOfficeHours(values)
    .map((value) => {
      if (!value.day || !value.startTime || !value.endTime) return null;

      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${value.day}`,
        opens: value.startTime,
        closes: value.endTime,
      };
    })
    .filter(Boolean);
}
