export function getSearchResultState(results = [], ai = {}) {
  const cards = (ai?.cards || []).filter((card) => card.type !== "appointment");
  const resultCount = new Set([...results.map((result) => result.href), ...cards.map((card) => card.href)].filter(Boolean)).size;
  const appointmentCount = ai?.appointmentOptions?.length || 0;
  return {
    resultCount,
    hasContent: resultCount > 0 || appointmentCount > 0 || Boolean(ai?.answer),
    summary: appointmentCount > 0
      ? `${appointmentCount} appointment time${appointmentCount === 1 ? "" : "s"} found`
      : resultCount > 0
        ? `${resultCount} result${resultCount === 1 ? "" : "s"} found`
        : ai?.answer ? "Answer available below" : "No results found",
  };
}
