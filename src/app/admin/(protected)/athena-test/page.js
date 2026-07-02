import AthenaTestClient from "./athena-test-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ATHENA_BASE_URL = "https://api.platform.athenahealth.com";
const TOKEN_PATH = "/oauth2/v1/token";

function isConfigured(value) {
  return Boolean(String(value || "").trim());
}

export default function AthenaTestPage() {
  const baseUrl = process.env.ATHENA_BASE_URL || DEFAULT_ATHENA_BASE_URL;
  const tokenUrl = process.env.ATHENA_TOKEN_URL || `${baseUrl.replace(/\/+$/, "")}${TOKEN_PATH}`;
  const configStatus = {
    clientIdConfigured: isConfigured(process.env.ATHENA_CLIENT_ID),
    clientSecretConfigured: isConfigured(process.env.ATHENA_CLIENT_SECRET),
    baseUrl,
    tokenUrl,
    defaultScope: process.env.ATHENA_DEFAULT_SCOPE || "",
    defaultPracticeId: process.env.ATHENA_DEFAULT_PRACTICE_ID || "",
    defaultDepartmentId: process.env.ATHENA_DEFAULT_DEPARTMENT_ID || "",
  };
  const isReady = configStatus.clientIdConfigured && configStatus.clientSecretConfigured;

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Athena API</span>
          <h1 className="admin-title">Athena Test</h1>
          <p className="admin-subtitle">
            Test the server-side Athena OAuth flow and simple GET requests from the protected admin
            area.
          </p>
        </div>
        <span className={`admin-pill ${isReady ? "admin-live-pill" : ""}`}>
          {isReady ? "Configured" : "Missing env"}
        </span>
      </header>

      <section className="admin-content-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Request tester</h2>
              <p>Credentials stay on the server; access tokens are not shown in the browser.</p>
            </div>
          </div>

          <AthenaTestClient configStatus={configStatus} />
        </div>

        <aside className="admin-side-stack">
          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Environment</span>
            <div className="athena-config-list">
              <div className="athena-config-item">
                <span>Client ID</span>
                <strong>{configStatus.clientIdConfigured ? "Set" : "Missing"}</strong>
              </div>
              <div className="athena-config-item">
                <span>Client secret</span>
                <strong>{configStatus.clientSecretConfigured ? "Set" : "Missing"}</strong>
              </div>
              <div className="athena-config-item">
                <span>Base URL</span>
                <strong>{configStatus.baseUrl}</strong>
              </div>
              <div className="athena-config-item">
                <span>Token URL</span>
                <strong>{configStatus.tokenUrl}</strong>
              </div>
              <div className="athena-config-item">
                <span>Default scope</span>
                <strong>{configStatus.defaultScope || "Not set"}</strong>
              </div>
              <div className="athena-config-item">
                <span>Practice ID</span>
                <strong>{configStatus.defaultPracticeId || "Not set"}</strong>
              </div>
              <div className="athena-config-item">
                <span>Department ID</span>
                <strong>{configStatus.defaultDepartmentId || "Not set"}</strong>
              </div>
            </div>
          </article>

          <article className="admin-panel admin-side-metric">
            <span className="admin-kicker">Guardrails</span>
            <div className="admin-side-list">
              <p>Use relative Athena API paths only.</p>
              <p>Provider details come from /providers and slot data comes from /appointments/open.</p>
              <p>Do not test patient or PHI endpoints here unless the workflow is approved.</p>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
