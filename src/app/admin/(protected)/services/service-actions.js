"use client";

import Link from "next/link";
import { useState } from "react";

export default function ServiceActions({ id, editHref }) {
  const [status, setStatus] = useState("idle");

  async function handleDelete() {
    if (
      !confirm(
        "Delete this service? It will also be removed from any locations that currently use it."
      )
    ) {
      return;
    }

    setStatus("deleting");

    try {
      const response = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
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
      <Link className="builder-button secondary" href={editHref || `/admin/services/${id}`}>
        Edit
      </Link>
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
