"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { percent } from "../../../lib/ai-dashboard-query.mjs";
const number = (value) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
        value,
      );
const money = (value) =>
  value == null
    ? "Unknown"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 5,
      }).format(value);
const pretty = (value) => String(value || "unknown").replace(/_/g, " ");
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " UTC"
    : "—";
const rate = (a, b) => (percent(a, b) == null ? "—" : `${percent(a, b)}%`);
function useRemote(url, refresh = 0) {
  const key = `${url}:${refresh}`;
  const [state, setState] = useState({
    key: "",
    loading: true,
    data: null,
    error: "",
  });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || "Unable to load this section.");
        return data;
      })
      .then((data) =>
        setState({ key: `${url}:${refresh}`, loading: false, data, error: "" }),
      )
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({
            key: `${url}:${refresh}`,
            loading: false,
            data: null,
            error: error.message,
          });
      });
    return () => controller.abort();
  }, [url, refresh]);
  return state.key === key ? state : { loading: true, data: null, error: "" };
}
function RemoteState({ state, retry, children }) {
  if (state.loading)
    return (
      <section className="admin-panel admin-loading" role="status">
        <div className="admin-skeleton" />
        <div className="admin-skeleton" />
        <p>Loading this section…</p>
      </section>
    );
  if (state.error)
    return (
      <section className="admin-panel admin-account-editor">
        <p className="admin-error-message" role="alert">
          {state.error}
        </p>
        <button className="builder-button secondary" onClick={retry}>
          Retry
        </button>
      </section>
    );
  return children;
}
function Stat({ label, value, detail }) {
  return (
    <article className="admin-stat-card">
      <h2 className="admin-stat-label">{label}</h2>
      <p className="admin-stat-value">{value}</p>
      {detail ? <p className="admin-stat-copy">{detail}</p> : null}
    </article>
  );
}
function Breakdown({ title, rows = [] }) {
  const max = Math.max(...rows.map((row) => Number(row.count)), 1);
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <h2>{title}</h2>
      </div>
      {rows.length ? (
        <ol className="analytics-breakdown">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`}>
              <div>
                <span>
                  {pretty(row.label)}
                  {row.type ? ` · ${pretty(row.type)}` : ""}
                </span>
                <strong>{number(row.count)}</strong>
              </div>
              <div className="analytics-bar-track" aria-hidden="true">
                <span
                  style={{ width: `${(Number(row.count) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-empty">No data for this period.</p>
      )}
    </section>
  );
}
function DailyChart({ rows = [], title, metric = "total", currency = false }) {
  if (!rows.length)
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>{title}</h2>
        </div>
        <p className="admin-empty">No data for this period.</p>
      </section>
    );
  const max = Math.max(...rows.map((row) => Number(row[metric] || 0)), 1);
  const x = (index) => 48 + (index / Math.max(rows.length - 1, 1)) * 690;
  const points = rows
    .map(
      (row, index) =>
        `${x(index)},${170 - (Number(row[metric] || 0) / max) * 140}`,
    )
    .join(" ");
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <h2>{title}</h2>
        <span className="admin-pill">UTC</span>
      </div>
      <div className="analytics-chart">
        <svg
          viewBox="0 0 780 210"
          role="img"
          aria-label={`${title}. ${rows.length} days; data table follows.`}
        >
          <path d="M48 28V170H740" fill="none" stroke="#cedce4" />
          <text x="4" y="32">
            {currency ? money(max) : number(max)}
          </text>
          <text x="24" y="173">
            0
          </text>
          <polyline
            points={points}
            fill="none"
            stroke="#176e82"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {rows.length === 1 ? (
            <circle
              cx={x(0)}
              cy={170 - (Number(rows[0][metric] || 0) / max) * 140}
              r="4"
              fill="#176e82"
            />
          ) : null}
          <text x="48" y="201">
            {rows[0].date}
          </text>
          <text x="738" y="201" textAnchor="end">
            {rows.at(-1).date}
          </text>
        </svg>
        <details>
          <summary>View daily data</summary>
          <div className="analytics-table-scroll">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Date (UTC)</th>
                  <th>{currency ? "Estimated USD" : "Searches"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>
                      {currency ? money(row[metric]) : number(row[metric])}
                      {row.unknown ? " + unknown usage" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
function Overview({ data }) {
  const s = data.summary;
  return (
    <>
      <div className="admin-stat-stack ai-search-stat-grid">
        <Stat
          label="AI searches"
          value={number(s.total)}
          detail="All recorded requests"
        />
        <Stat
          label="Answer rate"
          value={rate(s.answered, s.total)}
          detail={`${number(s.answered)} answered`}
        />
        <Stat
          label="Average response"
          value={
            s.avgLatencyMs == null ? "—" : `${number(s.avgLatencyMs / 1000)}s`
          }
        />
        <Stat
          label="p95 response"
          value={
            s.p95LatencyMs == null ? "—" : `${number(s.p95LatencyMs / 1000)}s`
          }
          detail="95% of timed requests finished within this time"
        />
        <Stat
          label="Helpful feedback"
          value={rate(s.helpful, s.helpful + s.notHelpful)}
          detail={`${number(s.helpful + s.notHelpful)} ratings`}
        />
        <Stat
          label="Result click rate"
          value={rate(s.clicked, s.tracked)}
          detail={`${number(s.clicked)} of ${number(s.tracked)} tracked searches`}
        />
        <Stat
          label="Booking click rate"
          value={rate(s.bookingClicked, s.bookingEligible)}
          detail={`${number(s.bookingClicked)} of ${number(s.bookingEligible)} searches with booking links`}
        />
        <Stat
          label="Grounded answers"
          value={rate(s.grounded, s.answered)}
          detail="Automated evidence signal"
        />
      </div>
      <DailyChart rows={data.daily} title="Daily searches" />
      <div className="analytics-panel-grid">
        <Breakdown
          title="Search outcomes"
          rows={[
            { label: "answered", count: s.answered },
            { label: "degraded", count: s.degraded },
            { label: "no_results", count: s.noResults },
            { label: "blocked", count: s.blocked },
            { label: "failed", count: s.failed },
          ]}
        />
        <Breakdown title="Top intents" rows={data.intents} />
        <Breakdown title="Entry points" rows={data.surfaces} />
        <Breakdown title="Search routes" rows={data.routes} />
        <Breakdown
          title="Models and deterministic answers"
          rows={data.models}
        />
        <Breakdown title="Errors and blocks" rows={data.codes} />
        <Breakdown title="Answer confidence" rows={data.confidence} />
        <Breakdown title="Appointment availability" rows={data.availability} />
        <Breakdown title="Frequently returned sources" rows={data.sources} />
        <Breakdown
          title="Clicked providers, locations, and links"
          rows={data.clicks}
        />
      </div>
      <p className="analytics-footnote">
        {number(s.providerMisses)} provider-resolution misses. Updated{" "}
        {dateTime(data.generatedAt)}. Summaries are cached for 60 seconds. Click
        rates cover searches recorded after click tracking began. Booking clicks
        are handoffs, not completed appointments.
      </p>
    </>
  );
}
function EventDetail({ id, close }) {
  const [refresh, setRefresh] = useState(0);
  const state = useRemote(
    `/api/admin/ai-search/analytics?eventId=${encodeURIComponent(id)}`,
    refresh,
  );
  const event = state.data?.event;
  return (
    <section
      className="admin-panel admin-account-editor"
      aria-label="Event details"
    >
      <div className="analytics-heading">
        <h2>Search details</h2>
        <button className="builder-button secondary" onClick={close}>
          Close details
        </button>
      </div>
      <RemoteState state={state} retry={() => setRefresh(refresh + 1)}>
        {event ? (
          <>
            <dl className="analytics-detail-grid">
              {[
                ["Event", event.id],
                ["Created", dateTime(event.createdAt)],
                ["Outcome", pretty(event.status)],
                ["Intent", pretty(event.intent)],
                ["Entry point", pretty(event.surface)],
                [
                  "Response time",
                  event.latencyMs == null ? "Unknown" : `${event.latencyMs} ms`,
                ],
                ["Code", event.code || "None"],
                ["Route", event.searchRoute],
                ["Model", event.modelVersion],
                ["Prompt version", event.promptVersion],
                ["Knowledge version", event.knowledgeVersion],
                [
                  "Sources / results / appointments",
                  `${event.sourceCount} / ${event.resultCount} / ${event.appointmentOptionCount}`,
                ],
                ["Evidence score", event.retrievalScore],
                ["Feedback", event.feedbackRating],
                ["Review", event.feedbackReviewStatus],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? "Unknown"}</dd>
                </div>
              ))}
            </dl>
            <h3>Source references</h3>
            <ul>
              {event.sourceRefs.map((ref) => (
                <li className="analytics-reference" key={ref}>
                  {ref}
                </li>
              ))}
            </ul>
            {event.feedbackQuerySnapshot ? (
              <>
                <h3>Screened feedback evidence</h3>
                <p>{event.feedbackQuerySnapshot}</p>
                <p className="analytics-evidence">
                  {event.feedbackAnswerSnapshot}
                </p>
              </>
            ) : (
              <p className="analytics-footnote">
                Raw search text is not stored. Screened evidence is available
                only for eligible negative feedback.
              </p>
            )}
            {event.apiUsage ? (
              <>
                <h3>Recorded API usage</h3>
                {event.telemetryVersion == null ? (
                  <p>Token usage was not recorded for this historical event.</p>
                ) : event.apiUsage.length === 0 ? (
                  <p>No OpenAI calls recorded — $0 estimated cost.</p>
                ) : (
                  <ul>
                    {event.apiUsage.map((usage, i) => (
                      <li key={i}>
                        {usage.model} · {usage.operation} ·{" "}
                        {number(usage.inputTokens)} input /{" "}
                        {number(usage.outputTokens)} output tokens ·{" "}
                        {money(usage.estimatedCostUsd)}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
            <h3>Result interactions</h3>
            {event.interactions.length ? (
              <ul>
                {event.interactions.map((click, i) => (
                  <li className="analytics-reference" key={i}>
                    {pretty(click.type)} · {click.targetRef} ·{" "}
                    {dateTime(click.createdAt)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recorded clicks.</p>
            )}
            {event.feedbackRating ? (
              <Link
                className="builder-button secondary"
                href={`/admin/ai-search/feedback/${event.id}`}
              >
                Open feedback case
              </Link>
            ) : null}
          </>
        ) : null}
      </RemoteState>
    </section>
  );
}
function Activity({ data, feedback, onPage, onInspect }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <h2>{feedback ? "Feedback cases" : "Search activity"}</h2>
        <span className="admin-pill">{number(data.total)} events</span>
      </div>
      {data.rows.length ? (
        <div className="analytics-table-scroll">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>When (UTC)</th>
                <th>Intent / entry point</th>
                <th>Outcome</th>
                <th>{feedback ? "Feedback / review" : "Response time"}</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((event) => (
                <tr key={event.id}>
                  <td>
                    {dateTime(
                      feedback ? event.feedbackCreatedAt : event.createdAt,
                    ).replace(" UTC", "")}
                  </td>
                  <td>
                    {pretty(event.intent)}
                    <small>{pretty(event.surface)}</small>
                  </td>
                  <td>
                    <span className="admin-pill">{pretty(event.status)}</span>
                    {event.code ? <small>{pretty(event.code)}</small> : null}
                  </td>
                  <td>
                    {feedback ? (
                      <>
                        {pretty(event.feedbackRating)}
                        <small>
                          {pretty(event.feedbackReviewStatus || "pending")}
                          {event.evalCase?.isActive
                            ? " · Active evaluation"
                            : ""}
                        </small>
                      </>
                    ) : event.latencyMs == null ? (
                      "—"
                    ) : (
                      `${number(event.latencyMs / 1000)}s`
                    )}
                  </td>
                  <td>
                    <button
                      className="builder-button secondary"
                      onClick={() => onInspect(event.id)}
                    >
                      Inspect
                    </button>
                    {feedback ? (
                      <Link
                        className="analytics-text-link"
                        href={`/admin/ai-search/feedback/${event.id}`}
                      >
                        Review case
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-empty">No events match these filters.</p>
      )}
      <div className="analytics-pagination">
        <button
          className="builder-button secondary"
          disabled={data.page <= 1}
          onClick={() => onPage(data.page - 1)}
        >
          Previous
        </button>
        <span>
          Page {data.page} of{" "}
          {Math.max(1, Math.ceil(data.total / data.pageSize))}
        </span>
        <button
          className="builder-button secondary"
          disabled={data.page * data.pageSize >= data.total}
          onClick={() => onPage(data.page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
function ReportedSpending({ query, refresh }) {
  const state = useRemote(
    `/api/admin/ai-search/spending?${query}&reported=1`,
    refresh,
  );
  const data = state.data;
  return (
    <section className="admin-panel admin-account-editor">
      <h2>OpenAI reported project costs</h2>
      <p className="analytics-footnote">
        Project totals may include other applications and can arrive later than
        local estimates. These totals are not added to estimated search
        spending.
      </p>
      {state.loading ? (
        <p role="status">Loading OpenAI cost report…</p>
      ) : state.error ? (
        <p className="admin-error-message">{state.error}</p>
      ) : !data?.configured ? (
        <p className="admin-notice">
          Project cost reporting is not connected. Configure OPENAI_ADMIN_KEY
          and OPENAI_PROJECT_ID on the server to enable it.
        </p>
      ) : (
        <>
          {data.available ? (
            <>
              <p className="analytics-cost-total">{money(data.total)}</p>
              <p className="analytics-footnote">
                Project {data.projectId} · Updated {dateTime(data.refreshedAt)}
                {data.stale
                  ? " · Showing the last successful report"
                  : " · Cached for up to one hour"}
              </p>
            </>
          ) : null}
          {data.error ? (
            <p className="admin-error-message">{data.error}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
function Spending({ query, refresh }) {
  const state = useRemote(`/api/admin/ai-search/spending?${query}`, refresh);
  const data = state.data;
  return (
    <>
      <RemoteState state={state} retry={() => window.location.reload()}>
        {data ? (
          <>
            <div className="admin-stat-stack ai-search-stat-grid">
              <Stat
                label="Estimated API spending"
                value={money(
                  !data.trackedSearches &&
                    !data.summary.calls &&
                    data.historicalSearches
                    ? null
                    : data.summary.knownCost,
                )}
                detail={
                  data.summary.unknownCalls
                    ? `Known subtotal; ${data.summary.unknownCalls} calls have unknown cost`
                    : "Recorded usage across all operations; historical usage excluded"
                }
              />
              <Stat
                label="Cost per search"
                value={
                  data.trackedSearches
                    ? money(
                        Number(data.summary.searchCost) / data.trackedSearches,
                      )
                    : "—"
                }
                detail="Known search cost / tracked searches"
              />
              <Stat
                label="Input / cached tokens"
                value={`${number(data.summary.inputTokens)} / ${number(data.summary.cachedInputTokens)}`}
              />
              <Stat
                label="Output tokens"
                value={number(data.summary.outputTokens)}
                detail={`${number(data.summary.calls)} API calls`}
              />
            </div>
            <DailyChart
              rows={data.daily}
              title="Daily estimated API spending"
              metric="cost"
              currency
            />
            <section className="admin-panel">
              <div className="admin-panel-header">
                <h2>Spending by operation and model</h2>
              </div>
              <div className="analytics-table-scroll">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Purpose</th>
                      <th>Operation / model</th>
                      <th>Calls</th>
                      <th>Estimated USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((row, i) => (
                      <tr key={i}>
                        <td>{pretty(row.purpose)}</td>
                        <td>
                          {pretty(row.operation)}
                          <small>{row.model}</small>
                        </td>
                        <td>{number(row.calls)}</td>
                        <td>
                          {money(row.cost)}
                          {row.unknown ? (
                            <small>{row.unknown} calls with unknown cost</small>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.breakdown.length ? (
                <p className="admin-empty">
                  No API usage has been recorded for this period.
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </RemoteState>
      <ReportedSpending query={query} refresh={refresh} />
      <p className="analytics-footnote">
        Estimates use versioned standard model rates. Historical token usage
        cannot be reconstructed. Missing usage, retries without returned usage,
        and unknown model rates may make estimates lower than reported project
        costs. Date filters apply to API calls; activity filters do not restrict
        spending.
      </p>
    </>
  );
}
function Diagnostics() {
  const [state, setState] = useState({ running: false, error: "", data: null });
  async function run() {
    setState({ running: true, error: "", data: null });
    try {
      const response = await fetch("/api/admin/ai-search/diagnostics", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "The diagnostic check could not complete.",
        );
      setState({ running: false, error: "", data });
    } catch (error) {
      setState({ running: false, error: error.message, data: null });
    }
  }
  return (
    <section className="admin-panel admin-account-editor">
      <h2>Provider and scheduling diagnostics</h2>
      <p className="analytics-footnote">
        Check active provider mappings, online appointment slots, and missing
        profile data. This live check may take several minutes and runs only
        when requested.
      </p>
      <button className="builder-button" disabled={state.running} onClick={run}>
        {state.running ? "Checking providers…" : "Run live diagnostic check"}
      </button>
      {state.running ? (
        <p role="status">
          The check is running. Other analytics tabs remain available.
        </p>
      ) : null}
      {state.error ? (
        <p className="admin-error-message" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.data ? (
        <>
          <p className="analytics-footnote">
            Checked {dateTime(state.data.checkedAt)}
          </p>
          <h3>Athena mappings</h3>
          {!state.data.coverage.available ? (
            <p className="admin-notice">
              {state.data.coverage.error || "Athena coverage is unavailable."}
            </p>
          ) : (
            <div className="analytics-table-scroll">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Mapping</th>
                    <th>Slots</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.coverage.rows.map((row) => (
                    <tr key={row.slug}>
                      <td>{row.name}</td>
                      <td>{pretty(row.status)}</td>
                      <td>{pretty(row.slotStatus)}</td>
                      <td>{row.warnings.join(" · ") || "No warnings"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3>Provider data gaps</h3>
          {state.data.gaps.length ? (
            <ul>
              {state.data.gaps.map((row) => (
                <li key={row.name}>
                  {row.name}: {row.gaps.join(" · ")}
                </li>
              ))}
            </ul>
          ) : (
            <p>No missing profile fields detected.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
export default function AnalyticsDashboard({ showSpending, showDiagnostics }) {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("30");
  const [params, setParams] = useState("range=30");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState("");
  const tabs = [
    "overview",
    "activity",
    "feedback",
    ...(showSpending ? ["spending"] : []),
    ...(showDiagnostics ? ["diagnostics"] : []),
  ];
  const dataUrl = ["overview", "activity", "feedback"].includes(tab)
    ? `/api/admin/ai-search/analytics?${params}&section=${tab}&page=${page}`
    : null;
  const state = useRemote(dataUrl, refresh);
  function apply(event) {
    event.preventDefault();
    const values = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget))
      if (value && !(range !== "custom" && ["from", "to"].includes(key)))
        values.set(key, value);
    setParams(values.toString());
    setPage(1);
    setDetail("");
  }
  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Search intelligence</span>
          <h1 className="admin-title">AI Search</h1>
          <p className="admin-subtitle">
            Understand search quality, patient engagement, and API spending.
          </p>
        </div>
        <button
          className="builder-button secondary"
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </header>
      <nav className="analytics-tabs" aria-label="AI Search sections">
        {tabs.map((name) => (
          <button
            key={name}
            className={tab === name ? "is-active" : ""}
            aria-current={tab === name ? "page" : undefined}
            onClick={() => {
              setTab(name);
              setPage(1);
              setDetail("");
            }}
          >
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </nav>
      {tab !== "diagnostics" ? (
        <form className="analytics-filters admin-panel" onSubmit={apply}>
          <label>
            Date range (UTC)
            <select
              name="range"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {range === "custom" ? (
            <>
              <label>
                From
                <input name="from" type="date" required />
              </label>
              <label>
                Through
                <input
                  name="to"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                />
              </label>
            </>
          ) : null}
          {tab !== "spending" ? (
            <>
              <label>
                Outcome
                <select name="status">
                  <option value="">All outcomes</option>
                  {[
                    "answered",
                    "degraded",
                    "no_results",
                    "blocked",
                    "failed",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Entry point
                <select name="surface">
                  <option value="">All entry points</option>
                  {[
                    "home_hero",
                    "search_modal",
                    "search_page",
                    "api_search",
                    "api_ai_search",
                  ].map((value) => (
                    <option key={value} value={value}>
                      {pretty(value)}
                    </option>
                  ))}
                </select>
              </label>
              <details className="analytics-more-filters">
                <summary>More filters</summary>
                <div>
                  {[
                    ["intent", "Intent"],
                    ["code", "Error code"],
                    ["searchRoute", "Search route"],
                    ["modelVersion", "Model"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input name={key} placeholder="All" maxLength={100} />
                    </label>
                  ))}
                  <label>
                    Feedback
                    <select name="feedbackRating">
                      <option value="">All ratings</option>
                      <option value="helpful">Helpful</option>
                      <option value="not_helpful">Not helpful</option>
                    </select>
                  </label>
                  <label>
                    Review status
                    <select name="feedbackReviewStatus">
                      <option value="">All statuses</option>
                      {["pending", "in_review", "resolved", "dismissed"].map(
                        (value) => (
                          <option key={value} value={value}>
                            {pretty(value)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </details>
            </>
          ) : null}
          <button className="builder-button" type="submit">
            Apply filters
          </button>
        </form>
      ) : null}
      {detail ? <EventDetail id={detail} close={() => setDetail("")} /> : null}
      {["overview", "activity", "feedback"].includes(tab) ? (
        <RemoteState state={state} retry={() => setRefresh(refresh + 1)}>
          {state.data ? (
            tab === "overview" ? (
              <Overview data={state.data} />
            ) : (
              <Activity
                data={state.data}
                feedback={tab === "feedback"}
                onPage={setPage}
                onInspect={setDetail}
              />
            )
          ) : null}
        </RemoteState>
      ) : tab === "spending" ? (
        <Spending query={params} refresh={refresh} />
      ) : (
        <Diagnostics />
      )}
    </>
  );
}
