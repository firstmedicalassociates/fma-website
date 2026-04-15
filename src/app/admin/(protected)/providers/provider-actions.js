"use client";

import Link from "next/link";
import { useState } from "react";

export default function ProviderActions({ id, editHref, liveHref }) {
  const [status, setStatus] = useState("idle");

  async function handleDelete() {
    if (!confirm("Delete this provider? This cannot be undone.")) return;

    setStatus("deleting");

    try {
      const response = await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setStatus("error");
        return;
      }

      window.location.reload();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="admin-record-actions">
      <Link className="builder-button secondary" href={editHref || `/admin/providers/${id}`}>
        Edit
      </Link>
      {liveHref ? (
        <Link className="builder-button secondary" href={liveHref} target="_blank" rel="noreferrer">
          View live
        </Link>
      ) : null}
      <button
        className="builder-button secondary danger"
        type="button"
        onClick={handleDelete}
        disabled={status === "deleting"}
      >
        {status === "deleting" ? "Deleting..." : "Delete"}
      </button>
      {status === "error" ? <span className="admin-action-error">Failed to delete.</span> : null}
    </div>
  );
}
