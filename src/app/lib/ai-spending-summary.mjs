export function describeSpendingCoverage(data) {
  const { summary, trackedSearches = 0, historicalSearches = 0 } = data;
  if (!summary.calls && !trackedSearches)
    return {
      state: historicalSearches ? "historical" : "empty",
      label: historicalSearches ? "Not recorded" : "No activity",
      message: historicalSearches
        ? `${historicalSearches.toLocaleString("en-US")} searches in this period predate token tracking. Their feature costs cannot be reconstructed. Reported project costs below can still cover this period.`
        : "No searches or API calls were recorded in this date range. Try a different range.",
    };
  if (summary.unknownCalls)
    return {
      state: "partial",
      label:
        Number(summary.calls) === Number(summary.unknownCalls)
          ? "Unavailable"
          : null,
      message: `${summary.unknownCalls} API calls lack returned usage or a supported price. Known subtotals exclude those calls; see the recording status in the breakdown.`,
    };
  return {
    state: "recorded",
    label: null,
    message: !summary.calls
      ? `${trackedSearches} tracked searches made no OpenAI calls. Their estimated API cost is $0; appointment availability and verified site facts can be answered without OpenAI.`
      : `${trackedSearches} tracked searches and ${summary.calls} recorded API calls in this period. ${historicalSearches} older searches are excluded from feature cost estimates.`,
  };
}

export function fillDailyDates(
  rows,
  from,
  to,
  metric = "total",
  zeroValue = 0,
) {
  if (!from || !to) return rows;
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const output = [];
  for (
    let time = Date.parse(from);
    time < Date.parse(to) && output.length < 366;
    time += 86400000
  ) {
    const date = new Date(time).toISOString().slice(0, 10);
    output.push(
      byDate.get(date) || {
        date,
        [metric]: zeroValue,
        answered: 0,
        failed: 0,
        clicked: 0,
      },
    );
  }
  return output;
}
