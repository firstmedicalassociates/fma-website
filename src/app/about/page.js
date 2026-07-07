import Link from "next/link";
import { buildStaticMetadata } from "../lib/seo";
import { 
  Building2, 
  ArrowRight, 
  Target,
  Users, 
  ExternalLink,
  MapPin,
  Heart,
  ShieldCheck,
  Award,
  CircleCheck
} from 'lucide-react';

export const metadata = buildStaticMetadata({
  title: "About First Medical Associates | Primary Care Team in Maryland",
  description:
    "Learn about First Medical Associates, our mission, leadership, and patient-first approach to primary care and coordinated healthcare in Maryland.",
  pathname: "/about",
});

export default function AboutPage() {
  const values = [
    { 
      title: 'PATIENT FOCUS', 
      desc: 'We put patients at the center of every decision and exceed their expectations at every opportunity.',
      icon: Target 
    },
    { 
      title: 'EXCELLENCE', 
      desc: 'We commit ourselves to high standards and continuous improvement.',
      icon: Award 
    },
    { 
      title: 'INTEGRITY', 
      desc: 'We do what we say we will do - every time - with honesty and transparency.',
      icon: ShieldCheck 
    },
    { 
      title: 'COMPASSION', 
      desc: 'We lead with empathy and humanity, recognizing that every person deserves respect.',
      icon: Heart 
    },
    { 
      title: 'ACCOUNTABILITY', 
      desc: 'We celebrate our successes, take ownership of our mistakes and always deliver on our commitments.',
      icon: CircleCheck 
    },
  ];

  const timelineItems = [
    { year: '2008', event: 'First same-day care center opened in Olney, Maryland' },
    { year: '2009', event: 'Relocated to Germantown' },
    { year: '2011', event: 'Transitioned to a primary care model' },
    { year: '2014', event: 'Second location opened in Gaithersburg' },
    { year: '2018', event: 'Second physician was hired' },
    { year: '2019', event: 'Germantown grew to two MDs and two PAs' },
    { year: '2020', event: 'Rockville location opened' },
    { year: '2021', event: 'Columbia location opened' },
    { year: '2022', event: 'Bowie location opened' },
    { year: '2023', event: 'Nottingham and Silver Spring locations opened' },
    { year: '2024', event: 'Frederick location opened' },
    { year: '2025', event: 'Annapolis, Severna Park, and Glen Burnie locations opened' },
  ];

  return (
    <div className="about-content">
      <style>{`
        .about-content {
          display: flow-root;
          padding-bottom: 4rem;
        }

        .stats-grid { 
          display: grid; 
          grid-template-columns: 1.5fr 1fr; 
          gap: 2.5rem; 
          margin-bottom: 4rem; 
        }
        .text-card {
          background: #f8fafc;
          border-radius: 32px;
          padding: 4rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          background-image: linear-gradient(135deg, rgba(255,255,255,0.4), transparent);
        }
        .text-card h2 { font-size: 2.25rem; font-weight: 800; color: #001c55; }
        .text-card h3 { font-size: 1.125rem; font-weight: 800; color: #0b4f96; margin-top: -1rem; }
        .text-card p { color: #475569; line-height: 1.8; font-size: 1.125rem; }
        .stats-row { display: flex; gap: 4rem; margin-top: 2rem; }
        .stat-item h4 { font-size: 2.5rem; font-weight: 800; color: #001c55; margin-bottom: 0.5rem; }
        .stat-item p { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }

        .dark-card {
          background: #001c55;
          border-radius: 32px;
          padding: 4rem;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .dark-card h2 { font-size: 2rem; font-weight: 800; margin-bottom: 1.5rem; }
        .dark-card p { opacity: 0.8; line-height: 1.7; margin-bottom: 3rem; }
        .tour-btn { 
          background: white; color: #001c55; border: none; padding: 1rem 2rem; 
          border-radius: 12px; font-weight: 800; display: flex; align-items: center; 
          gap: 1rem; width: fit-content; margin-top: auto;
        }

        .cta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 4rem; }
        .cta-card { 
          background: #f1f5f9; padding: 3rem; border-radius: 24px; 
          display: flex; align-items: center; gap: 2rem;
        }
        .num-box { 
          background: white; width: 80px; height: 80px; border-radius: 16px; 
          display: grid; place-items: center; font-size: 1.5rem; font-weight: 800; color: #001c55;
        }
        .dark-cta { background: #e8f0fe; color: #001c55; }
        .cta-icon { background: rgba(255,255,255,0.1); width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; }
        .dark-cta .cta-icon { background: rgba(255,255,255,0.78); box-shadow: 0 10px 24px rgba(15, 35, 88, 0.08); }

        .story-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.35fr);
          gap: 2rem;
          margin-bottom: 4rem;
          align-items: stretch;
        }
        .story-card,
        .map-card {
          border-radius: 24px;
          padding: 3rem;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(0, 28, 85, 0.08);
          box-shadow: 0 18px 45px rgba(15, 35, 88, 0.07);
        }
        .story-card {
          background:
            linear-gradient(145deg, rgba(232, 240, 254, 0.78), rgba(255, 255, 255, 0.9)),
            #f8fafc;
        }
        .map-card {
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .story-card::after {
          content: "";
          position: absolute;
          inset: auto -70px -95px auto;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: rgba(29, 78, 216, 0.08);
          pointer-events: none;
        }
        .section-eyebrow {
          color: #1d4ed8;
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 0.65rem;
        }
        .section-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #001c55;
          margin-bottom: 1.25rem;
        }
        .section-intro {
          font-size: 0.9375rem;
          color: #475569;
          line-height: 1.75;
          margin-bottom: 2rem;
        }
        .timeline-panel {
          position: relative;
          z-index: 1;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(0, 28, 85, 0.1);
          border-radius: 20px;
          padding: 1.5rem;
        }
        .timeline-list {
          list-style: none;
          display: grid;
          gap: 1.15rem;
          margin: 0;
          padding: 0;
          position: relative;
        }
        .timeline-list::before {
          content: "";
          position: absolute;
          top: 0.25rem;
          bottom: 0.25rem;
          left: 0.45rem;
          width: 2px;
          background: linear-gradient(180deg, #001c55 0%, #1d4ed8 58%, #72a7ff 100%);
          border-radius: 999px;
        }
        .timeline-item {
          position: relative;
          display: grid;
          gap: 0.2rem;
          padding-left: 2rem;
        }
        .timeline-item::before {
          content: "";
          position: absolute;
          left: 0.1rem;
          top: 0.26rem;
          width: 0.72rem;
          height: 0.72rem;
          border-radius: 999px;
          background: #ffffff;
          border: 3px solid #1d4ed8;
          box-shadow: 0 0 0 4px rgba(29, 78, 216, 0.12);
        }
        .timeline-year {
          color: #001c55;
          font-size: 0.82rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .timeline-event {
          color: #475569;
          font-size: 0.92rem;
          font-weight: 700;
          line-height: 1.45;
        }
        .history-header {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .history-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #e8f0fe;
          color: #001c55;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .history-copy {
          display: grid;
          gap: 1.05rem;
          color: #475569;
          font-size: 0.92rem;
          line-height: 1.72;
        }

        .cta-link-btn {
          appearance: none;
          border: none;
          background: transparent;
          color: #0b4f96;
          font-weight: 800;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0;
          cursor: pointer;
          transition: color 180ms ease, transform 180ms ease;
        }
        .cta-link-btn:hover {
          color: #001c55;
          transform: translateX(1px);
        }
        .cta-link-btn.light {
          color: #ffffff;
        }
        .cta-link-btn.light:hover {
          color: #dbeafe;
        }

        .cta-surface-btn {
          appearance: none;
          border: 1px solid rgba(0, 28, 85, 0.14);
          background: linear-gradient(135deg, #0f2358 0%, #1b4ec9 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 0.875rem;
          padding: 0.85rem 1.5rem;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(15, 35, 88, 0.18);
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .cta-surface-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(15, 35, 88, 0.24);
        }
        .cta-surface-btn.light {
          border-color: rgba(0, 28, 85, 0.16);
          background: rgba(255, 255, 255, 0.92);
          color: #001c55;
          box-shadow: 0 10px 22px rgba(15, 35, 88, 0.12);
        }
        .cta-surface-btn.light:hover {
          box-shadow: 0 14px 28px rgba(15, 35, 88, 0.18);
        }

        .value-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 2rem; }
        .value-card { background: #f8fafc; padding: 2.5rem; border-radius: 20px; }
        .value-icon { background: #e8f0fe; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #001c55; margin-bottom: 1.5rem; }
        .value-card h4 { font-size: 1rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; letter-spacing: 0.04em; }
        .value-card p { font-size: 0.875rem; color: #64748b; line-height: 1.6; }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: 1fr; }
          .text-card, .dark-card { padding: 2.5rem; }
          .cta-row { grid-template-columns: 1fr; }
          .story-grid { grid-template-columns: 1fr; }
          .value-grid { grid-template-columns: 1fr 1fr; }
          .stats-row { flex-wrap: wrap; gap: 2rem; }
        }
        @media (max-width: 640px) {
          .text-card h2, .dark-card h2 { font-size: 1.75rem; }
          .text-card, .dark-card { padding: 1.5rem; }
          .value-grid { grid-template-columns: 1fr; }
          .stats-row { flex-direction: column; gap: 1.5rem; }
          .story-card, .map-card { padding: 1.5rem; }
          .history-header { align-items: flex-start; }
          .timeline-panel { padding: 1.25rem; }
        }
      `}</style>

      {/* stats section */}
      <div className="stats-grid">
        <div className="text-card">
          <h2>Our Legacy of Care</h2>
          <h3>Personalized Healthcare in a Trusted Environment</h3>
          <p>
            Founded in 2004, First Medical Associates has grown from a single community clinic 
            to a leading regional healthcare network with 17 locations throughout Maryland. Our
            expert team of physicians and advanced care practitioners specialize in providing
            prompt, accurate diagnosis and comprehensive, personalized treatment by developing a
            trusting relationship with their patients.
          </p>
          <div className="stats-row">
            <div className="stat-item"><h4>20+</h4><p>Years of Service</p></div>
            <div className="stat-item"><h4>17</h4><p>Premium Locations</p></div>
            <div className="stat-item"><h4>75+</h4><p>Clinical Providers</p></div>
          </div>
        </div>
        <div className="dark-card">
          <div style={{ background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'grid', placeItems: 'center', marginBottom: '2rem' }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2>Comprehensive Healthcare Near You</h2>
            <p>
              Our modern practices are equipped with on-site laboratories and diagnostic tools,
              ensuring our patients receive innovative and personalized health care in a trusted
              environment within their community.
            </p>
            <button className="tour-btn">Tour Our Facilities <ArrowRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* job & partner ctas */}
      <div className="cta-row">
        <div className="cta-card">
          <div className="num-box"><Users size={28} /></div>
          <div>
            <h4 style={{ fontWeight: 800, color: '#001c55', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Advance Your Career</h4>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>Build your career with a network that values clinician autonomy and patient satisfaction above all else.</p>
            <Link className="cta-link-btn" href="/about/careers">
              View Career Opportunities <ExternalLink size={14} />
            </Link>
          </div>
        </div>
        <div className="cta-card dark-cta">
           <div className="cta-icon"><Handshake size={32} /></div>
           <div>
            <h4 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Partnering With Our Community</h4>
            <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1rem' }}>Empowering independent practitioners through a shared community focus.</p>
            <Link className="cta-link-btn" href="/about/partners">
              Learn About Growth <ArrowRight size={14} />
            </Link>
           </div>
        </div>
      </div>

      {/* story & history */}
      <div className="story-grid">
         <div className="story-card">
            <div className="section-eyebrow">Our Timeline</div>
            <h3 className="section-title">Our Story</h3>
            <p className="section-intro">
              From one same-day care center in Olney to a growing regional primary care network,
              these milestones reflect the communities, providers, and patients that shaped First Medical Associates.
            </p>
            <div className="timeline-panel">
              <ol className="timeline-list" aria-label="First Medical Associates timeline">
                {timelineItems.map((item) => (
                  <li className="timeline-item" key={item.year}>
                    <span className="timeline-year">{item.year}</span>
                    <span className="timeline-event">{item.event}</span>
                  </li>
                ))}
              </ol>
            </div>
         </div>
         <div className="map-card">
            <div className="history-header">
              <div className="history-icon" aria-hidden="true">
                <MapPin size={22} />
              </div>
              <div>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Our History</h3>
              </div>
            </div>
            <div className="history-copy">
              <p>
                Dr. Malik opened his first clinic in 2008 in Olney, Maryland, relocating to Germantown in 2009. The clinic began as a same-day care center operating seven days per week with just Dr. Malik, one front desk staff member, and one medical assistant. We transitioned to a primary care model and added a full-time Physician Assistant in 2011, operating six days a week for several years before moving to five days per week in 2015.
              </p>
              <p>
                Our second location opened in Gaithersburg, Maryland in 2014. Another PA was hired and Dr. Malik split his time between the two locations for the next four years. Expansion and growth has continued at a rapid rate with new locations opening every year since 2019 and three locations opening in 2025. We have expanded to over 15 locations in Maryland and our first Virginia location opened in 2026.
              </p>
              <p>
                We have had some key milestones and services added over time to better serve our patients and ensure our doctors had the best resources at their fingertips. In 2011, we enrolled in CareFirst Patient-Centered Medical Home. This is a program designed to incentivize and provide resources, data and programs to assist health care providers in delivering quality, cost efficient care.
              </p>
              <p>
                The CareFirst PCMH program places an emphasis on helping providers provide comprehensive, coordinated care for their CareFirst patients with the greatest health needs, typically those suffering from multiple chronic health conditions. The program requires significant provider and patient engagement and meaningfully compensates primary care providers for that engagement. For patients, this program ensures healthier outcomes.
              </p>
              <p>
                In 2019, when Maryland began the Maryland Primary Care Program (MDPCP) to transition the health care system away from encouraging more services and higher costs to one that rewards efficiency, value, and better health outcomes, we were one of the first to join. We have been proud to be a part of a program intended to support the delivery of advanced primary care throughout the state and allow community providers to play a vital role in prevention, improving health outcomes and controlling total health care spending growth.
              </p>
              <p>
                We have a diverse and experienced medical and support staff that are proud to be a part of a health care network that focuses on patients first. With their varied expertise, extensive language skills, and an abundance of different experiences, we are strongly positioned to meet the needs of each of the growing communities we serve. Our state-of-the-art facilities, including on-site phlebotomy services in many locations, help to ensure our patients and providers have the best resources available.
              </p>
            </div>
            <button className="cta-surface-btn light" style={{ width: 'fit-content', marginTop: '2rem' }}>
               View Our Locations <ArrowRight size={16} />
            </button>
         </div>
      </div>

      {/* values */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
           <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#001c55' }}>Our Core Values</h2>
           <span style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic' }}>Guided by integrity since 2008</span>
        </div>
        <div className="value-grid">
           {values.map((v, i) => {
             const Icon = v.icon;
             return (
               <div key={i} className="value-card">
                 <div className="value-icon"><Icon size={20} /></div>
                 <h4>{v.title}</h4>
                 <p>{v.desc}</p>
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
}

function Handshake({ size, ...props }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2004/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="m11 17 2 2 6-6" />
      <path d="m18 14 2.5 2.5a3.3 3.3 0 0 1 0 4.7 3.3 3.3 0 0 1-4.7 0L13.5 19" />
      <path d="M18 13c0-.6-.4-1-1-1s-1 .4-1 1 .4 1 1 1 1-.4 1-1Z" />
      <path d="M14 9V5a2 2 0 0 0-2-2l-6 4a2 2 0 0 0-1 1.7V17a2 2 0 0 0 2 2h2" />
      <path d="M10 19v-5a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

