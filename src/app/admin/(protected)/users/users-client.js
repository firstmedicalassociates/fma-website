"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PERMISSION_GROUPS,
  normalizePermissions,
} from "../../../lib/admin-permissions.mjs";
const EMPTY = {
  email: "",
  password: "",
  role: "SUB_ADMIN",
  permissions: [],
  isActive: true,
};
function PermissionGrid({ value, onChange }) {
  function toggle(key, checked) {
    let next = checked ? [...value, key] : value.filter((item) => item !== key);
    if (!checked && key.endsWith(".view")) {
      next = next.filter((item) => !item.startsWith(key.split(".")[0] + "."));
      if (key === "ai-search.view")
        next = next.filter((item) => item !== "spending.view");
    }
    onChange(normalizePermissions(next));
  }
  return (
    <div className="admin-permission-grid">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.key}>
          <legend>{group.label}</legend>
          {group.actions.map((action) => {
            const key = `${group.key}.${action}`;
            return (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={value.includes(key)}
                  onChange={(e) => toggle(key, e.target.checked)}
                />
                {action === "view"
                  ? "View"
                  : action === "delete"
                    ? "Delete"
                    : group.key === "ai-search"
                      ? "Manage feedback and evaluations"
                      : "Create / Edit"}
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
export default function UsersClient({ currentUserId, initialUsers }) {
  const router = useRouter();
  const editorHeading = useRef(null);
  const [users, setUsers] = useState(initialUsers);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [resetPassword, setResetPassword] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const busy = Boolean(pendingAction);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const selectedUser = users.find((user) => user.id === editing);
  const deleteRestriction =
    editing === currentUserId
      ? "You cannot delete your own account."
      : selectedUser?.role === "ADMIN" &&
          selectedUser.isActive &&
          users.filter((user) => user.role === "ADMIN" && user.isActive)
            .length <= 1
        ? "Keep at least one active full administrator."
        : "";
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  function select(user) {
    if (busy) return;
    setEditing(user?.id || null);
    setForm(user ? { ...user, password: "" } : { ...EMPTY, permissions: [] });
    setResetPassword("");
    setMessage("");
    requestAnimationFrame(() => editorHeading.current?.focus());
  }
  async function submit(event, reset = false) {
    event.preventDefault();
    if (busy) return;
    setPendingAction(reset ? "reset" : "save");
    setMessage("");
    setError(false);
    try {
      const url = reset
        ? `/api/admin/users/${editing}/reset-password`
        : editing
          ? `/api/admin/users/${editing}`
          : "/api/admin/users";
      const response = await fetch(url, {
        method: reset || !editing ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { password: resetPassword } : form),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save this account.");
      setUsers((current) =>
        editing
          ? current.map((user) => (user.id === data.user.id ? data.user : user))
          : [...current, data.user],
      );
      setEditing(data.user.id);
      setForm({ ...data.user, password: "" });
      setResetPassword("");
      setMessage(
        reset
          ? "Temporary password updated. Share it directly with this user; they must change it at sign-in."
          : editing
            ? "Account updated. Existing sessions were invalidated."
            : "Account created. Share the temporary password directly with the new admin.",
      );
      router.refresh();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setPendingAction("");
    }
  }
  async function removeAccount() {
    if (busy || !selectedUser || deleteRestriction) return;
    if (
      !window.confirm(
        `Permanently delete the admin account for ${selectedUser.email}?\n\nTheir sign-in access will be removed immediately. This cannot be undone.`,
      )
    )
      return;
    setPendingAction("delete");
    setMessage("");
    setError(false);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to delete this account.");
      setUsers((current) =>
        current.filter((user) => user.id !== selectedUser.id),
      );
      setEditing(null);
      setForm({ ...EMPTY, permissions: [] });
      setResetPassword("");
      setMessage(
        `The admin account for ${selectedUser.email} was permanently deleted.`,
      );
      requestAnimationFrame(() => editorHeading.current?.focus());
      router.refresh();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setPendingAction("");
    }
  }
  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Team access</span>
          <h1 className="admin-title">Admins</h1>
          <p className="admin-subtitle">
            Create accounts and choose exactly what each admin can access.
          </p>
        </div>
        <button
          className="builder-button"
          disabled={busy}
          onClick={() => select(null)}
        >
          New admin
        </button>
      </header>
      <div className="admin-account-grid">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <h2>Accounts</h2>
            <span className="admin-pill">{users.length}</span>
          </div>
          <div className="admin-record-list">
            {users.map((user) => (
              <article className="admin-record" key={user.id}>
                <div>
                  <h3 className="admin-record-title">{user.email}</h3>
                  <p className="admin-record-secondary">
                    {user.role === "ADMIN" ? "Full admin" : "Sub-admin"} ·{" "}
                    {user.isActive ? "Active" : "Inactive"}
                    {user.mustChangePassword
                      ? " · Password change required"
                      : ""}
                  </p>
                </div>
                <button
                  className="builder-button secondary"
                  disabled={busy}
                  onClick={() => select(user)}
                >
                  Manage<span className="sr-only"> {user.email}</span>
                </button>
              </article>
            ))}
          </div>
        </section>
        <section className="admin-panel admin-account-editor">
          <h2 ref={editorHeading} tabIndex={-1}>
            {editing ? "Manage admin" : "Create admin"}
          </h2>
          <form className="admin-settings-form" onSubmit={submit}>
            <fieldset className="admin-form-fields" disabled={busy}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  required
                  disabled={Boolean(editing)}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
              {!editing ? (
                <label>
                  Temporary password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    minLength={12}
                    required
                    onChange={(e) => set("password", e.target.value)}
                  />
                  <small>
                    At least 12 characters. The new admin must change this at
                    first sign-in.
                  </small>
                </label>
              ) : null}
              <label>
                Role
                <select
                  value={form.role}
                  onChange={(e) => set("role", e.target.value)}
                >
                  <option value="SUB_ADMIN">Sub-admin</option>
                  <option value="ADMIN">Full admin</option>
                </select>
              </label>
              {form.role === "SUB_ADMIN" ? (
                <PermissionGrid
                  value={form.permissions}
                  onChange={(value) => set("permissions", value)}
                />
              ) : (
                <p className="admin-notice">
                  Full admins can manage all content, diagnostics, spending, and
                  admin accounts.
                </p>
              )}
              {editing ? (
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    disabled={editing === currentUserId}
                    onChange={(e) => set("isActive", e.target.checked)}
                  />
                  Account active
                </label>
              ) : null}
              <button className="builder-button" type="submit">
                {pendingAction === "save"
                  ? "Saving…"
                  : editing
                    ? "Save account"
                    : "Create admin"}
              </button>
            </fieldset>
          </form>
          {editing && editing !== currentUserId ? (
            <form
              className="admin-settings-form admin-reset-form"
              onSubmit={(e) => submit(e, true)}
            >
              <h3>Reset password</h3>
              <label>
                New temporary password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={resetPassword}
                  disabled={busy}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
              </label>
              <button className="builder-button secondary" disabled={busy}>
                {pendingAction === "reset"
                  ? "Resetting password…"
                  : "Set temporary password"}
              </button>
            </form>
          ) : null}
          {selectedUser ? (
            <section
              className="admin-reset-form"
              aria-labelledby="delete-admin-title"
            >
              <h3 id="delete-admin-title">Permanently delete admin</h3>
              <p id="delete-admin-description">
                Remove {selectedUser.email} and their sign-in access. This
                cannot be undone.
              </p>
              {deleteRestriction ? (
                <p id="delete-admin-restriction">{deleteRestriction}</p>
              ) : null}
              <button
                type="button"
                className="builder-button secondary danger"
                disabled={busy || Boolean(deleteRestriction)}
                aria-describedby={
                  deleteRestriction
                    ? "delete-admin-description delete-admin-restriction"
                    : "delete-admin-description"
                }
                onClick={removeAccount}
              >
                {pendingAction === "delete"
                  ? "Deleting admin…"
                  : "Delete admin permanently"}
              </button>
            </section>
          ) : null}
          {message ? (
            <p
              role={error ? "alert" : "status"}
              className={error ? "admin-error-message" : "admin-notice"}
            >
              {message}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
