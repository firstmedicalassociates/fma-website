import { 
  CreditCard, 
  CheckCircle2, 
  ArrowRight,
  MapPin,
  Users,
  ShieldCheck,
  HelpCircle,
  FileText,
  Map,
  Activity
} from 'lucide-react';
import Link from 'next/link';

export default function InsurancePage() {
  const nationalProviders = ["Aetna", "Blue Choice", "Blue Cross Blue Shield", "Cigna", "Humana", "United Healthcare (UHC)"];
  const regionalProviders = ["CareFirst", "Johns Hopkins Health", "Kaiser Permanente"];
  const governmentPrograms = [
    { name: "Maryland Medicaid", sub: "(See details below)" },
    { name: "Medicare", sub: "(See details below)" },
    { name: "TRICARE" }
  ];
  const otherPlans = ["Oscar Health", "Magellan", "Beacon Health"];

  return (
    <div className="insurance-page-container">
      <style>{`
        .insurance-page-container { display: flex; flex-direction: column; gap: 2rem; }
        
        .top-row { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; }
        
        .ins-sidebar {
           background: #001c55;
           color: white;
           padding: 3rem 2.5rem;
           border-radius: 24px;
           display: flex;
           flex-direction: column;
           gap: 1.5rem;
        }
        .ins-sidebar h2 { font-size: 1.75rem; font-weight: 800; line-height: 1.2; }
        .ins-sidebar p { font-size: 0.9375rem; opacity: 0.8; line-height: 1.6; }
        
        .self-pay-card {
           background: rgba(255, 255, 255, 0.1);
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 20px;
           padding: 2rem;
           margin-top: 1rem;
        }
        .self-pay-card .icon-label { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .self-pay-card h3 { font-size: 1.125rem; font-weight: 700; }
        .self-pay-card .price { font-size: 2.5rem; font-weight: 800; }
        .self-pay-card .sub { font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
        .self-pay-card .desc { font-size: 0.8125rem; opacity: 0.7; margin-top: 1.5rem; line-height: 1.5; }

        .accepted-card {
           background: white;
           border: 1px solid #f1f5f9;
           border-radius: 24px;
           padding: 3rem;
           display: flex;
           flex-direction: column;
        }
        .accepted-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; }
        .accepted-header h2 { font-size: 1.5rem; font-weight: 800; color: #001c55; margin-bottom: 0.5rem; }
        .accepted-header p { font-size: 0.875rem; color: #64748b; }
        .stage-badge { background: #001c55; color: white; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.6875rem; font-weight: 700; }
        
        .providers-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .provider-col h5 { font-size: 0.6875rem; font-weight: 700; color: #0070f3; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; }
        .provider-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
        .provider-item { font-size: 0.8125rem; font-weight: 600; color: #1e293b; display: flex; align-items: flex-start; gap: 0.5rem; }
        .provider-item .dot { margin-top: 0.4rem; font-size: 1.2rem; line-height: 0; color: #10b981; }
        .provider-item div span { display: block; font-size: 0.75rem; color: #64748b; font-weight: 500; }

        .view-all-link { 
           margin-top: 3rem; border-top: 1px solid #f1f5f9; padding-top: 2rem; 
           display: flex; justify-content: center; align-items: center; gap: 0.5rem; 
           color: #001c55; font-weight: 700; font-size: 0.875rem; 
        }

        .medicaid-section {
           background: #eef4ff;
           border-radius: 24px;
           padding: 3rem;
           display: flex;
           justify-content: space-between;
           overflow: hidden;
           position: relative;
        }
        .medicaid-content { position: relative; z-index: 1; }
        .medicaid-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .medicaid-header h3 { font-size: 1.5rem; font-weight: 800; color: #001c55; }
        .medicaid-content p { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
        .medicaid-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 3rem; }
        .med-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 700; color: #1e293b; }

        .map-bg {
           position: absolute; right: -2rem; top: 50%; transform: translateY(-50%);
           opacity: 0.1; color: #001c55; pointer-events: none;
        }

        .medicare-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; }
        .medicare-card { background: #f8fafc; border-radius: 24px; padding: 2.5rem; border: 1px solid #f1f5f9; }
        .medicare-card h3 { font-size: 1.25rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; }
        .medicare-card p { font-size: 0.8125rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.5; }
        .medicare-list { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .medicare-box { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8125rem; font-weight: 700; color: #1e293b; }
        .medicare-adv { background: #f0fdf4; border-radius: 24px; padding: 2.5rem; display: flex; alignItems: flex-start; gap: 1.5rem; }
        .medicare-adv h3 { font-size: 1.25rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; }
        .medicare-adv p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

        .contact-banner {
           background: #f1f5f9; border-radius: 24px; padding: 2rem 3rem;
           display: flex; justify-content: space-between; align-items: center;
        }
        .contact-text h4 { font-size: 1.125rem; font-weight: 800; color: #001c55; margin-bottom: 0.25rem; }
        .contact-text p { font-size: 0.875rem; color: #64748b; }
        .contact-btn {
           background: white; color: #001c55; padding: 0.75rem 1.5rem; border-radius: 12px;
           font-weight: 700; font-size: 0.875rem; display: flex; align-items: center; gap: 0.75rem;
           box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        @media (max-width: 1024px) {
           .top-row, .medicare-row, .providers-grid { grid-template-columns: 1fr; }
           .medicaid-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Top Row: Sidebar + Main Accepted */}
      <div className="top-row">
        <aside className="ins-sidebar">
          <h2>Insurance & Payment Options</h2>
          <p>
            We strive to make quality care accessible and transparent. 
            Below you'll find our self-pay rate and the insurance plans we accept.
          </p>
          <div className="self-pay-card">
            <div className="icon-label">
              <FileText size={20} />
              <h3>Self-Pay Option</h3>
            </div>
            <div className="price">$150</div>
            <div className="sub">/ Consultation</div>
            <p className="desc">A simple, transparent self-pay rate for patients without insurance.</p>
          </div>
        </aside>

        <section className="accepted-card">
          <div className="accepted-header">
            <div>
              <h2>Accepted Insurance Plans</h2>
              <p>We accept a wide range of insurance plans to help you get the care you need.</p>
            </div>
            <div className="stage-badge">STAGE 1 VERIFIED</div>
          </div>

          <div className="providers-grid">
            <div className="provider-col">
              <h5>NATIONAL PROVIDERS</h5>
              <ul className="provider-list">
                {nationalProviders.map((p, i) => (
                  <li key={i} className="provider-item"><span className="dot">•</span> {p}</li>
                ))}
              </ul>
            </div>
            <div className="provider-col">
              <h5>REGIONAL PROVIDERS</h5>
              <ul className="provider-list">
                {regionalProviders.map((p, i) => (
                  <li key={i} className="provider-item"><span className="dot">•</span> {p}</li>
                ))}
              </ul>
            </div>
            <div className="provider-col">
              <h5>GOVERNMENT PROGRAMS</h5>
              <ul className="provider-list">
                {governmentPrograms.map((p, i) => (
                  <li key={i} className="provider-item">
                    <span className="dot">•</span> 
                    <div>
                      {p.name}
                      {p.sub && <span>{p.sub}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="provider-col">
              <h5>OTHER PLANS</h5>
              <ul className="provider-list">
                {otherPlans.map((p, i) => (
                  <li key={i} className="provider-item"><span className="dot">•</span> {p}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="view-all-link">
            View All 50+ Partners <ArrowRight size={16} />
          </div>
        </section>
      </div>

      {/* Maryland Medicaid Section */}
      <section className="medicaid-section">
        <div className="medicaid-content">
          <div className="medicaid-header">
            <div style={{ background: '#001c55', width: '44px', height: '44px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
               <Users size={24} color="white" />
            </div>
            <h3>Maryland Medicaid</h3>
          </div>
          <p>We accept Maryland Medicaid through the following plans:</p>
          <div className="medicaid-grid">
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> Wellpoint/AmeriGroup CareFirst Community Plan</div>
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> Amerigroup</div>
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> Aetna Medicaid</div>
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> Maryland Physicians Care</div>
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> United Health Medicaid</div>
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> Straight Medicaid</div>
            <div className="med-item"><CheckCircle2 size={18} color="#0070f3" /> Priority Partner – Johns Hopkins</div>
          </div>
        </div>
        <div className="map-bg">
           <Map size={240} strokeWidth={0.5} />
        </div>
      </section>

      {/* Medicare & Medicare Advantage */}
      <div className="medicare-row">
        <section className="medicare-card">
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#ecfdf5', width: '36px', height: '36px', borderRadius: '8px', display: 'grid', placeItems: 'center' }}>
                 <ShieldCheck size={20} color="#10b981" />
              </div>
              <h3 style={{ margin: 0 }}>Medicare</h3>
           </div>
           <p>We accept Medicare, including Medicare Advantage Plans with:</p>
           <div className="medicare-list">
              <div className="medicare-box"><CheckCircle2 size={16} color="#10b981" /> United Health Care</div>
              <div className="medicare-box"><CheckCircle2 size={16} color="#10b981" /> Amerigroup</div>
              <div className="medicare-box"><CheckCircle2 size={16} color="#10b981" /> CareFirst</div>
              <div className="medicare-box"><CheckCircle2 size={16} color="#10b981" /> Johns Hopkins</div>
              <div className="medicare-box"><CheckCircle2 size={16} color="#10b981" /> Aetna</div>
           </div>
           <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              All secondary insurances are accepted.
           </div>
        </section>

        <section className="medicare-adv">
           <div style={{ background: 'white', width: '56px', height: '56px', borderRadius: '16px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Activity size={28} color="#10b981" />
           </div>
           <div>
              <h3>Medicare Advantage</h3>
              <p>We accept Medicare Advantage plans with the providers listed.</p>
           </div>
        </section>
      </div>

      {/* Contact Banner */}
      <section className="contact-banner">
         <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: '#eef2ff', width: '48px', height: '48px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
               <HelpCircle size={24} color="#001c55" />
            </div>
            <div className="contact-text">
               <h4>Have questions about insurance coverage?</h4>
               <p>Our team is happy to help you understand your benefits and options.</p>
            </div>
         </div>
         <button className="contact-btn">
            Contact Our Team <ArrowRight size={18} />
         </button>
      </section>
    </div>
  );
}

