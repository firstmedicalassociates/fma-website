import Link from "next/link";
import { normalizeInternalPageHref } from "../lib/config/site";

function SmartLink({ href, children }) {
  const target = String(href || "").trim();

  if (/^https?:\/\//i.test(target)) {
    return (
      <a href={target} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  return <Link href={normalizeInternalPageHref(target)}>{children}</Link>;
}

export default function InternalLinkHub({ title, intro, links = [] }) {
  const visibleLinks = links.filter((link) => link?.href && link?.label);
  if (visibleLinks.length === 0) return null;

  return (
    <section
      style={{
        borderRadius: "24px",
        border: "1px solid #dbe7ff",
        background: "linear-gradient(180deg, #f7faff 0%, #eef4ff 100%)",
        padding: "28px",
        display: "grid",
        gap: "16px",
      }}
    >
      <div style={{ display: "grid", gap: "8px" }}>
        <h2
          style={{
            margin: 0,
            color: "#001c55",
            fontSize: "clamp(1.45rem, 2.6vw, 2rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </h2>
        {intro ? (
          <p
            style={{
              margin: 0,
              color: "#475569",
              lineHeight: 1.7,
              maxWidth: "70ch",
            }}
          >
            {intro}
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {visibleLinks.map((link) => (
          <SmartLink key={`${link.href}-${link.label}`} href={link.href}>
            <span
              style={{
                height: "100%",
                minHeight: "112px",
                borderRadius: "18px",
                border: "1px solid rgba(27, 78, 201, 0.14)",
                background: "#ffffff",
                padding: "18px",
                display: "grid",
                gap: "8px",
                boxShadow: "0 14px 28px rgba(15, 35, 88, 0.06)",
              }}
            >
              <strong
                style={{
                  color: "#0f2f8d",
                  fontSize: "1rem",
                  lineHeight: 1.25,
                }}
              >
                {link.label}
              </strong>
              {link.description ? (
                <span
                  style={{
                    color: "#475569",
                    lineHeight: 1.55,
                    fontSize: "0.92rem",
                  }}
                >
                  {link.description}
                </span>
              ) : null}
            </span>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}
