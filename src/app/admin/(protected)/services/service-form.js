"use client";

import Link from "next/link";
import { useState } from "react";

function getInitialValues(initialService) {
  return {
    id: initialService?.id || "",
    category: initialService?.category || "General Care",
    title: initialService?.title || "",
    description: initialService?.description || "",
    isActive: initialService?.isActive ?? true,
  };
}

export default function ServiceForm({ mode = "create", initialService }) {
  const initialValues = getInitialValues(initialService);
  const isEditMode = mode === "edit";

  const [category, setCategory] = useState(initialValues.category);
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [isActive, setIsActive] = useState(initialValues.isActive);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const endpoint = isEditMode
        ? `/api/admin/services/${initialValues.id}`
        : "/api/admin/services";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          description,
          isActive,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || `Failed to ${isEditMode ? "update" : "create"} service.`);
        return;
      }

      window.location.href = `/admin/services/${data.id || initialValues.id}`;
    } catch {
      setStatus("error");
      setMessage(`Failed to ${isEditMode ? "update" : "create"} service.`);
    }
  }

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Service library</span>
          <h1 className="admin-title">{isEditMode ? "Edit Service" : "Add Service"}</h1>
          <p className="admin-subtitle">
            Create shared service cards once, then assign them to any location page.
          </p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">{isActive ? "Visible" : "Hidden"}</span>
          <button
            className="builder-button admin-primary-cta"
            type="submit"
            form="service-form"
            disabled={status === "saving"}
          >
            {status === "saving"
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save service"
                : "Create service"}
          </button>
        </div>
      </header>

      <section className="builder-shell">
        <div className="builder-card">
          <div className="builder-card-header">
            <h2>Service details</h2>
            <p className="builder-card-copy">
              This content powers the service cards shown in the public location services tab.
            </p>
          </div>

          <form className="builder-form" id="service-form" onSubmit={handleSubmit}>
            <div className="builder-field">
              <label>Category</label>
              <input
                className="builder-input"
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Primary Care"
              />
            </div>

            <div className="builder-field">
              <label>Title (required)</label>
              <input
                className="builder-input"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Annual Physicals"
                required
              />
            </div>

            <div className="builder-field">
              <label>Description (required)</label>
              <textarea
                className="builder-textarea"
                rows={7}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description shown on the public service card."
                required
              />
            </div>

            <label className="builder-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <span>Show this service on public location pages</span>
            </label>

            <div className="builder-row">
              <button
                className="builder-button admin-primary-cta"
                type="submit"
                disabled={status === "saving"}
              >
                {status === "saving"
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save service"
                    : "Create service"}
              </button>
              <Link className="builder-button secondary" href="/admin/services">
                Cancel
              </Link>
            </div>

            {message ? (
              <p className={`status-message ${status === "error" ? "is-error" : ""}`}>
                {message}
              </p>
            ) : null}
          </form>
        </div>

        <div className="builder-preview">
          <p className="builder-preview-kicker">Live preview</p>
          <h2>Service card</h2>
          <article className="location-preview-card">
            <div className="location-preview-body">
              <div>
                <p className="location-preview-slug">{category || "General Care"}</p>
                <h2>{title || "Service title"}</h2>
                <p className="location-preview-intro">
                  {description || "Service description preview will render here as you type."}
                </p>
              </div>

              <div className="location-preview-meta-grid">
                <div className="location-preview-meta-item">
                  <span>Status</span>
                  <strong>{isActive ? "Visible on public pages" : "Hidden from public pages"}</strong>
                </div>
                <div className="location-preview-meta-item">
                  <span>Ordering</span>
                  <strong>Each location controls its own service order.</strong>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
