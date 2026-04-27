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
  UserPlus,
  Coins,
  Calendar,
  Award,
  CircleCheck,
  Quote
} from 'lucide-react';

export default function CareersPage() {
  const benefits = [
    { name: 'Medical, Dental & Vision', icon: Users },
    { name: '401(k) with Company Match', icon: UserPlus },
    { name: 'Paid Time Off & Holidays', icon: Calendar },
    { name: 'Wellness Programs', icon: Activity },
    { name: 'Life & Disability Insurance', icon: ShieldCheck },
  ];

  return (
    <div className="careers-content">
      <style>{`
        .careers-content { width: 100%; display: flex; flex-direction: column; gap: 4rem; margin-bottom: 4rem; }
        
        .main-promo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
        .promo-text h2 { font-size: 2.25rem; font-weight: 800; color: #001c55; margin-bottom: 1.5rem; line-height: 1.2; }
        .promo-text p { color: #475569; font-size: 1.125rem; line-height: 1.7; margin-bottom: 3rem; }
        
        .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .feat-item { display: flex; gap: 1rem; align-items: flex-start; }
        .feat-icon { 
          background: #eef4ff; width: 44px; height: 44px; border-radius: 12px; 
          display: grid; place-items: center; color: #0070f3; flex-shrink: 0;
        }
        .feat-item h4 { font-size: 1rem; font-weight: 800; color: #001c55; margin-bottom: 0.25rem; }
        .feat-item p { font-size: 0.8125rem; color: #64748b; line-height: 1.4; }

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
        .view-jobs-btn { background: white; color: #001c55; padding: 1rem 2rem; border-radius: 12px; font-weight: 800; display: flex; align-items: center; gap: 0.75rem; }

        .sec-title { margin-bottom: 2.5rem; }
        .sec-title h2 { font-size: 2rem; font-weight: 800; color: #001c55; margin-bottom: 0.5rem; }
        .sec-title p { color: #64748b; font-size: 1rem; }

        .culture-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .culture-card { background: #f8fafc; padding: 2.5rem; border-radius: 24px; }
        .culture-icon { background: #eef4ff; width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; color: #0070f3; margin-bottom: 1.5rem; }
        .culture-card h4 { font-size: 1rem; font-weight: 800; color: #001c55; margin-bottom: 0.75rem; }
        .culture-card p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

        .dev-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; padding: 3rem 0; }
        .dev-item { display: flex; align-items: center; gap: 1.5rem; padding: 0 1rem; }
        .dev-item:not(:last-child) { border-right: 1px solid #f1f5f9; }
        .dev-icon { background: #f1f5f9; width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; color: #001c55; flex-shrink: 0; }
        .dev-item h4 { font-size: 0.9375rem; font-weight: 800; color: #001c55; margin-bottom: 0.25rem; }
        .dev-item p { font-size: 0.8125rem; color: #64748b; line-height: 1.4; }

        .benefits-row { display: flex; justify-content: space-between; overflow-x: auto; gap: 2rem; padding: 1rem 0; }
        .benefit-item { display: flex; align-items: center; gap: 1rem; white-space: nowrap; }
        .benefit-icon { background: #f1f5f9; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #001c55; flex-shrink: 0; }
        .benefit-name { font-size: 0.8125rem; font-weight: 700; color: #475569; }

        .join-sec { display: grid; grid-template-columns: 1fr 1fr; background: #003049; border-radius: 24px; overflow: hidden; color: white; }
        .join-left { padding: 4rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .join-left h2 { font-size: 2.25rem; font-weight: 800; }
        .join-left p { opacity: 0.8; font-size: 1rem; line-height: 1.6; }
        .quote-right { background: rgba(255,255,255,0.05); padding: 4rem; display: flex; flex-direction: column; justify-content: center; position: relative; }
        .quote-icon { opacity: 0.3; margin-bottom: 1.5rem; }
        .quote-text { font-size: 1.25rem; font-weight: 600; line-height: 1.6; margin-bottom: 1.5rem; }
        .quote-author { font-size: 0.875rem; color: #94a3b8; }

        @media (max-width: 1024px) {
          .main-promo-grid, .dev-row, .join-sec { grid-template-columns: 1fr; }
          .culture-grid { grid-template-columns: 1fr 1fr; }
          .dev-item { border-right: none !important; border-bottom: 1px solid #f1f5f9; padding: 1.5rem 0; }
          .dev-row { padding: 0; }
          .cta-banner-dark { flex-direction: column; text-align: center; gap: 2rem; padding: 2.5rem; }
          .cta-banner-dark div { flex-direction: column; gap: 1rem; }
          .promo-img-wrap { height: 350px; }
          .join-left, .quote-right { padding: 2.5rem; }
        }
        @media (max-width: 640px) {
          .culture-grid { grid-template-columns: 1fr; }
          .feature-grid { grid-template-columns: 1fr; }
          .promo-text h2 { font-size: 1.75rem; }
          .join-left h2 { font-size: 1.75rem; }
        }
      `}</style>

      {/* Main Promo */}
      <div className="main-promo-grid">
        <div className="promo-text">
          <h2>Purpose-Driven. Patient-Focused. People Empowered.</h2>
          <p>
            At First Medical Associates, your work has meaning. We support your growth, 
            value your voice, and empower you to deliver exceptional care every day.
          </p>
          <div className="feature-grid">
            <div className="feat-item">
              <div className="feat-icon"><Heart size={20} /></div>
              <div>
                <h4>Make an Impact</h4>
                <p>Improve lives and strengthen communities.</p>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-icon"><Users size={20} /></div>
              <div>
                <h4>Collaborative Teams</h4>
                <p>Work alongside passionate colleagues.</p>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-icon"><Award size={20} /></div>
              <div>
                <h4>Career Growth</h4>
                <p>Access training and mentorship.</p>
              </div>
            </div>
            <div className="feat-item">
              <div className="feat-icon"><Activity size={20} /></div>
              <div>
                <h4>Work-Life Balance</h4>
                <p>Promoting well-being for your family.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="promo-img-wrap">
          <img src="https://picsum.photos/seed/medical_team/1000/1000" alt="Medical Team" />
        </div>
      </div>

      {/* Opportunity Banner */}
      <div className="cta-banner-dark">
        <div>
          <div className="cta-icon-box"><Briefcase size={28} /></div>
          <div>
            <h3>Find Your Next Opportunity</h3>
            <p>Explore roles across our clinics and corporate teams.</p>
          </div>
        </div>
        <button className="view-jobs-btn">View Open Positions <ArrowRight size={18} /></button>
      </div>

      {/* Culture Section */}
      <section>
        <div className="sec-title">
          <h2>Our Culture</h2>
          <p>A supportive environment where you're valued, heard, and empowered to grow.</p>
        </div>
        <div className="culture-grid">
          <div className="culture-card">
            <div className="culture-icon"><Users size={20} /></div>
            <h4>Patient First</h4>
            <p>We put patients at the center of everything we do.</p>
          </div>
          <div className="culture-card">
            <div className="culture-icon"><ShieldCheck size={20} /></div>
            <h4>Respect & Inclusion</h4>
            <p>We celebrate diverse perspectives and treat everyone with respect.</p>
          </div>
          <div className="culture-card">
            <div className="culture-icon"><CircleCheck size={20} /></div>
            <h4>Integrity</h4>
            <p>We do the right thing, every time.</p>
          </div>
          <div className="culture-card">
            <div className="culture-icon"><Target size={20} /></div>
            <h4>Excellence</h4>
            <p>We strive for continuous improvement in all we do.</p>
          </div>
        </div>
      </section>

      {/* Growth section */}
      <section>
        <div className="sec-title">
          <h2>Growth & Development</h2>
          <p>We invest in you—because your growth drives our mission forward.</p>
        </div>
        <div className="dev-row">
           <div className="dev-item">
              <div className="dev-icon"><ClipboardCheck size={24} /></div>
              <div>
                <h4>Onboarding & Training</h4>
                <p>Comprehensive orientation and ongoing training.</p>
              </div>
           </div>
           <div className="dev-item">
              <div className="dev-icon"><Users size={24} /></div>
              <div>
                <h4>Career Pathways</h4>
                <p>Clear opportunities for advancement and leadership.</p>
              </div>
           </div>
           <div className="dev-item">
              <div className="dev-icon"><GraduationCap size={24} /></div>
              <div>
                <h4>Tuition & Certification Support</h4>
                <p>We support your goals and professional development.</p>
              </div>
           </div>
        </div>
      </section>

      {/* Benefits section */}
      <section>
        <div className="sec-title">
          <h2>Employee Benefits</h2>
          <p>We offer competitive benefits designed to support your health, future, and peace of mind.</p>
        </div>
        <div className="benefits-row">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="benefit-item">
                <div className="benefit-icon"><Icon size={18} /></div>
                <span className="benefit-name">{b.name}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Join Team section */}
      <div className="join-sec">
        <div className="join-left">
          <h2>Join a Team That Cares</h2>
          <p>Be part of a mission-driven organization making a lasting impact in the communities we serve.</p>
          <button className="view-jobs-btn" style={{ marginTop: 'auto' }}>View Open Positions <ArrowRight size={18} /></button>
        </div>
        <div className="quote-right">
             <Quote size={40} className="quote-icon" />
             <p className="quote-text">
               "I love knowing my work helps our patients live healthier lives. The support and camaraderie here are unmatched."
             </p>
             <span className="quote-author">— FMA Team Member</span>
        </div>
      </div>
    </div>
  );
}
