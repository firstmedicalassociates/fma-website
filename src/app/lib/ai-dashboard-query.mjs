const DAY = 86400000;
export const PAGE_SIZE = 25;
export function parseAnalyticsQuery(params, now = new Date()) {
  const get = (key) => params.get(key) || "";
  const preset = ["7", "30", "90"].includes(get("range"))
    ? Number(get("range"))
    : 30;
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new Error("Use YYYY-MM-DD dates.");
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    )
      throw new Error("Choose a valid date.");
    return parsed;
  }
  const endDay = get("to") ? date(get("to")) : today;
  const from = get("from")
    ? date(get("from"))
    : new Date(endDay.getTime() - (preset - 1) * DAY);
  const to = new Date(endDay.getTime() + DAY);
  if (from >= to || to - from > 366 * DAY || endDay > today)
    throw new Error(
      "Choose an ordered date range of up to one year ending today or earlier.",
    );
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(get("page"), 10) || 1),
  );
  const fields = [
    "status",
    "intent",
    "surface",
    "searchRoute",
    "modelVersion",
    "code",
    "feedbackRating",
    "feedbackReviewStatus",
  ];
  const filters = {};
  for (const field of fields) {
    const value = get(field);
    if (value) {
      if (!/^[\w.:-]{1,100}$/.test(value))
        throw new Error("Invalid analytics filter.");
      filters[field] = value;
    }
  }
  return { from: from.toISOString(), to: to.toISOString(), page, filters };
}
export function eventWhere(query) {
  return {
    createdAt: { gte: new Date(query.from), lt: new Date(query.to) },
    ...query.filters,
  };
}
export function percent(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : null;
}
