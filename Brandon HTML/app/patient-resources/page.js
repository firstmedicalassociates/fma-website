import { 
  MapPin, 
  Users, 
  Clock, 
  PlusSquare, 
  Phone,
  ArrowRight,
  ChevronRight,
  FileText,
  Share2,
  ShieldCheck,
  Package
} from 'lucide-react';
import Link from 'next/link';

export default function ResourcesOverview() {
  const sidebarActions = [
    { title: 'Find Location', sub: '12 Clinics Nationwide', icon: MapPin },
    { title: 'Patient Portal', sub: 'Access Records & Results', icon: Users },
    { title: 'Schedule Walk-in', sub: 'Same-day Appointments', icon: Clock },
  ];

  return (
    <div className="overview-layout">
      <style>{`
        .overview-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 2rem;
          margin-top: 1rem;
        }
        
        /* Sidebar Styles */
        .plan-sidebar {
          background: #001c55;
          color: white;
          padding: 2.5rem 2rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .sidebar-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .action-card {
           background: rgba(255, 255, 255, 0.1);
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 16px;
           padding: 1.25rem;
           display: flex;
           align-items: center;
           gap: 1rem;
           transition: background 0.2s;
           cursor: pointer;
           text-align: left;
           width: 100%;
        }
        .action-card:hover { background: rgba(255, 255, 255, 0.15); }
        .action-icon {
           background: rgba(255, 255, 255, 0.1);
           width: 44px;
           height: 44px;
           border-radius: 12px;
           display: grid;
           place-items: center;
           flex-shrink: 0;
        }
        .action-text h4 { font-size: 0.9375rem; font-weight: 700; }
        .action-text p { font-size: 0.75rem; opacity: 0.7; margin-top: 2px; }
        
        .need-assistance {
           background: #e1f0f7;
           color: #001c55;
           padding: 2rem;
           border-radius: 20px;
           margin-top: 1.5rem;
           position: relative;
           overflow: hidden;
        }
        .need-assistance h3 { font-size: 1.25rem; margin-bottom: 0.75rem; z-index: 1; position: relative; }
        .need-assistance p { font-size: 0.8125rem; color: #444; margin-bottom: 1.5rem; line-height: 1.5; z-index: 1; position: relative; }
        .call-btn {
           background: #0070a4;
           color: white;
           width: 100%;
           padding: 0.875rem;
           border-radius: 12px;
           font-weight: 700;
           display: flex;
           align-items: center;
           justify-content: center;
           gap: 0.75rem;
           z-index: 1;
           position: relative;
        }
        .bg-pattern {
           position: absolute;
           bottom: -20px;
           right: -20px;
           opacity: 0.1;
           z-index: 0;
        }

        /* Main Content Styles */
        .main-col { display: flex; flex-direction: column; gap: 2rem; }
        
        .insurance-overview {
           background: #f8f9fa;
           border-radius: 24px;
           padding: 3rem;
           border: 1px solid #eee;
        }
        .ins-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .status-badge { background: #001c55; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; }
        .ins-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .ins-col h5 { font-size: 0.6875rem; font-weight: 700; color: #0070f3; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .ins-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
        .ins-item { font-size: 0.8125rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .dot { width: 4px; height: 4px; background: #0070f3; border-radius: 50%; display: inline-block; }

        .form-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .form-lite-card {
           background: white;
           border: 1px solid #eee;
           padding: 2.5rem;
           border-radius: 20px;
           display: flex;
           flex-direction: column;
           gap: 1rem;
        }
        .form-lite-card h3 { font-size: 1.25rem; color: #1a1a1a; }
        .form-lite-card p { font-size: 0.875rem; color: #666; line-height: 1.5; }
        .lite-link { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; font-size: 0.875rem; color: #0070f3; margin-top: 1rem; }
        .lite-link span { font-size: 0.6875rem; font-weight: 500; color: #999; }

        .rights-banner {
           background: #f8f9fa;
           border-radius: 24px;
           padding: 3rem;
           display: flex;
           flex-direction: column;
           gap: 2rem;
        }
        .rights-header { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: #001c55; }
        .rights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .right-item {
           background: white;
           padding: 1.5rem;
           border-radius: 16px;
           border: 1px solid #eee;
        }
        .right-item h5 { font-size: 0.75rem; font-weight: 700; color: #0070f3; text-transform: uppercase; margin-bottom: 0.5rem; }
        .right-item p { font-size: 0.8125rem; color: #666; line-height: 1.4; }

        @media (max-width: 992px) {
          .overview-layout { grid-template-columns: 1fr; }
          .ins-grid, .form-cards, .rights-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Sidebar Section */}
      <aside className="sidebar-col">
        <div className="plan-sidebar">
          <h2 className="sidebar-title">Plan Your Visit</h2>
          {sidebarActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button key={i} className="action-card">
                <div className="action-icon">
                  <Icon size={20} color="white" />
                </div>
                <div className="action-text">
                  <h4>{action.title}</h4>
                  <p>{action.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="need-assistance">
          <h3>Need Assistance?</h3>
          <p>
            Our patient care team is available 24/7 for 
            urgent inquiries and navigation help.
          </p>
          <button className="call-btn">
            <Phone size={18} fill="currentColor" /> Call Support
          </button>
          <div className="bg-pattern">
             <PlusSquare size={120} />
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="main-col">
        <section className="insurance-overview">
          <div className="ins-header">
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Accepted Insurance</h2>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>Updated weekly. Please verify with your carrier.</p>
            </div>
            <div className="status-badge">STAGE 1 VERIFIED</div>
          </div>

          <div className="ins-grid">
            <div className="ins-col">
              <h5>National</h5>
              <ul className="ins-list">
                <li className="ins-item"><span className="dot"></span> Aetna</li>
                <li className="ins-item" style={{ opacity: 0.8 }}><span className="dot" style={{ opacity: 0.5 }}></span> BlueCross BlueShield</li>
                <li className="ins-item"><span className="dot"></span> Cigna</li>
              </ul>
            </div>
            <div className="ins-col">
              <h5>Regional</h5>
              <ul className="ins-list">
                <li className="ins-item"><span className="dot"></span> Humana</li>
                <li className="ins-item"><span className="dot"></span> Kaiser Permanente</li>
                <li className="ins-item"><span className="dot"></span> UnitedHealthcare</li>
              </ul>
            </div>
            <div className="ins-col">
              <h5>Government</h5>
              <ul className="ins-list">
                <li className="ins-item"><span className="dot"></span> Medicare</li>
                <li className="ins-item"><span className="dot"></span> Medicaid</li>
                <li className="ins-item"><span className="dot"></span> TRICARE</li>
              </ul>
            </div>
            <div className="ins-col">
              <h5>Specialized</h5>
              <ul className="ins-list">
                <li className="ins-item"><span className="dot"></span> Oscar Health</li>
                <li className="ins-item"><span className="dot"></span> Magellan</li>
                <li className="ins-item"><span className="dot"></span> Beacon Health</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
             <Link href="/patient-resources/insurance" style={{ color: '#001c55', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
               View All 50+ Partners <ArrowRight size={16} />
             </Link>
          </div>
        </section>

        <section className="form-cards">
           <div className="form-lite-card">
              <div style={{ background: '#e8f0fe', width: '48px', height: '48px', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#001c55' }}>
                 <FileText size={24} />
              </div>
              <h3>New Patient Paperwork</h3>
              <p>Save 15 minutes at check-in by completing your initial intake online.</p>
              <div className="lite-link">
                 Start Form <span>PDF / WEB</span>
              </div>
           </div>
           <div className="form-lite-card">
              <div style={{ background: '#e8f0fe', width: '48px', height: '48px', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#001c55' }}>
                 <Share2 size={24} />
              </div>
              <h3>Medical Records Release</h3>
              <p>HIPAA-compliant authorization to transfer your health history safely.</p>
              <div className="lite-link">
                 Request Access <span>Docusign</span>
              </div>
           </div>
        </section>

        <section className="rights-banner">
           <div className="rights-header">
              <ShieldCheck size={20} color="#0070f3" />
              Your Rights & Responsibilities
           </div>
           <div className="rights-grid">
              <div className="right-item">
                 <h5>Privacy Policy</h5>
                 <p>How we protect and use your confidential medical data under HIPAA.</p>
              </div>
              <div className="right-item">
                 <h5>Patient Code</h5>
                 <p>Our commitment to respectful, high-quality care for every visitor.</p>
              </div>
              <div className="right-item">
                 <h5>No Surprises Act</h5>
                 <p>Clear pricing and protection against unexpected medical bills.</p>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
