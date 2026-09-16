"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function PasswordForm({ requiredChange }) {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to change password.");
      form.reset();
      setStatus("success");
      setMessage("Password changed. Your other sessions have been signed out.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }
  return (
    <section className="admin-panel admin-account-editor">
      <h2>Change password</h2>
      {requiredChange ? (
        <p className="admin-notice">
          Change your temporary password before using the dashboard.
        </p>
      ) : null}
      <form className="admin-settings-form" onSubmit={submit}>
        <fieldset className="admin-form-fields" disabled={status === "saving"}>
          <label>
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
            <small>At least 12 characters; maximum 72 UTF-8 bytes.</small>
          </label>
          <label>
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <button className="builder-button">
            {status === "saving" ? "Updating…" : "Change password"}
          </button>
        </fieldset>
      </form>
      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          className={
            status === "error" ? "admin-error-message" : "admin-notice"
          }
        >
          {message}
        </p>
      ) : null}
      {status === "success" ? (
        <Link className="builder-button secondary" href="/admin">
          Continue to dashboard
        </Link>
      ) : null}
    </section>
  );
}
