/* eslint-disable @next/next/no-img-element */
import { buildStaticMetadata } from "../../lib/seo";
import {
  Briefcase,
  ArrowRight,
  Heart,
  Users,
  GraduationCap,
  Target,
  ShieldCheck,
  Activity,
  ClipboardCheck,
  Coins,
  Calendar,
  Award,
  CircleCheck,
  Building2,
} from 'lucide-react';

const jobBoardUrl = 'https://drsfirst.com/jobs/';

export const metadata = buildStaticMetadata({
  title: "Careers | First Medical Associates",
  description:
    "Explore provider, clinic, and corporate career opportunities at First Medical Associates across Maryland.",
  pathname: "/about/careers",
});

export default function CareersPage() {
  const opportunities = [
    {
      name: 'Provider Roles',
      description: 'Explore physician and advanced practitioner opportunities across our network.',
      icon: Heart,
    },
    {
      name: 'Clinic Roles',
      description: 'Support patients and providers through front-office and clinical operations roles.',
      icon: ClipboardCheck,
    },
    {
      name: 'Corporate Roles',
      description: 'Help power growth across operations, technology, recruiting, and administration.',
      icon: Building2,
    },
  ];

  const cultureValues = [
    {
      title: 'Work-Life Balance',
      desc: 'We build schedules and support systems that help people thrive at work and at home.',
      icon: Activity,
    },
    {
      title: 'Professional Growth Opportunities',
      desc: 'Team members gain mentorship, development opportunities, and room to advance.',
      icon: GraduationCap,
    },
    {
      title: 'Supportive Team Environment',
      desc: 'Providers and staff work in collaborative environments where support is built in.',
      icon: Users,
    },
    {
      title: 'State-of-the-Art Facilities',
      desc: 'Our practices include state-of-the-art diagnostic tools and on-site phlebotomy services.',
      icon: ShieldCheck,
    },
    {
      title: 'Employee Discounts and Perks',
      desc: 'We aim to provide practical benefits and workplace perks that add value beyond pay.',
      icon: Award,
    },
  ];

  const benefits = [
    { name: 'Competitive Compensation', icon: Coins },
    { name: 'Comprehensive Health Coverage', icon: ShieldCheck },
    { name: 'Holidays and PTO', icon: Calendar },
    { name: 'Comprehensive Medical Coverage', icon: ClipboardCheck },
    { name: 'Corporate Discounts', icon: Briefcase },
    { name: 'Legal Assistance', icon: CircleCheck },
    { name: 'Dental and Vision', icon: Heart },
    { name: '401K with Employer Match', icon: Target },
    { name: 'Identity Protection', icon: ShieldCheck },
    { name: 'Peloton\u00ae Membership', icon: Activity },
    { name: 'No Nights, No Weekends', icon: Calendar },
    { name: 'Scholarship Opportunities', icon: GraduationCap },
  ];

  return (
    <div className="careers-content">
      <style>{`
        .careers-content {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 4rem;
          margin-bottom: 0;
          padding-bottom: 6rem;
        }

        .main-promo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
        .promo-text h2 { font-size: 2.25rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; line-height: 1.2; }
        .promo-text h3 { font-size: 1.125rem; font-weight: 800; color: #0b4f96; margin-bottom: 1rem; }
        .promo-text p { color: #475569; font-size: 1.125rem; line-height: 1.7; margin-bottom: 3rem; }

        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .feat-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          padding: 1.25rem;
          border-radius: 20px;
          background: #f8fafc;
          text-decoration: none;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .feat-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(15, 35, 88, 0.08);
        }
        .feat-item:last-child:nth-child(odd) { grid-column: 1 / -1; }
        .feat-icon {
          background: #eef4ff; width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center; color: #0070f3; flex-shrink: 0;
        }
        .feat-item h4 { font-size: 1rem; font-weight: 800; color: #001c55; margin-bottom: 0.25rem; }
        .feat-item p { font-size: 0.8125rem; color: #64748b; line-height: 1.4; margin-bottom: 0.75rem; }
        .feat-link { font-size: 0.8125rem; font-weight: 800; color: #0b4f96; display: inline-flex; align-items: center; gap: 0.375rem; }

        .promo-img-wrap { border-radius: 32px; overflow: hidden; height: 500px; }
        .promo-img-wrap img { width: 100%; height: 100%; object-fit: cover; }

        .cta-banner-dark {
          background: #001c55; border-radius: 24px; padding: 3rem 4rem; color: white;
          display: flex; justify-content: space-between; align-items: center;
        }
        .cta-banner-dark div { display: flex; align-items: center; gap: 2rem; }
        .cta-icon-box { background: rgba(255,255,255,0.1); width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; }
        .cta-banner-dark h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; }
        .cta-banner-dark p { opacity: 0.7; font-size: 0.875rem; }
        .view-jobs-btn {
          background: white; color: #001c55; padding: 1rem 2rem; border-radius: 12px; font-weight: 800;
          display: inline-flex; align-items: center; gap: 0.75rem; text-decoration: none;
        }

        .sec-title { margin-bottom: 2.5rem; }
        .sec-title h2 { font-size: 2rem; font-weight: 800; color: #001c55; margin-bottom: 0.5rem; }
        .sec-title h3 { font-size: 1.0625rem; font-weight: 800; color: #0b4f96; margin-bottom: 1rem; }
        .sec-title p { color: #64748b; font-size: 1rem; line-height: 1.7; max-width: 900px; }

        .culture-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; }
        .culture-card { background: #f8fafc; padding: 2rem; border-radius: 24px; }
        .culture-icon { background: #eef4ff; width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; color: #0070f3; margin-bottom: 1.5rem; }
        .culture-card h4 { font-size: 1rem; font-weight: 800; color: #001c55; margin-bottom: 0.75rem; }
        .culture-card p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

        .benefits-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
        .benefit-item {
          display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
          background: #f8fafc; border-radius: 18px;
        }
        .benefit-icon { background: #f1f5f9; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #001c55; flex-shrink: 0; }
        .benefit-name { font-size: 0.875rem; font-weight: 700; color: #475569; }

        .join-sec {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #001689;
          border: 1px solid rgba(0, 22, 137, 0.18);
          border-radius: 24px;
          overflow: hidden;
          color: white;
          box-shadow: 0 24px 54px rgba(0, 22, 137, 0.16);
        }
        .join-left {
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.05), transparent 42%),
            linear-gradient(135deg, #001689 0%, #001c55 100%);
          padding: 4rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .join-left h2 { font-size: 2.25rem; font-weight: 800; }
        .join-left h3 { font-size: 1.125rem; font-weight: 800; color: #ffffff; }
        .join-left p { color: rgba(255,255,255,0.82); font-size: 1rem; line-height: 1.7; }
        .join-left .view-jobs-btn {
          align-self: flex-start;
          min-width: min(100%, 280px);
          justify-content: center;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.14);
        }
        .quote-right {
          background:
            linear-gradient(145deg, rgba(66, 152, 204, 0.12), rgba(255, 255, 255, 0.96) 48%),
            #ffffff;
          color: #001c55;
          padding: 4rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-left: 1px solid rgba(0, 22, 137, 0.12);
        }
        .quote-text { color: #001c55; font-size: 1.125rem; font-weight: 800; line-height: 1.6; margin-bottom: 1.5rem; }
        .quote-author { font-size: 0.875rem; color: #5a6d87; }
        .fact-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
        .fact-item { display: flex; align-items: flex-start; gap: 0.875rem; }
        .fact-item svg {
          flex-shrink: 0;
          color: #001689;
          background: rgba(66, 152, 204, 0.14);
          box-shadow: 0 0 0 4px rgba(66, 152, 204, 0.08);
          border-radius: 999px;
          margin-top: 0.125rem;
        }
        .fact-item span { color: #273b59; line-height: 1.6; }

        @media (max-width: 1024px) {
          .main-promo-grid, .join-sec { grid-template-columns: 1fr; }
          .culture-grid { grid-template-columns: 1fr 1fr; }
          .benefits-row { grid-template-columns: 1fr 1fr; }
          .cta-banner-dark { flex-direction: column; text-align: center; gap: 2rem; padding: 2.5rem; }
          .cta-banner-dark div { flex-direction: column; gap: 1rem; }
          .promo-img-wrap { height: 350px; }
          .join-left, .quote-right { padding: 2.5rem; }
          .quote-right { border-left: none; border-top: 1px solid rgba(0, 22, 137, 0.12); }
        }
        @media (max-width: 640px) {
          .culture-grid, .feature-grid, .benefits-row { grid-template-columns: 1fr; }
          .promo-text h2 { font-size: 1.75rem; }
          .join-left h2 { font-size: 1.75rem; }
        }
      `}</style>

      <div className="main-promo-grid">
        <div className="promo-text">
          <h2>Advance Your Career with Us</h2>
          <h3>Grow Professionally</h3>
          <p>
            First Medical Associates offers many opportunities for professional growth and advancement.
            Join a team focused on elevating the standards for healthcare. We envision healthcare
            experiences where patients feel confident in their care, providers feel supported in
            their work, and quality drives every outcome. In some way, every team member at FMA
            helps to advance this mission, adding purpose to their profession.
          </p>
          <div className="feature-grid">
            {opportunities.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.name}
                  className="feat-item"
                  href={jobBoardUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="feat-icon"><Icon size={20} /></div>
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <span className="feat-link">
                      View Open Positions <ArrowRight size={14} />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
        <div className="promo-img-wrap">
          <img src="https://picsum.photos/seed/medical_team/1000/1000" alt="First Medical Associates team members" />
        </div>
      </div>

      <div className="cta-banner-dark">
        <div>
          <div className="cta-icon-box"><Briefcase size={28} /></div>
          <div>
            <h3>Career Opportunities</h3>
            <p>Browse current openings for provider, clinic, and corporate roles.</p>
          </div>
        </div>
        <a
          className="view-jobs-btn"
          href={jobBoardUrl}
          target="_blank"
          rel="noreferrer"
        >
          View Open Positions <ArrowRight size={18} />
        </a>
      </div>

      <section>
        <div className="sec-title">
          <h2>Why Choose Us</h2>
          <h3>FMA Offers Innovation and Empowerment</h3>
          <p>
            Our modern practices are equipped with state-of-the-art diagnostic tools and on-site
            phlebotomy services. We empower our providers by valuing clinician autonomy and helping
            them to provide innovative and personalized health care in a patient-trusted environment
            within their community. Regardless of which roles you are interested in, the high-level
            cultural values we provide make us a top choice medical group for those seeking to
            advance their career.
          </p>
        </div>
        <div className="culture-grid">
          {cultureValues.map((value) => {
            const Icon = value.icon;

            return (
              <div key={value.title} className="culture-card">
                <div className="culture-icon"><Icon size={20} /></div>
                <h4>{value.title}</h4>
                <p>{value.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="sec-title">
          <h2>Benefits We Offer</h2>
          <p>
            We provide a broad range of benefits and perks designed to support your health, your
            future, and your day-to-day quality of life.
          </p>
        </div>
        <div className="benefits-row">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div key={benefit.name} className="benefit-item">
                <div className="benefit-icon"><Icon size={18} /></div>
                <span className="benefit-name">{benefit.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="join-sec">
        <div className="join-left">
          <h3>FMA Offers More Opportunities</h3>
          <h2>A Step Above</h2>
          <p>
            Founded in 2004 by one doctor, First Medical Associates has grown from a single
            community clinic to a leading regional healthcare network with 17 locations throughout
            Maryland, expanding into Virginia in 2026. We offer a strong supportive infrastructure,
            allowing our providers to focus on patient care, with an amazing support team that
            ensures our offices run smoothly and efficiently.
          </p>
          <p>
            Enhance your professional growth through our proven mentorship and networking
            opportunities. You can make an impact on your community, with opportunities for
            advancement in your career and movement within our extensive network.
          </p>
          <a
            className="view-jobs-btn"
            style={{ marginTop: 'auto' }}
            href={jobBoardUrl}
            target="_blank"
            rel="noreferrer"
          >
            View Open Positions <ArrowRight size={18} />
          </a>
        </div>
        <div className="quote-right">
          <p className="quote-text">
            Join a healthcare organization where providers feel supported, patients feel confident,
            and quality drives every outcome.
          </p>
          <span className="quote-author">First Medical Associates careers</span>
          <div className="fact-list">
            <div className="fact-item">
              <CircleCheck size={18} />
              <span>Founded in 2004 and expanded from one clinic to a broad regional network.</span>
            </div>
            <div className="fact-item">
              <CircleCheck size={18} />
              <span>17 Maryland locations create room for advancement and internal movement.</span>
            </div>
            <div className="fact-item">
              <CircleCheck size={18} />
              <span>Support infrastructure helps teams stay focused on excellent patient care.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
