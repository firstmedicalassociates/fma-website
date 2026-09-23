import { compactSearchText } from "./ai-search-vocabulary.js";

// A city name inside a more specific office name must not broaden the match.
// Separate mentions ("Bowie II and Bowie") still retain both matches.
export function matchSpecificAliases(query, aliasIndex) {
  const compactQuery = compactSearchText(query);
  const spans = [];
  for (const [alias, values] of aliasIndex) {
    if (alias.length < 3) continue;
    let start = compactQuery.indexOf(alias);
    while (start !== -1) {
      spans.push({ start, end: start + alias.length, values });
      start = compactQuery.indexOf(alias, start + 1);
    }
  }
  const specific = spans.filter((span) => !spans.some((other) =>
    other.start <= span.start && other.end >= span.end && other.end - other.start > span.end - span.start
  ));
  return [...new Map(specific.flatMap((span) => span.values).map((value) => [value.id || value.departmentid || value.slug || value.name, value])).values()];
}
