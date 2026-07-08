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
          <h1 className="admin-title">Athena Departments</h1>
          <p className="admin-subtitle">
            View the departments available from the configured Athena Preview environment.
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
              <h2>Department list</h2>
              <p>Departments load automatically from Athena using the server-side credentials.</p>
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
              <p>Credentials and access tokens stay on the server.</p>
              <p>Department data comes from the configured Preview practice.</p>
              <p>Patient and PHI endpoints are intentionally not shown here.</p>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
