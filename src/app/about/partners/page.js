/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { 
  Handshake, 
  ArrowRight, 
  Heart, 
  Users, 
  Building2, 
  ShieldCheck, 
  Activity,
  ClipboardCheck,
  Target,
  Monitor,
  Zap,
  Globe,
  Quote,
  MessageSquare
} from 'lucide-react';

export default function PartnersPage() {
  const partnerTypes = [
    { 
      title: 'Health Systems & Hospitals', 
      desc: 'Clinical collaboration and care model development.',
      icon: Building2 
    },
    { 
      title: 'Payors & Health Plans', 
      desc: 'Value-based initiatives and quality improvement partnerships.',
      icon: ShieldCheck 
    },
    { 
      title: 'Employers & Organizations', 
      desc: 'Workplace health solutions that support employees and families.',
      icon: Briefcase 
    },
    { 
      title: 'Community Organizations', 
      desc: 'Expanding access and addressing social determinants of health.',
      icon: Users 
    },
    { 
      title: 'Vendors & Technology Partners', 
      desc: 'Innovative solutions that enhance care delivery and operations.',
      icon: Monitor 
    },
  ];

  const benefits = [
    { title: 'Improve Access', desc: 'Expand access to high-quality care in the communities we serve.', icon: Activity },
    { title: 'Enhance Outcomes', desc: 'Drive better patient outcomes through coordinated care and innovation.', icon: Zap },
    { title: 'Operational Impact', desc: 'Leverage expertise and resources to improve efficiency and effectiveness.', icon: Target },
    { title: 'Lasting Value', desc: 'Build long-term partnerships that create measurable and sustainable impact.', icon: Globe },
  ];

  return (
    <div className="partners-content">
      <style>{`
        .partners-content { width: 100%; display: flex; flex-direction: column; gap: 4rem; margin-bottom: 4rem; }
        
        .promo-split { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: flex-start; }
        .promo-left h2 { font-size: 2.25rem; font-weight: 800; color: #001c55; margin-bottom: 1.5rem; line-height: 1.2; }
        .promo-left p { color: #475569; font-size: 1.125rem; line-height: 1.7; margin-bottom: 3rem; }
        
        .highlight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .h-item { display: flex; gap: 1rem; align-items: flex-start; }
        .h-icon { 
          background: #eef4ff; width: 44px; height: 44px; border-radius: 12px; 
          display: grid; place-items: center; color: #0070f3; flex-shrink: 0;
        }
        .h-item h4 { font-size: 1rem; font-weight: 800; color: #001c55; margin-bottom: 0.25rem; }
        .h-item p { font-size: 0.8125rem; color: #64748b; line-height: 1.4; }

        .promo-right img { width: 100%; height: 500px; object-fit: cover; border-radius: 32px; }

        .cta-dark-bar {
          background: #001c55; border-radius: 16px; padding: 2rem 2.5rem; color: white;
          display: flex; justify-content: space-between; align-items: center;
        }
        .cta-dark-left { display: flex; align-items: center; gap: 1.5rem; }
        .cta-dark-icon { background: #0c3b77; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; }
        .cta-text-col { display: flex; flex-direction: column; gap: 0.5rem; }
        .cta-text-col h3 { font-size: 1.5rem; font-weight: 600; margin: 0; letter-spacing: 0; }
        .cta-text-col p { opacity: 0.85; font-size: 0.9375rem; line-height: 1.5; margin: 0; max-width: 480px; }
        .white-btn { background: white; color: #001c55; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.9375rem; display: flex; align-items: center; gap: 0.5rem; border: none; cursor: pointer; transition: opacity 0.2s; }
        .white-btn:hover { opacity: 0.9; }

        .section-header { margin-bottom: 2.5rem; }
        .section-header h2 { font-size: 2rem; font-weight: 800; color: #001c55; }

        .partners-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5rem; border-top: 1px solid #f1f5f9; padding-top: 3rem; }
        .partner-card { display: flex; flex-direction: column; gap: 1.5rem; padding: 0 0.5rem; }
        .partner-card:not(:last-child) { border-right: 1px solid #f1f5f9; padding-right: 1.5rem; }
        .partner-icon-box { background: #eef4ff; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #0070f3; }
        .partner-card h4 { font-size: 0.875rem; font-weight: 800; color: #001c55; line-height: 1.3; }
        .partner-card p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

        .benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .benefit-card { background: #f8fafc; padding: 2.5rem; border-radius: 24px; display: flex; flex-direction: column; gap: 1.5rem; }
        .benefit-icon-box { background: #eef4ff; width: 40px; height: 40px; border-radius: 8px; display: grid; place-items: center; color: #0070f3; }
        .benefit-card h4 { font-size: 1rem; font-weight: 800; color: #001c55; }
        .benefit-card p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

        .final-cta { display: grid; grid-template-columns: 1fr 1fr; background: #003049; border-radius: 24px; overflow: hidden; color: white; }
        .cta-left { padding: 4rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .cta-left h2 { font-size: 2.25rem; font-weight: 800; }
        .cta-left p { opacity: 0.8; font-size: 1rem; line-height: 1.6; }
        .quote-side { background: rgba(255,255,255,0.05); padding: 4rem; display: flex; flex-direction: column; justify-content: center; position: relative; }
        .quote-icon { opacity: 0.3; margin-bottom: 1.5rem; }
        .quote-main { font-size: 1.25rem; font-weight: 600; line-height: 1.6; margin-bottom: 1.5rem; }
        .quote-sig { font-size: 0.875rem; color: #94a3b8; }

        @media (max-width: 1024px) {
          .promo-split, .partners-row, .final-cta { grid-template-columns: 1fr; }
          .benefits-grid { grid-template-columns: 1fr 1fr; }
          .partner-card { border-right: none !important; border-bottom: 1px solid #f1f5f9; padding: 1.5rem 0 !important; }
          .partners-row { padding-top: 0; }
          .cta-dark-bar { flex-direction: column; text-align: center; gap: 2.5rem; padding: 2.5rem 1.5rem; }
          .cta-dark-left { flex-direction: column; gap: 1.5rem; }
          .promo-right img { height: 350px; }
          .cta-left, .quote-side { padding: 2.5rem; }
        }
        @media (max-width: 640px) {
          .benefits-grid { grid-template-columns: 1fr; }
          .highlight-grid { grid-template-columns: 1fr; }
          .promo-left h2, .cta-left h2 { font-size: 1.75rem; }
        }
      `}</style>

      {/* Intro Section */}
      <div className="promo-split">
        <div className="promo-left">
          <h2>Partnerships That Create Lasting Impact</h2>
          <p>
            First Medical Associates partners with hospitals, health systems, payors, employers, 
            community organizations, and vendors to expand access to high-quality, patient-first care.
          </p>
          <div className="highlight-grid">
            <div className="h-item">
              <div className="h-icon"><Users size={20} /></div>
              <div>
                <h4>Aligned Goals</h4>
                <p>We align with partners who share our mission and values.</p>
              </div>
            </div>
            <div className="h-item">
              <div className="h-icon"><Handshake size={20} /></div>
              <div>
                <h4>Shared Impact</h4>
                <p>Together, we improve health outcomes and community well-being.</p>
              </div>
            </div>
            <div className="h-item">
              <div className="h-icon"><ClipboardCheck size={20} /></div>
              <div>
                <h4>Operational Excellence</h4>
                <p>We bring clinical expertise and operational rigor to every partnership.</p>
              </div>
            </div>
            <div className="h-item">
              <div className="h-icon"><Zap size={20} /></div>
              <div>
                <h4>Innovative Solutions</h4>
                <p>We co-create solutions that address today's challenges and tomorrow's opportunities.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="promo-right">
          <img src="https://picsum.photos/seed/partnership_handshake/1000/1000" alt="Partnership Handshake" />
        </div>
      </div>

      {/* CTA Banner */}
      <div className="cta-dark-bar">
        <div className="cta-dark-left">
          <div className="cta-dark-icon"><Handshake size={30} color="white" strokeWidth={2} /></div>
          <div className="cta-text-col">
            <h3>Let's Build What's Next—Together</h3>
            <p>Explore partnership opportunities and discover how we can achieve more together.</p>
          </div>
        </div>
        <button className="white-btn">Contact Our Team <ArrowRight size={16} /></button>
      </div>

      {/* Who We Partner With */}
      <section>
        <div className="section-header">
          <h2>Who We Partner With</h2>
        </div>
        <div className="partners-row">
          {partnerTypes.map((type, i) => {
            const Icon = type.icon;
            return (
              <div key={i} className="partner-card">
                <div className="partner-icon-box"><Icon size={18} /></div>
                <h4>{type.title}</h4>
                <p>{type.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Benefits */}
      <section>
        <div className="section-header">
          <h2>Partnership Benefits</h2>
        </div>
        <div className="benefits-grid">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <div key={i} className="benefit-card">
                <div className="benefit-icon-box"><Icon size={18} /></div>
                <h4>{benefit.title}</h4>
                <p>{benefit.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Final CTA */}
      <div className="final-cta">
        <div className="cta-left">
          <h2>Ready to Partner?</h2>
          <p>Our team is ready to connect and explore how we can work together to make a difference.</p>
          <button className="white-btn" style={{ marginTop: 'auto' }}>Get in Touch <ArrowRight size={18} /></button>
        </div>
        <div className="quote-side">
          <Quote size={40} className="quote-icon" />
          <p className="quote-main">
            "Our partnerships are rooted in trust, aligned by purpose, and united by a shared commitment to better care for all."
          </p>
          <span className="quote-sig">— FMA Leadership Team</span>
        </div>
      </div>
    </div>
  );
}

function Briefcase({ size, ...props }) {
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
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}


