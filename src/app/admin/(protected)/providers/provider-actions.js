"use client";

import { useState } from "react";

export default function ProviderActions({ id }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm("Delete this provider?")) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.error || "Delete failed.");
        return;
      }

      window.location.reload();
    } catch {
      setError("Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="builder-row">
        <button className="builder-button secondary" type="button" onClick={handleDelete} disabled={busy}>
          {busy ? "Deleting..." : "Delete"}
        </button>
      </div>
      {error ? (
        <span className="admin-subtitle" style={{ color: "#b42318" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
