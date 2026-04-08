"use client";

import { useState } from "react";

export default function PostActions({ id }) {
  const [status, setStatus] = useState("idle");

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setStatus("deleting");

    try {
      const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
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
    <div style={{ display: "flex", gap: 8 }}>
      <button
        className="builder-button secondary"
        type="button"
        onClick={handleDelete}
        disabled={status === "deleting"}
      >
        {status === "deleting" ? "Deleting..." : "Delete"}
      </button>
      {status === "error" ? (
        <span className="admin-subtitle" style={{ color: "#b42318" }}>
          Failed to delete.
        </span>
      ) : null}
    </div>
  );
}
