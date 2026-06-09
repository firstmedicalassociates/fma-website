import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";
import InternalLinkHub from "./internal-link-hub";

export default function PublicInfoPage({ eyebrow, title, intro, sections = [] }) {
  return (
    <>
      <SiteHeader />
      <main>
        <div style={{ width: "min(1100px, calc(100% - 32px))", margin: "0 auto", padding: "48px 0 72px" }}>
          <section
            style={{
              background: "linear-gradient(135deg, #f7faff 0%, #eef4ff 100%)",
              border: "1px solid #dbe7ff",
              borderRadius: "28px",
              padding: "40px",
              marginBottom: "28px",
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: "14px",
                color: "#1b4ec9",
                fontSize: "0.78rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </p>
            <h1
              style={{
                margin: 0,
                marginBottom: "14px",
                color: "#001c55",
                fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "70ch",
                color: "#475569",
                fontSize: "1.02rem",
                lineHeight: 1.7,
              }}
            >
              {intro}
            </p>
          </section>

          <div style={{ display: "grid", gap: "18px" }}>
            {sections.map((section) => (
              <section
                key={section.heading}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "22px",
                  padding: "28px 30px",
                  boxShadow: "0 18px 36px rgba(15, 35, 88, 0.06)",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    marginBottom: "10px",
                    color: "#001c55",
                    fontSize: "1.45rem",
                    lineHeight: 1.1,
                  }}
                >
                  {section.heading}
                </h2>
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    style={{
                      margin: 0,
                      marginTop: "10px",
                      color: "#475569",
                      lineHeight: 1.75,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <div style={{ marginTop: "28px" }}>
            <InternalLinkHub
              title="Helpful next steps"
              intro="Use these internal links to move from policy and legal pages into patient-facing care and support pages."
              links={[
                {
                  href: "/patient-resources",
                  label: "Patient Resources",
                  description: "Review forms, insurance information, education, and support content.",
                },
                {
                  href: "/providers",
                  label: "Find a Doctor",
                  description: "Browse provider profiles and choose the right care team.",
                },
                {
                  href: "/locations",
                  label: "Find a Location",
                  description: "Open clinic pages for directions, hours, and appointment access.",
                },
                {
                  href: "/contact",
                  label: "Contact Us",
                  description: "Reach the team directly if you need help with care or policy questions.",
                },
              ]}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
