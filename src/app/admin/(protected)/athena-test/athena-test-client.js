"use client";

import { useMemo, useState } from "react";

const DEFAULT_ENDPOINT_PATH = "departments?limit=1";

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatResult(result) {
  if (!result) {
    return "Run a token test, GET request, or provider availability lookup to see the Athena response here.";
  }

  return JSON.stringify(result, null, 2);
}

export default function AthenaTestClient({ configStatus }) {
  const [scope, setScope] = useState(configStatus.defaultScope || "");
  const [practiceId, setPracticeId] = useState(configStatus.defaultPracticeId || "");
  const [endpointPath, setEndpointPath] = useState(DEFAULT_ENDPOINT_PATH);
  const [departmentId, setDepartmentId] = useState(configStatus.defaultDepartmentId || "");
  const [providerId, setProviderId] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [startDate, setStartDate] = useState(() => toInputDate(new Date()));
  const [endDate, setEndDate] = useState(() => toInputDate(addDays(new Date(), 14)));
  const [limit, setLimit] = useState("25");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const isConfigured = configStatus.clientIdConfigured && configStatus.clientSecretConfigured;
  const statusClassName = useMemo(
    () => `status-message ${status === "error" ? "is-error" : ""}`,
    [status]
  );

  async function runAthenaTest(action) {
    if (!isConfigured || status === "loading") return;

    setStatus("loading");
    setMessage(
      action === "token"
        ? "Requesting Athena token..."
        : action === "providerAvailability"
          ? "Loading provider availability..."
          : "Running Athena GET request..."
    );
    setResult(null);

    try {
      const response = await fetch("/api/admin/athena-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          scope,
          practiceId,
          endpointPath,
          departmentId,
          providerId,
          appointmentTypeId,
          startDate,
          endDate,
          limit,
        }),
      });

      const data = await response.json().catch(() => ({
        ok: false,
        error: "The server returned a non-JSON response.",
      }));

      setResult(data);

      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Athena test failed.");
        return;
      }

      setStatus("success");
      setMessage(
        action === "token"
          ? "Token request succeeded."
          : action === "providerAvailability"
            ? "Provider availability lookup succeeded."
            : "Athena GET request succeeded."
      );
    } catch {
      setStatus("error");
      setMessage("Unable to reach the Athena test route.");
    }
  }

  return (
    <div className="builder-shell athena-test-shell">
      <div className="athena-warning">
        This page is for connection testing. Access tokens are requested server-side and removed from
        the response before the result is displayed.
      </div>

      <div className="athena-test-grid">
        <div className="builder-field">
          <label htmlFor="athena-scope">Scope</label>
          <input
            id="athena-scope"
            className="builder-input"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            placeholder={configStatus.defaultScope || "Required Athena OAuth scope"}
            autoComplete="off"
          />
        </div>

        <div className="builder-field">
          <label htmlFor="athena-practice-id">Practice ID</label>
          <input
            id="athena-practice-id"
            className="builder-input"
            value={practiceId}
            onChange={(event) => setPracticeId(event.target.value)}
            placeholder="Required for paths like departments"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="athena-provider-panel">
        <div className="athena-provider-heading">
          <span className="admin-kicker">Provider availability</span>
          <p>
            Pull provider details, departments, appointment types, and open appointment slots
            together.
          </p>
        </div>

        <div className="athena-filter-grid">
          <div className="builder-field">
            <label htmlFor="athena-department-id">Department ID</label>
            <input
              id="athena-department-id"
              className="builder-input"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              placeholder="Required for open slots"
              autoComplete="off"
            />
          </div>

          <div className="builder-field">
            <label htmlFor="athena-provider-id">Provider ID</label>
            <input
              id="athena-provider-id"
              className="builder-input"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>

          <div className="builder-field">
            <label htmlFor="athena-appointment-type-id">Appointment Type ID</label>
            <input
              id="athena-appointment-type-id"
              className="builder-input"
              value={appointmentTypeId}
              onChange={(event) => setAppointmentTypeId(event.target.value)}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>

          <div className="builder-field">
            <label htmlFor="athena-availability-limit">Result limit</label>
            <input
              id="athena-availability-limit"
              className="builder-input"
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>

          <div className="builder-field">
            <label htmlFor="athena-start-date">Start date</label>
            <input
              id="athena-start-date"
              className="builder-input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="builder-field">
            <label htmlFor="athena-end-date">End date</label>
            <input
              id="athena-end-date"
              className="builder-input"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="builder-field">
        <label htmlFor="athena-endpoint-path">GET endpoint path</label>
        <input
          id="athena-endpoint-path"
          className="builder-input"
          value={endpointPath}
          onChange={(event) => setEndpointPath(event.target.value)}
          placeholder={DEFAULT_ENDPOINT_PATH}
          autoComplete="off"
        />
      </div>

      <div className="athena-test-actions">
        <button
          type="button"
          className="builder-button"
          onClick={() => runAthenaTest("token")}
          disabled={!isConfigured || status === "loading"}
        >
          Test token
        </button>
        <button
          type="button"
          className="builder-button secondary"
          onClick={() => runAthenaTest("providerAvailability")}
          disabled={!isConfigured || status === "loading"}
        >
          Load availability
        </button>
        <button
          type="button"
          className="builder-button secondary"
          onClick={() => runAthenaTest("get")}
          disabled={!isConfigured || status === "loading"}
        >
          Run GET
        </button>
        {!isConfigured ? (
          <p className="status-message is-error">Set the Athena client ID and secret first.</p>
        ) : message ? (
          <p className={statusClassName}>{message}</p>
        ) : null}
      </div>

      <pre className="athena-result">{formatResult(result)}</pre>
    </div>
  );
}
