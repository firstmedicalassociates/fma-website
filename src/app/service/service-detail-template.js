import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  MapPin,
  PhoneCall,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { normalizeServicePageContent } from "../lib/services";

const FEATURE_ICONS = [Users, MapPin, Clock, PhoneCall];
const FAQ_ICONS = [ShieldCheck, User, ClipboardList];

function formatTag(value = "") {
  return String(value || "").trim().toUpperCase();
}

export default function ServiceDetailTemplate({ service }) {
  const content = normalizeServicePageContent(service?.pageContent || {});
  const features = content.features;
  const infoParagraphs = content.infoParagraphs;
  const commitmentItems = content.commitmentItems;
  const detailParagraphs = content.detailParagraphs;
  const faqItems = content.faqItems;

  return (
    <main className="service-page">
      <style>{`
        .service-page {
          --service-bg: #f5f7fc;
          --service-surface: #ffffff;
          --service-text: #253150;
          --service-muted: #4f5e7f;
          --service-heading: #0d2c87;
          --service-accent: #1a43c5;
          --service-line: #dbe2f1;
          --service-soft: #edf2ff;
          min-height: 100vh;
          background: radial-gradient(circle at 86% 8%, rgba(35, 88, 228, 0.08), transparent 44%), var(--service-bg);
          color: var(--service-text);
          padding: 0 0 56px;
        }

        .service-shell {
          width: min(1520px, calc(100% - 22px));
          margin: 18px auto 0;
          display: grid;
          gap: 16px;
        }

        .hero-band {
          position: relative;
          overflow: hidden;
          width: 100%;
          background:
            radial-gradient(120% 95% at 82% 8%, rgba(129, 165, 245, 0.28) 0%, rgba(129, 165, 245, 0.1) 36%, rgba(129, 165, 245, 0.02) 60%, rgba(129, 165, 245, 0) 78%),
            linear-gradient(116deg, #f3f6fc 0%, #eef3fb 52%, #e8eef8 100%);
          border-top: 1px solid #e8eef9;
          border-bottom: 1px solid #e5ebf7;
        }

        .hero-band::before {
          content: "";
          position: absolute;
          inset: -120px -220px -120px -220px;
          background: radial-gradient(ellipse at 74% 16%, rgba(58, 117, 240, 0.18) 0%, rgba(58, 117, 240, 0.06) 44%, rgba(58, 117, 240, 0) 74%);
          pointer-events: none;
        }

        .hero-band::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: min(1180px, 66vw);
          background-image: radial-gradient(rgba(53, 113, 245, 0.4) 1.9px, transparent 1.9px);
          background-size: 18px 18px;
          opacity: 0.58;
          mask-image: linear-gradient(to left, rgba(0, 0, 0, 1) 72%, rgba(0, 0, 0, 0) 100%);
          -webkit-mask-image: linear-gradient(to left, rgba(0, 0, 0, 1) 72%, rgba(0, 0, 0, 0) 100%);
          pointer-events: none;
        }

        .hero-wrap {
          width: min(1520px, calc(100% - 22px));
          margin: 0 auto;
          position: relative;
          padding: 34px 38px 32px;
          overflow: hidden;
        }

        .surface-panel {
          border-radius: 16px;
          border: 1px solid #e8ecf6;
          background: var(--service-surface);
          box-shadow: 0 18px 42px rgba(10, 43, 130, 0.06);
        }

        .hero-wrap::before {
          content: none;
        }

        .breadcrumbs {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 10px;
          margin-bottom: 26px;
          font-size: 0.83rem;
          color: #6a7898;
        }

        .breadcrumbs a {
          color: #5f6f91;
          text-decoration: none;
        }

        .breadcrumbs .active {
          color: #2a3960;
          font-weight: 600;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 680px;
        }

        .tag {
          width: fit-content;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: #dce7ff;
          color: #1c4bb8;
          font-size: 0.73rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .hero-title {
          margin: 0 0 12px;
          font-size: clamp(2.5rem, 7vw, 4.5rem);
          line-height: 0.96;
          letter-spacing: -0.06em;
          color: var(--service-heading);
        }

        .hero-subtitle {
          margin: 0 0 16px;
          color: #607098;
          font-size: clamp(1.5rem, 4vw, 2.05rem);
          line-height: 1.12;
          letter-spacing: -0.03em;
        }

        .hero-desc {
          margin: 0;
          color: #37486f;
          max-width: 60ch;
          line-height: 1.66;
          font-size: 1.03rem;
        }

        .hero-actions {
          margin-top: 26px;
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }

        .button-primary,
        .button-outline {
          min-height: 52px;
          padding: 0 24px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
          text-decoration: none;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .button-primary {
          color: #ffffff;
          background: linear-gradient(135deg, #0d2c87 0%, #0d40be 100%);
          border: 1px solid #0f3ab0;
          box-shadow: 0 12px 22px rgba(13, 52, 156, 0.22);
        }

        .button-outline {
          color: #1740bb;
          border: 1px solid #1f4dd8;
          background: #ffffff;
        }

        .button-primary:hover,
        .button-outline:hover {
          transform: translateY(-1px);
        }

        .feature-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          overflow: hidden;
        }

        .feature-card {
          padding: 34px 28px 30px;
          display: grid;
          gap: 12px;
          border-right: 1px solid var(--service-line);
        }

        .feature-card:last-child {
          border-right: 0;
        }

        .feature-icon {
          width: 62px;
          height: 62px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #1450d8;
          background: #eaf0ff;
        }

        .feature-card h3 {
          margin: 2px 0 0;
          color: #153695;
          font-size: 1.78rem;
          letter-spacing: -0.04em;
          line-height: 0.98;
        }

        .feature-card h4 {
          margin: 0;
          color: #123789;
          font-size: 1.88rem;
          letter-spacing: -0.04em;
          line-height: 0.98;
        }

        .feature-title {
          margin: 2px 0 0;
          color: #15398f;
          font-size: 2.1rem;
          line-height: 0.94;
          letter-spacing: -0.04em;
        }

        .feature-heading {
          margin: 0;
          color: #143887;
          font-size: 1.98rem;
          line-height: 0.97;
          letter-spacing: -0.04em;
        }

        .feature-name {
          margin: 2px 0 0;
          color: #173e95;
          font-size: 2rem;
          line-height: 0.96;
          letter-spacing: -0.04em;
        }

        .feature-label {
          margin: 4px 0 0;
          color: #17398d;
          font-size: 1.98rem;
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .feature-card .title {
          margin: 4px 0 0;
          color: #15388e;
          font-size: 1.96rem;
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .feature-card .name {
          margin: 2px 0 0;
          color: #143985;
          font-size: 2rem;
          line-height: 0.94;
          letter-spacing: -0.04em;
        }

        .feature-title-text {
          margin: 4px 0 0;
          color: #163d98;
          font-size: 1.4rem;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .feature-desc {
          margin: 0;
          color: #3e4f73;
          font-size: 1.03rem;
          line-height: 1.64;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1.55fr 1fr;
          gap: 26px;
          padding: 18px;
        }

        .info-copy {
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid #ebeff8;
          padding: 28px;
          display: grid;
          gap: 18px;
        }

        .info-copy p {
          margin: 0;
          color: #33466f;
          line-height: 1.75;
          font-size: 1.06rem;
        }

        .commitment {
          border-radius: 12px;
          border: 1px solid #dde6fa;
          background: linear-gradient(180deg, #eef3fd 0%, #ebf1fb 100%);
          padding: 26px;
          display: grid;
          align-content: start;
        }

        .commitment-icon {
          width: 62px;
          height: 62px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #2a56d7;
          background: #dde8ff;
          margin-bottom: 16px;
        }

        .commitment h3 {
          margin: 0 0 16px;
          color: #143892;
          font-size: clamp(1.75rem, 3.4vw, 2.2rem);
          line-height: 1.02;
          letter-spacing: -0.04em;
        }

        .commitment-list {
          display: grid;
          gap: 14px;
        }

        .commitment-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #2f436f;
          font-size: 1.06rem;
          line-height: 1.5;
        }

        .commitment-item svg {
          color: #1e4ad2;
          flex: 0 0 auto;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 16px;
        }

        .detail-copy {
          padding: 32px;
        }

        .detail-copy h2 {
          margin: 0 0 18px;
          color: #13388f;
          font-size: clamp(1.75rem, 3.8vw, 2.35rem);
          line-height: 1.03;
          letter-spacing: -0.04em;
        }

        .detail-copy p {
          margin: 0 0 16px;
          color: #3a4d75;
          line-height: 1.72;
          font-size: 1.04rem;
        }

        .detail-link {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #1847c4;
          font-weight: 700;
          text-decoration: none;
        }

        .faq-list {
          display: grid;
          gap: 10px;
        }

        .faq-item {
          border-radius: 12px;
          border: 1px solid #e6ecfa;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(8, 42, 132, 0.05);
        }

        .faq-item summary {
          list-style: none;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 20px 20px 20px 18px;
        }

        .faq-item summary::-webkit-details-marker {
          display: none;
        }

        .faq-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .faq-icon {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          background: #eef2fb;
          display: grid;
          place-items: center;
          color: #1f4fd7;
          flex: 0 0 auto;
        }

        .faq-question {
          color: #133a95;
          font-size: 1.38rem;
          line-height: 1.06;
          letter-spacing: -0.03em;
        }

        .faq-arrow {
          color: #173d9f;
          transition: transform 0.2s ease;
          flex: 0 0 auto;
        }

        .faq-item[open] .faq-arrow {
          transform: rotate(180deg);
        }

        .faq-answer {
          margin: 0;
          padding: 0 20px 20px 72px;
          color: #41547b;
          line-height: 1.7;
          font-size: 1.01rem;
        }

        .cta-banner {
          border-radius: 16px;
          padding: 28px 30px;
          background: linear-gradient(120deg, #0b2879 0%, #123eaf 55%, #0f3295 100%);
          color: #ffffff;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 22px;
        }

        .cta-copy h2 {
          margin: 0 0 10px;
          font-size: clamp(1.85rem, 3.9vw, 2.45rem);
          line-height: 1.02;
          letter-spacing: -0.04em;
        }

        .cta-copy p {
          margin: 0;
          color: rgba(235, 241, 255, 0.92);
          max-width: 48ch;
          line-height: 1.62;
          font-size: 1.04rem;
        }

        .cta-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .cta-btn-primary,
        .cta-btn-outline {
          min-height: 50px;
          min-width: 218px;
          padding: 0 20px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
          text-decoration: none;
          transition: transform 160ms ease;
        }

        .cta-btn-primary {
          background: #ffffff;
          color: #113da9;
          border: 1px solid #ffffff;
        }

        .cta-btn-outline {
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.46);
          background: transparent;
        }

        .cta-btn-primary:hover,
        .cta-btn-outline:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 1100px) {
          .feature-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .feature-card:nth-child(2n) {
            border-right: 0;
          }

          .feature-card:nth-child(n + 3) {
            border-top: 1px solid var(--service-line);
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .cta-banner {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .service-page {
            padding: 0 0 38px;
          }

          .service-shell {
            width: min(100%, calc(100% - 14px));
            margin-top: 12px;
          }

          .hero-wrap {
            width: min(100%, calc(100% - 14px));
            padding: 20px 16px 18px;
          }

          .hero-band::after {
            display: none;
          }

          .breadcrumbs {
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 14px;
          }

          .hero-actions {
            margin-top: 16px;
          }

          .button-primary,
          .button-outline,
          .cta-btn-primary,
          .cta-btn-outline {
            width: 100%;
            min-width: 0;
          }

          .feature-strip {
            grid-template-columns: 1fr;
          }

          .feature-card {
            border-right: 0;
            border-top: 1px solid var(--service-line);
            padding: 22px 18px;
          }

          .feature-card:first-child {
            border-top: 0;
          }

          .info-grid {
            padding: 12px;
            gap: 12px;
          }

          .info-copy,
          .commitment,
          .detail-copy {
            padding: 18px;
          }

          .faq-item summary {
            padding: 14px;
          }

          .faq-answer {
            padding: 0 14px 14px 14px;
          }

          .cta-banner {
            padding: 18px 14px;
          }

          .cta-actions {
            justify-content: stretch;
          }
        }
      `}</style>

      <section className="hero-band">
        <div className="hero-wrap">
          <div className="breadcrumbs">
            <Link href="/">Home</Link>
            <span>&gt;</span>
            <Link href="/services">Services</Link>
            <span>&gt;</span>
            <span className="active">{service?.title || "Service"}</span>
          </div>

          <div className="hero-content">
            <div className="tag">{formatTag(content.eyebrow)}</div>
            <h1 className="hero-title">{service?.title || "Service"}</h1>
            <h2 className="hero-subtitle">{content.heroSubtitle}</h2>
            <p className="hero-desc">{content.heroDescription}</p>

            <div className="hero-actions">
              <Link href="/location" className="button-primary">
                <Calendar size={18} /> Schedule an Appointment
              </Link>
              <Link href="/providers" className="button-outline">
                <User size={18} /> Find a Primary Care Doctor
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="service-shell">
        <section className="feature-strip surface-panel">
          {features.map((feature, index) => {
            const FeatureIcon = FEATURE_ICONS[index] || ShieldCheck;
            return (
              <article className="feature-card" key={`${feature.title}-${index}`}>
                <div className="feature-icon">
                  <FeatureIcon size={27} />
                </div>
                <h3 className="feature-title-text">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </article>
            );
          })}
        </section>

        <section className="info-grid surface-panel">
          <div className="info-copy">
            {infoParagraphs.map((paragraph, index) => (
              <p key={`info-${index}`}>{paragraph}</p>
            ))}
          </div>

          <aside className="commitment">
            <div className="commitment-icon">
              <ShieldCheck size={26} />
            </div>
            <h3>{content.commitmentTitle}</h3>
            <div className="commitment-list">
              {commitmentItems.map((item, index) => (
                <div className="commitment-item" key={`commitment-${index}`}>
                  <CheckCircle2 size={19} /> {item}
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="details-grid">
          <article className="detail-copy surface-panel">
            <h2>{content.detailHeading}</h2>
            {detailParagraphs.map((paragraph, index) => (
              <p key={`detail-${index}`}>{paragraph}</p>
            ))}
            <Link href={content.detailLinkHref} className="detail-link">
              {content.detailLinkLabel} <ArrowRight size={17} />
            </Link>
          </article>

          <div className="faq-list">
            {faqItems.map((item, index) => {
              const FaqIcon = FAQ_ICONS[index] || ClipboardList;
              return (
                <details className="faq-item" key={`faq-${index}`}>
                  <summary>
                    <div className="faq-left">
                      <div className="faq-icon">
                        <FaqIcon size={21} />
                      </div>
                      <span className="faq-question">{item.question}</span>
                    </div>
                    <ChevronDown size={20} className="faq-arrow" />
                  </summary>
                  <p className="faq-answer">{item.answer}</p>
                </details>
              );
            })}
          </div>
        </section>

        <section className="cta-banner">
          <div className="cta-copy">
            <h2>{content.ctaTitle}</h2>
            <p>{content.ctaDescription}</p>
          </div>

          <div className="cta-actions">
            <Link href="/location" className="cta-btn-primary">
              <Calendar size={18} /> Schedule an Appointment
            </Link>
            <Link href="/providers" className="cta-btn-outline">
              Find a Doctor <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
