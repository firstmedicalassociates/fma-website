"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getDepartmentLabel(department) {
  return department.name || `Department ${department.departmentid}`;
}

function getLocationText(department) {
  return [department.city, department.state].filter(Boolean).join(", ");
}

export default function AthenaTestClient({ configStatus }) {
  const [departments, setDepartments] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [practiceId, setPracticeId] = useState(configStatus.defaultPracticeId || "");
  const [endpoint, setEndpoint] = useState("");
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const isConfigured = configStatus.clientIdConfigured && configStatus.clientSecretConfigured;
  const statusClassName = useMemo(
    () => `status-message ${status === "error" ? "is-error" : ""}`,
    [status]
  );

  const loadDepartments = useCallback(async () => {
    if (!isConfigured || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setStatus("loading");
    setMessage("Loading Athena departments...");

    try {
      const response = await fetch("/api/admin/athena-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "departments" }),
      });

      const data = await response.json().catch(() => ({
        ok: false,
        error: "The server returned a non-JSON response.",
      }));

      if (!response.ok || !data.ok) {
        setDepartments([]);
        setStatus("error");
        setMessage(data.error || "Could not load Athena departments.");
        return;
      }

      const nextDepartments = Array.isArray(data.departments) ? data.departments : [];
      setDepartments(nextDepartments);
      setPracticeId(data.practiceId || configStatus.defaultPracticeId || "");
      setEndpoint(data.endpoint || "");
      setStatus("success");
      setMessage(`Loaded ${nextDepartments.length} Athena departments.`);
    } catch {
      setDepartments([]);
      setStatus("error");
      setMessage("Unable to reach the Athena test route.");
    } finally {
      isLoadingRef.current = false;
    }
  }, [configStatus.defaultPracticeId, isConfigured]);

  useEffect(() => {
    if (!isConfigured || hasLoadedRef.current) return undefined;

    hasLoadedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      loadDepartments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isConfigured, loadDepartments]);

  return (
    <div className="builder-shell athena-test-shell">
      <div className="athena-departments-header">
        <div>
          <span className="admin-kicker">Departments</span>
          <h2>All Athena departments</h2>
          <p>
            This uses the server-side Athena credentials and the configured Preview practice. No
            OAuth scope, practice ID, or endpoint path needs to be entered here.
          </p>
        </div>

        <button
          type="button"
          className="builder-button athena-refresh-button"
          onClick={loadDepartments}
          disabled={!isConfigured || status === "loading"}
        >
          {status === "loading" ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="athena-summary-row">
        <div className="athena-summary-item">
          <span>Practice ID</span>
          <strong>{practiceId || "Not set"}</strong>
        </div>
        <div className="athena-summary-item">
          <span>Endpoint</span>
          <strong>{endpoint || "Waiting to load"}</strong>
        </div>
        <div className="athena-summary-item">
          <span>Departments</span>
          <strong>{departments.length}</strong>
        </div>
      </div>

      {!isConfigured ? (
        <p className="status-message is-error">Set the Athena client ID and secret first.</p>
      ) : message ? (
        <p className={statusClassName}>{message}</p>
      ) : null}

      {status === "loading" && departments.length === 0 ? (
        <div className="athena-loading-panel">Loading departments...</div>
      ) : null}

      {status !== "loading" && departments.length === 0 && isConfigured ? (
        <div className="athena-loading-panel">No departments were returned by Athena.</div>
      ) : null}

      {departments.length > 0 ? (
        <div className="athena-department-grid">
          {departments.map((department) => (
            <article className="athena-department-card" key={department.departmentid}>
              <div>
                <span className="athena-department-id">ID {department.departmentid}</span>
                <h3>{getDepartmentLabel(department)}</h3>
              </div>
              <dl>
                <div>
                  <dt>Location</dt>
                  <dd>{getLocationText(department) || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{department.phone || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Timezone</dt>
                  <dd>{department.timezone || "Not listed"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
