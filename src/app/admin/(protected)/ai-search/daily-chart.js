"use client";
import { useId, useState } from "react";

const count = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const usd = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 7,
  }).format(value);

export default function DailyChart({
  rows = [],
  title,
  metric = "total",
  currency = false,
  metrics,
}) {
  const id = useId();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [windowSize, setWindowSize] = useState(null);
  const [windowAnchor, setWindowAnchor] = useState(0);
  const requestedIndex = Math.max(
    0,
    selectedDate
      ? rows.findIndex((row) => row.date === selectedDate)
      : rows.length - 1,
  );
  const size = Math.min(windowSize || rows.length, rows.length);
  const start = windowSize
    ? Math.max(
        0,
        Math.min(windowAnchor - Math.floor(size / 2), rows.length - size),
      )
    : 0;
  const index = Math.max(start, Math.min(requestedIndex, start + size - 1));
  const active = rows[index];
  const visible = rows.slice(start, start + size);
  const max = Math.max(
    ...visible.map((row) => Number(row[selectedMetric] || 0)),
    currency ? 0.000001 : 1,
  );
  const format = (value) =>
    value == null
      ? "Not available"
      : currency
        ? usd(Number(value))
        : count(Number(value));
  const label =
    metrics?.find((item) => item.key === selectedMetric)?.label ||
    (currency ? "USD" : "Searches");
  const x = (i) => 70 + (i / Math.max(visible.length - 1, 1)) * 660;
  const y = (value) => 184 - (Number(value) / max) * 146;
  // Unknown spending is a gap in the line, never a fabricated $0 point.
  const segments = [];
  let segment = [];
  visible.forEach((row, i) => {
    if (row[selectedMetric] == null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else segment.push(`${x(i)},${y(row[selectedMetric])}`);
  });
  if (segment.length) segments.push(segment);
  function inspectPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const value = (((event.clientX - rect.left) / rect.width) * 780 - 70) / 660;
    const target =
      visible[
        Math.max(
          0,
          Math.min(
            visible.length - 1,
            Math.round(value * (visible.length - 1)),
          ),
        )
      ];
    if (target) setSelectedDate(target.date);
  }
  function move(delta) {
    setSelectedDate(
      rows[Math.max(0, Math.min(rows.length - 1, index + delta))].date,
    );
  }
  return (
    <section className="admin-panel" aria-labelledby={`${id}-title`}>
      <div className="admin-panel-header">
        <h2 id={`${id}-title`}>{title}</h2>
        <span className="admin-pill">UTC</span>
      </div>
      {!rows.length ? (
        <p className="admin-empty">No recorded daily data for this period.</p>
      ) : (
        <div className="analytics-chart">
          <div className="analytics-chart-tools">
            {metrics ? (
              <label>
                Show{" "}
                <select
                  aria-label={`${title} metric`}
                  value={selectedMetric}
                  onChange={(event) => setSelectedMetric(event.target.value)}
                >
                  {metrics.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span>{currency ? "Daily USD" : label}</span>
            )}
            <div>
              <button
                type="button"
                className="builder-button secondary"
                disabled={size <= 7}
                onClick={() => {
                  setWindowAnchor(index);
                  setWindowSize(Math.max(7, Math.floor(size / 2)));
                }}
              >
                Zoom in
              </button>
              <button
                type="button"
                className="builder-button secondary"
                disabled={!windowSize}
                onClick={() => setWindowSize(null)}
              >
                Full range
              </button>
            </div>
          </div>
          <p
            className="analytics-chart-readout"
            aria-live="polite"
            aria-atomic="true"
          >
            <time dateTime={active.date}>{active.date} UTC</time>
            <strong>
              {format(active[selectedMetric])}{" "}
              {currency ? "" : label.toLowerCase()}
            </strong>
            {active.unknown ? (
              <span>Plus {active.unknown} calls with unavailable costs</span>
            ) : null}
          </p>
          <svg
            viewBox="0 0 780 230"
            aria-hidden="true"
            onPointerMove={inspectPointer}
            onPointerDown={inspectPointer}
            className="analytics-interactive-plot"
          >
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <path
                  d={`M70 ${y(max * fraction)}H730`}
                  stroke="#cedce4"
                  strokeDasharray={fraction ? "4 5" : undefined}
                />
                <text x="64" y={y(max * fraction) + 4} textAnchor="end">
                  {format(max * fraction)}
                </text>
              </g>
            ))}
            {segments.map((points, i) => (
              <polyline
                key={i}
                points={points.join(" ")}
                fill="none"
                stroke="#176e82"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            ))}
            <path
              d={`M${x(index - start)} 28V184`}
              stroke="#637383"
              strokeDasharray="4 4"
            />
            {active[selectedMetric] != null ? (
              <circle
                cx={x(index - start)}
                cy={y(active[selectedMetric])}
                r="6"
                fill="#176e82"
                stroke="white"
                strokeWidth="2"
              />
            ) : null}
            <text x="70" y="220">
              {visible[0].date}
            </text>
            <text x="730" y="220" textAnchor="end">
              {visible.at(-1).date}
            </text>
          </svg>
          <div className="analytics-chart-navigation">
            <button
              type="button"
              className="builder-button secondary"
              aria-label={`Previous day in ${title}`}
              disabled={index <= start}
              onClick={() => move(-1)}
            >
              Previous
            </button>
            <label htmlFor={`${id}-date`} className="sr-only">
              Inspect date in {title}
            </label>
            <input
              id={`${id}-date`}
              type="range"
              min={start}
              max={Math.max(start, start + size - 1)}
              value={index}
              aria-valuetext={`${active.date} UTC, ${format(active[selectedMetric])} ${label}`}
              onChange={(event) =>
                setSelectedDate(rows[Number(event.target.value)].date)
              }
            />
            <button
              type="button"
              className="builder-button secondary"
              aria-label={`Next day in ${title}`}
              disabled={index >= start + size - 1}
              onClick={() => move(1)}
            >
              Next
            </button>
          </div>
          <p className="analytics-footnote">
            Hover or touch the chart to inspect a date. Use the slider or arrow
            keys to move between days.
          </p>
          <details>
            <summary>View daily data</summary>
            <div className="analytics-table-scroll">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>{label}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>
                        {format(row[selectedMetric])}
                        {row.unknown ? " + unavailable costs" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
