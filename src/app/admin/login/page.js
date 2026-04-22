"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, Sparkles } from "../(protected)/admin-icons";
import styles from "./page.module.css";

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
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.brandPanel}>
          <span className={styles.brandBadge}>
            <ShieldCheck />
            Secure control center
          </span>

          <div className={styles.brandHeading}>
            <span className={styles.brandEyebrow}>First Medical admin suite</span>
            <h1>Run the CMS with clarity.</h1>
            <p>
              Sign in to manage posts, locations, and providers inside the Aspire-style
              admin workspace.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <Sparkles />
              <h2>Polished publishing flow</h2>
              <p>Draft content, upload media, and preview changes before they go live.</p>
            </article>
            <article className={styles.featureCard}>
              <Activity />
              <h2>Live visibility</h2>
              <p>Track recent updates across locations, providers, and posts at a glance.</p>
            </article>
            <article className={styles.featureCard}>
              <ShieldCheck />
              <h2>Protected access</h2>
              <p>Your admin session is secured and scoped for authenticated staff only.</p>
            </article>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formHeader}>
            <span className={styles.statusPill}>
              <Activity />
              Admin access
            </span>
            <h2>Sign in</h2>
            <p>Use your admin credentials to enter the protected dashboard.</p>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@firstmedical.example"
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </label>

            <button className={styles.button} type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Enter dashboard"}
            </button>
          </form>

          {message ? (
            <p
              className={`${styles.message} ${
                status === "error" ? styles.messageError : styles.messageSuccess
              }`}
              aria-live="polite"
            >
              {message}
            </p>
          ) : null}

          <p className={styles.footerNote}>
            If access fails, double-check your email and password before trying again.
          </p>
        </section>
      </div>
    </main>
  );
}
