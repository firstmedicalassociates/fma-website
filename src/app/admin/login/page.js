"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage("Invalid credentials.");
        return;
      }

      router.push("/admin");
      setStatus("success");
      setMessage(`Welcome ${data.user?.email || ""}`);
    } catch {
      setStatus("error");
      setMessage("Login failed. Please try again.");
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "64px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 16 }}>Admin Login</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: 10 }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: 10 }}
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          style={{ padding: 10, cursor: "pointer" }}
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {message ? (
        <p style={{ marginTop: 12 }} aria-live="polite">
          {message}
        </p>
      ) : null}
    </main>
  );
}
