/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { 
  Building2, 
  ArrowRight, 
  Target, 
  Users, 
  ExternalLink,
  MapPin,
  Heart,
  ShieldCheck,
  Lightbulb
} from 'lucide-react';

export default function AboutPage() {
  const values = [
    { 
      title: 'Patient First', 
      desc: 'Every clinical decision is weighed against the ultimate benefit to the patient\'s well-being and experience.',
      icon: Users 
    },
    { 
      title: 'Total Integrity', 
      desc: 'Uncompromising adherence to the highest ethical standards in medicine and business operations.',
      icon: ShieldCheck 
    },
    { 
      title: 'Innovation', 
      desc: 'Leveraging cutting-edge technology and modern workflows to curate a superior care experience.',
      icon: Lightbulb 
    },
    { 
      title: 'Community', 
      desc: 'Building deep roots within the neighborhoods we serve through outreach and localized health advocacy.',
      icon: Heart 
    },
  ];

  return (
    <div className="about-content">
      <style>{`
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
        .dark-cta { background: #003049; color: white; }
        .cta-icon { background: rgba(255,255,255,0.1); width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; }

        .story-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; margin-bottom: 4rem; }
        .story-card { background: #f8fafc; border-radius: 24px; padding: 3rem; position: relative; overflow: hidden; }
        .map-card { background: #f1f5f9; border-radius: 24px; padding: 3rem; display: flex; flex-direction: column; justify-content: space-between; position: relative; }

        .banner-cta {
          background: #001c55; padding: 3rem 4rem; border-radius: 24px; color: white;
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rem;
        }
        .banner-cta h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; }
        .banner-cta p { opacity: 0.8; }
        .banner-btn { background: white; color: #001c55; padding: 1rem 2rem; border-radius: 12px; font-weight: 800; display: flex; align-items: center; gap: 1rem; }

        .value-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .value-card { background: #f8fafc; padding: 2.5rem; border-radius: 20px; }
        .value-icon { background: #e8f0fe; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #001c55; margin-bottom: 1.5rem; }
        .value-card h4 { font-size: 1.25rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; }
        .value-card p { font-size: 0.875rem; color: #64748b; line-height: 1.6; }

        @media (max-width: 1024px) {
          .stats-grid { grid-template-columns: 1fr; }
          .text-card, .dark-card { padding: 2.5rem; }
          .cta-row { grid-template-columns: 1fr; }
          .story-grid { grid-template-columns: 1fr; }
          .value-grid { grid-template-columns: 1fr 1fr; }
          .banner-cta { flex-direction: column; text-align: center; justify-content: center; gap: 2rem; padding: 2.5rem; }
          .stats-row { flex-wrap: wrap; gap: 2rem; }
        }
        @media (max-width: 640px) {
          .text-card h2, .dark-card h2 { font-size: 1.75rem; }
          .text-card, .dark-card { padding: 1.5rem; }
          .value-grid { grid-template-columns: 1fr; }
          .stats-row { flex-direction: column; gap: 1.5rem; }
          .story-card, .map-card { padding: 1.5rem; }
        }
      `}</style>

      {/* stats section */}
      <div className="stats-grid">
        <div className="text-card">
          <h2>Built on Two Decades of Excellence</h2>
          <p>
            Founded in 2004, First Medical Associates has grown from a single community clinic 
            to a leading regional network, driven by a philosophy of high-end editorial care and medical quiet.
          </p>
          <div className="stats-row">
            <div className="stat-item"><h4>20+</h4><p>Years of Service</p></div>
            <div className="stat-item"><h4>14</h4><p>Premium Locations</p></div>
            <div className="stat-item"><h4>75+</h4><p>Clinical Providers</p></div>
          </div>
        </div>
        <div className="dark-card">
          <div style={{ background: 'rgba(255,255,255,0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'grid', placeItems: 'center', marginBottom: '2rem' }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2>Patient-First Architecture</h2>
            <p>
              Our clinics are designed to reduce anxiety, focusing on a sensory-rich environment 
              that prioritizes patient comfort and clinical efficiency.
            </p>
            <button className="tour-btn">Tour Our Facilities <ArrowRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* job & partner ctas */}
      <div className="cta-row">
        <div className="cta-card">
          <div className="num-box">12</div>
          <div>
            <h4 style={{ fontWeight: 800, color: '#001c55', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Advance Your Career</h4>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}> Join a network that values clinician autonomy and patient satisfaction above all else.</p>
            <button style={{ color: '#0070f3', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              View Career Opportunities <ExternalLink size={14} />
            </button>
          </div>
        </div>
        <div className="cta-card dark-cta">
           <div className="cta-icon"><Handshake size={32} /></div>
           <div>
            <h4 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Partner With Us</h4>
            <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1rem' }}> Empowering independent practitioners through our shared administrative ecosystem.</p>
            <button style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Learn About Growth <ArrowRight size={14} />
            </button>
           </div>
        </div>
      </div>

      {/* story & map */}
      <div className="story-grid">
         <div className="story-card">
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#001c55', marginBottom: '1.5rem' }}>Our Story</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.7, marginBottom: '2rem' }}>
              What began as a single clinic with a vision to provide exceptional care has grown into a trusted network of medical professionals united by a shared mission.
              <br/><br/>
              Through intentional growth, innovation, and a relentless focus on patients, we continue to expand our impact—one community at a time.
            </p>
            <button style={{ color: '#001c55', fontWeight: 800, fontSize: '0.875rem', border: '1px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               Learn More About Our History <ArrowRight size={16} />
            </button>
         </div>
         <div className="map-card">
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#001c55', marginBottom: '1.5rem' }}>Where We Serve</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.7, maxWidth: '300px' }}>
                Our clinics are located in communities across the Southeast, bringing accessible, high-quality care closer to where people live, work, and play.
              </p>
            </div>
            <img src="https://picsum.photos/seed/map/600/400" style={{ position: 'absolute', right: 0, bottom: 0, height: '100%', opacity: 0.1, pointerEvents: 'none' }} alt="Map" />
            <button style={{ color: '#001c55', fontWeight: 800, fontSize: '0.875rem', border: '1px solid #e2e8f0', background: 'white', padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '2rem' }}>
               View Our Locations <ArrowRight size={16} />
            </button>
         </div>
      </div>

      {/* banner cta */}
      <div className="banner-cta">
        <div>
          <div style={{ background: 'rgba(255,255,255,0.1)', width: '56px', height: '56px', borderRadius: '50%', display: 'grid', placeItems: 'center', marginBottom: '1.5rem' }}>
             <Heart size={28} />
          </div>
          <h2>Healthcare Built on Relationships</h2>
          <p>We believe the foundation of great healthcare is trust. We're honored to be part of the communities we serve.</p>
        </div>
        <button className="banner-btn">Find Care Near You <ArrowRight size={18} /></button>
      </div>

      {/* values */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
           <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#001c55' }}>Our Core Values</h2>
           <span style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic' }}>Guided by integrity since 2004</span>
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

