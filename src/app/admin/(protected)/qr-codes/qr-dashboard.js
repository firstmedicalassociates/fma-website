"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, QrCode } from "../admin-icons";
import DailyChart from "../ai-search/daily-chart";
import styles from "./qr-dashboard.module.css";

const number = (value) =>
  value == null ? "Unavailable" : new Intl.NumberFormat("en-US").format(value);
const TABS = [
  { key: "codes", label: "QR codes" },
  { key: "comparison", label: "Comparison" },
];

function useRemote(url, refresh) {
  const key = `${url}:${refresh}`;
  const [state, setState] = useState({ key: "" });
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(data.error || "Unable to load QR analytics.");
        return data;
      })
      .then((data) => setState({ key, data }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ key, error: error.message });
      });
    return () => controller.abort();
  }, [url, key]);
  return state.key === key ? state : { loading: true };
}

function RemoteState({ state, retry, children }) {
  if (state.loading)
    return (
      <div className="admin-loading" role="status">
        <div className="admin-skeleton" />
        <p>Loading QR analytics…</p>
      </div>
    );
  if (state.error)
    return (
      <div className={styles.message}>
        <p className="admin-error-message" role="alert">
          {state.error}
        </p>
        <button
          type="button"
          className="builder-button secondary"
          onClick={retry}
        >
          Retry
        </button>
      </div>
    );
  return children;
}

function Stat({ label, value, detail }) {
  return (
    <article className="admin-stat-card">
      <h2 className="admin-stat-label">{label}</h2>
      <p className="admin-stat-value">{value}</p>
      <p className="admin-stat-copy">{detail}</p>
    </article>
  );
}

function Breakdown({ title, rows, error }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <h2>{title}</h2>
      </div>
      {error ? (
        <p className={styles.message}>{error}</p>
      ) : !rows?.length ? (
        <p className="admin-empty">No scans recorded for this period.</p>
      ) : (
        <ol className="analytics-breakdown">
          {[...rows]
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map((row, index) => (
              <li key={`${row.label}-${index}`}>
                <div>
                  <span>{row.label}</span>
                  <strong>{number(row.count)} scans</strong>
                </div>
              </li>
            ))}
        </ol>
      )}
    </section>
  );
}

function QrDetail({ code, params, refresh }) {
  const [retry, setRetry] = useState(0);
  const state = useRemote(
    `/api/admin/qr-codes?${params}&id=${code.id}`,
    `${refresh}:${retry}`,
  );
  const data = state.data;
  return (
    <div className={styles.detail}>
      <dl className="analytics-detail-grid">
        <div>
          <dt>QR code ID</dt>
          <dd>{code.id}</dd>
        </div>
        <div>
          <dt>Scan link</dt>
          <dd>
            {code.url ? (
              <a href={code.url} target="_blank" rel="noopener noreferrer">
                {code.url}
              </a>
            ) : (
              "Not available"
            )}
          </dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>
            {code.destination ? (
              <a
                href={code.destination}
                target="_blank"
                rel="noopener noreferrer"
              >
                {code.destination}
              </a>
            ) : (
              "Managed in Uniqode"
            )}
          </dd>
        </div>
      </dl>
      {!code.dynamic ? (
        <p className="admin-notice">
          This is a static QR code. Uniqode scan analytics are available for
          dynamic QR codes only.
        </p>
      ) : (
        <RemoteState state={state} retry={() => setRetry((value) => value + 1)}>
          {data ? (
            <>
              {Object.keys(data.errors || {}).length ? (
                <div className="admin-notice" role="status">
                  <p>
                    Some analytics are unavailable. Available results are shown
                    below.
                  </p>
                  <button
                    type="button"
                    className="builder-button secondary"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Retry unavailable analytics
                  </button>
                </div>
              ) : null}
              <div className={styles.detailStats}>
                <div>
                  <span>Total scans</span>
                  <strong>{number(data.scans)}</strong>
                  {data.errors?.scans ? (
                    <small>{data.errors.scans}</small>
                  ) : null}
                </div>
                <div>
                  <span>Unique scanners</span>
                  <strong>{number(data.uniqueScanners)}</strong>
                  <small>
                    {data.errors?.uniqueScanners ||
                      "Distinct scanners across the selected period"}
                  </small>
                </div>
              </div>
              {data.errors?.daily ? (
                <p className="admin-notice">
                  Daily activity: {data.errors.daily}
                </p>
              ) : (
                <DailyChart
                  rows={data.daily}
                  title="Daily scans"
                  metric="scans"
                  metrics={[{ key: "scans", label: "Scans" }]}
                />
              )}
              <div className="analytics-panel-grid">
                <Breakdown
                  title="Devices"
                  rows={data.devices}
                  error={data.errors?.devices}
                />
                <Breakdown
                  title="Top locations"
                  rows={data.locations}
                  error={data.errors?.locations}
                />
              </div>
            </>
          ) : null}
        </RemoteState>
      )}
    </div>
  );
}

function Comparison({ codes, error, inspect }) {
  const tracked = codes.filter((code) => code.dynamic);
  const max = Math.max(1, ...tracked.map((code) => code.scans || 0));
  const total = tracked.reduce((sum, code) => sum + (code.scans || 0), 0);
  const leaders = tracked.filter(
    (code) => code.scans > 0 && code.scans === tracked[0]?.scans,
  );
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>QR code performance</h2>
          <p className={styles.muted}>
            All dynamic QR codes, ranked by total scans in the selected period.
          </p>
        </div>
        <span className="admin-pill">{tracked.length} codes</span>
      </div>
      {error ? (
        <p className={`admin-error-message ${styles.message}`}>
          Comparison unavailable. {error}
        </p>
      ) : !tracked.length ? (
        <p className="admin-empty">
          No dynamic QR codes are available to compare.
        </p>
      ) : (
        <div className={styles.comparison}>
          <p className="admin-notice">
            {leaders.length === 1 ? (
              <>
                <strong>{leaders[0].name}</strong> leads with{" "}
                {number(leaders[0].scans)} scans (
                {((leaders[0].scans / total) * 100).toFixed(1)}% of all scans).
              </>
            ) : leaders.length > 1 ? (
              <>
                {leaders.length} QR codes are tied for first with{" "}
                {number(leaders[0].scans)} scans each.
              </>
            ) : (
              "No scans recorded in this period. Try a wider date range."
            )}
          </p>
          <figure className={styles.figure}>
            <figcaption>
              Total scans by QR code · select a code to view its analytics
            </figcaption>
            <ol className={styles.ranking}>
              {tracked.map((code, index) => (
                <li key={code.id}>
                  <button
                    type="button"
                    className={styles.rankButton}
                    onClick={() => inspect(code.id)}
                    aria-label={`View ${code.name}: ${number(code.scans)} scans`}
                  >
                    <span className={styles.rankNumber}>{index + 1}</span>
                    <span className={styles.rankContent}>
                      <span className={styles.rankLabel}>
                        <span>{code.name}</span>
                        <strong>{number(code.scans)}</strong>
                      </span>
                      <span className={styles.barTrack} aria-hidden="true">
                        <span
                          style={{ width: `${(code.scans / max) * 100}%` }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </figure>
          <p className="analytics-footnote">
            {codes.length - tracked.length
              ? `${codes.length - tracked.length} static QR code(s) are excluded because they do not report scans. `
              : ""}
            Rankings measure scans, not appointment bookings.
          </p>
        </div>
      )}
    </section>
  );
}

export default function QrDashboard({ initialRange }) {
  const [tab, setTab] = useState("codes");
  const [range, setRange] = useState(initialRange);
  const [draft, setDraft] = useState(initialRange);
  const [preset, setPreset] = useState("30");
  const [formError, setFormError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const focusCode = useRef(null);
  const params = new URLSearchParams(range).toString();
  const state = useRemote(`/api/admin/qr-codes?${params}`, refresh);
  const codes = state.data?.codes || [];
  const tracked = codes.filter((code) => code.dynamic);
  const scans = state.data?.analyticsError
    ? null
    : tracked.reduce((sum, code) => sum + (code.scans || 0), 0);
  const visible = codes.filter((code) =>
    `${code.name} ${code.id}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    if (tab === "codes" && focusCode.current) {
      document.getElementById(`qr-trigger-${focusCode.current}`)?.focus();
      focusCode.current = null;
    }
  }, [tab, openId]);

  function choosePreset(value) {
    setPreset(value);
    if (value === "custom") return;
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(
      Date.parse(`${to}T00:00:00Z`) - (Number(value) - 1) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    setDraft({ from, to });
  }
  function apply(event) {
    event.preventDefault();
    if (draft.from > draft.to) {
      setFormError("The start date must be on or before the end date.");
      return;
    }
    if ((Date.parse(draft.to) - Date.parse(draft.from)) / 86400000 >= 366) {
      setFormError("Choose a date range of 366 days or fewer.");
      return;
    }
    setFormError("");
    setRange({ ...draft });
    setRefresh((value) => value + 1);
  }
  function onTabKey(event, index) {
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft")
      next = (index + 1) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    if (next == null) return;
    event.preventDefault();
    setTab(TABS[next].key);
    document.getElementById(`qr-tab-${TABS[next].key}`)?.focus();
  }
  return (
    <div className={styles.dashboard}>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Campaign analytics</span>
          <h1 className="admin-title">QR Codes</h1>
          <p className="admin-subtitle">
            Track your Uniqode campaigns and see which QR codes get the most
            scans.
          </p>
        </div>
        <button
          type="button"
          className="builder-button secondary"
          disabled={state.loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </header>
      <form className="analytics-filters admin-panel" onSubmit={apply}>
        <label>
          Date range (UTC)
          <select
            value={preset}
            onChange={(event) => choosePreset(event.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            required
            value={draft.from}
            max={initialRange.to}
            aria-invalid={!!formError}
            aria-describedby={formError ? "qr-range-error" : undefined}
            onChange={(event) => {
              setPreset("custom");
              setDraft({ ...draft, from: event.target.value });
            }}
          />
        </label>
        <label>
          Through
          <input
            type="date"
            required
            value={draft.to}
            max={initialRange.to}
            aria-invalid={!!formError}
            aria-describedby={formError ? "qr-range-error" : undefined}
            onChange={(event) => {
              setPreset("custom");
              setDraft({ ...draft, to: event.target.value });
            }}
          />
        </label>
        <button className="builder-button" type="submit">
          Apply dates
        </button>
        {formError ? (
          <p
            id="qr-range-error"
            className={`admin-error-message ${styles.formError}`}
            role="alert"
          >
            {formError}
          </p>
        ) : null}
      </form>
      <p className="analytics-footnote">
        Showing {range.from} through {range.to} (UTC), including today’s
        activity where applicable. Anomalous scans are excluded. Results may be
        cached for up to one minute.
      </p>
      <div
        className="analytics-tabs"
        role="tablist"
        aria-label="QR code analytics views"
      >
        {TABS.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.key}
            id={`qr-tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`qr-panel-${item.key}`}
            tabIndex={tab === item.key ? 0 : -1}
            className={tab === item.key ? "is-active" : ""}
            onClick={() => setTab(item.key)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <RemoteState state={state} retry={() => setRefresh((value) => value + 1)}>
        {state.data ? (
          <>
            <div className={styles.stats}>
              <Stat
                label="QR codes"
                value={number(codes.length)}
                detail={`${tracked.length} dynamic · ${codes.length - tracked.length} static`}
              />
              <Stat
                label="Total scans"
                value={number(scans)}
                detail="Across your dynamic QR codes"
              />
              <Stat
                label="Codes scanned"
                value={
                  state.data.analyticsError
                    ? "Unavailable"
                    : number(tracked.filter((code) => code.scans > 0).length)
                }
                detail="At least one scan in this period"
              />
            </div>
            <div
              id="qr-panel-codes"
              role="tabpanel"
              aria-labelledby="qr-tab-codes"
              hidden={tab !== "codes"}
            >
              {tab === "codes" ? (
                <>
                  {state.data.analyticsError ? (
                    <p className="admin-error-message" role="alert">
                      QR codes loaded, but scan totals are unavailable.{" "}
                      {state.data.analyticsError}
                    </p>
                  ) : null}
                  <section className="admin-panel">
                    <div className={`admin-panel-header ${styles.listHeader}`}>
                      <div>
                        <h2>Your QR codes</h2>
                        <p className={styles.muted}>
                          Select a code to expand its analytics.
                        </p>
                      </div>
                      <label className={styles.search}>
                        Search QR codes
                        <input
                          type="search"
                          value={search}
                          placeholder="Name or ID"
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </label>
                    </div>
                    {!codes.length ? (
                      <p className="admin-empty">
                        No QR codes were found in your Uniqode organization.
                      </p>
                    ) : !visible.length ? (
                      <p className="admin-empty">
                        No QR codes match your search.
                      </p>
                    ) : (
                      <ul className={styles.codeList}>
                        {visible.map((code) => (
                          <li key={code.id}>
                            <h3 className={styles.rowHeading}>
                              <button
                                type="button"
                                id={`qr-trigger-${code.id}`}
                                className={styles.row}
                                aria-expanded={openId === code.id}
                                aria-controls={`qr-detail-${code.id}`}
                                onClick={() =>
                                  setOpenId(openId === code.id ? null : code.id)
                                }
                              >
                                <span className={styles.qrIcon}>
                                  <QrCode />
                                </span>
                                <span className={styles.identity}>
                                  <strong>{code.name}</strong>
                                  <span>
                                    {code.dynamic ? "Dynamic" : "Static"} ·{" "}
                                    {code.status} · ID {code.id}
                                  </span>
                                </span>
                                <span className={styles.scanCount}>
                                  <strong>
                                    {code.dynamic
                                      ? number(code.scans)
                                      : "Not tracked"}
                                  </strong>
                                  <span>
                                    {code.dynamic ? "scans" : "Static QR"}
                                  </span>
                                </span>
                                <ChevronDown
                                  aria-hidden="true"
                                  className={`${styles.chevron} ${openId === code.id ? styles.expanded : ""}`}
                                />
                              </button>
                            </h3>
                            <div
                              id={`qr-detail-${code.id}`}
                              role="region"
                              aria-labelledby={`qr-trigger-${code.id}`}
                              hidden={openId !== code.id}
                            >
                              {openId === code.id ? (
                                <QrDetail
                                  code={code}
                                  params={params}
                                  refresh={refresh}
                                />
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}
            </div>
            <div
              id="qr-panel-comparison"
              role="tabpanel"
              aria-labelledby="qr-tab-comparison"
              hidden={tab !== "comparison"}
            >
              {tab === "comparison" ? (
                <Comparison
                  codes={codes}
                  error={state.data.analyticsError}
                  inspect={(id) => {
                    focusCode.current = id;
                    setSearch("");
                    setOpenId(id);
                    setTab("codes");
                  }}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </RemoteState>
      <p className="analytics-footnote">
        Analytics availability and history depend on your Uniqode plan.
      </p>
    </div>
  );
}
