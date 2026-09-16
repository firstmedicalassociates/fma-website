"use client";
import { Permission, useAdminAccess } from "../admin-access";

import Link from "next/link";
import { useState } from "react";

export default function PostActions({ id, slug, postStatus }) {
  const { can } = useAdminAccess();
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
    <div className="admin-record-actions">
      <Link className="builder-button secondary" href={`/admin/posts/${id}`}>
        Edit
      </Link>
      {postStatus === "PUBLISHED" ? (
        <Link
          className="builder-button secondary"
          href={`/blog/${slug}`}
          target="_blank"
          rel="noreferrer"
        >
          View live
        </Link>
      ) : null}
      <Permission name="posts.delete"><button
        className="builder-button secondary danger"
        type="button"
        onClick={handleDelete}
        disabled={status === "deleting"}
      >
        {status === "deleting" ? "Deleting..." : "Delete"}
      </button></Permission>
      {status === "error" ? <span className="admin-action-error">Failed to delete.</span> : null}
    </div>
  );
}
