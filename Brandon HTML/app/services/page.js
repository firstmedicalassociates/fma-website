import Link from 'next/link';
import { 
  Calendar, 
  User, 
  Users, 
  MapPin, 
  Clock, 
  PhoneCall, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronDown, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';

export default function ServicesPage() {
  return (
    <main className="services-page">
      <style>{`
        .services-page { padding: 3rem 0 6rem; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
        
        .breadcrumbs { font-size: 0.8125rem; color: #64748b; margin-bottom: 3rem; display: flex; gap: 0.5rem; }
        .breadcrumbs a { color: #64748b; text-decoration: none; }
        .breadcrumbs span { color: #cbd5e1; }
        .breadcrumbs .active { color: #0f172a; font-weight: 500; }

        .hero-section { max-width: 800px; margin-bottom: 5rem; position: relative; }
        .tag { display: inline-block; background: #eef4ff; color: #001c55; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.375rem 0.875rem; border-radius: 999px; margin-bottom: 1.5rem; }
        .hero-title { font-size: 3.5rem; font-weight: 800; color: #001c55; line-height: 1.1; margin-bottom: 0.75rem; }
        .hero-subtitle { font-size: 1.5rem; color: #475569; margin-bottom: 1.5rem; font-weight: 500; }
        .hero-desc { color: #475569; font-size: 1rem; line-height: 1.7; margin-bottom: 2.5rem; max-width: 650px; }
        
        .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
        .btn-primary { background: #001c55; color: white; border: 2px solid #001c55; padding: 0.875rem 1.75rem; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; transition: opacity 0.2s; cursor: pointer; text-decoration: none; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-outline { background: white; color: #001c55; border: 2px solid #001c55; padding: 0.875rem 1.75rem; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; cursor: pointer; text-decoration: none; }
        .btn-outline:hover { background: #f8fafc; }

        .features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; margin-bottom: 5rem; }
        .feature-card { display: flex; flex-direction: column; gap: 1rem; }
        .fc-icon { width: 56px; height: 56px; border-radius: 50%; background: #ecf2fe; color: #0070f3; display: grid; place-items: center; }
        .fc-title { font-size: 1.125rem; font-weight: 700; color: #001c55; }
        .fc-desc { font-size: 0.875rem; color: #475569; line-height: 1.6; }

        .info-split { display: grid; grid-template-columns: 3fr 2fr; gap: 4rem; margin-bottom: 5rem; align-items: stretch; }
        .info-left { display: flex; flex-direction: column; gap: 1.5rem; color: #475569; font-size: 1rem; line-height: 1.8; justify-content: center; }
        
        .commitment-panel { background: #f4f7f9; padding: 3rem; border-radius: 16px; }
        .cp-icon { width: 48px; height: 48px; border-radius: 50%; background: #e1ebfa; color: #0070f3; display: grid; place-items: center; margin-bottom: 1.5rem; }
        .cp-title { font-size: 1.5rem; font-weight: 700; color: #001c55; margin-bottom: 2rem; }
        .cp-list { display: flex; flex-direction: column; gap: 1.25rem; }
        .cp-item { display: flex; align-items: center; gap: 1rem; color: #475569; font-weight: 500; }
        .cp-item svg { color: #0070f3; }

        .details-split { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; margin-bottom: 5rem; }
        .details-left h2 { font-size: 2rem; font-weight: 700; color: #001c55; margin-bottom: 1.5rem; }
        .details-left p { color: #475569; line-height: 1.7; margin-bottom: 1.5rem; }
        .inline-link { color: #001c55; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
        
        .accordion-list { display: flex; flex-direction: column; gap: 1rem; }
        .accordion-item { border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); cursor: pointer; }
        .acc-left { display: flex; align-items: center; gap: 1rem; }
        .acc-icon { width: 40px; height: 40px; border-radius: 8px; background: #f1f5f9; color: #001c55; display: grid; place-items: center; flex-shrink: 0; }
        .acc-title { font-weight: 600; color: #001c55; font-size: 1.0625rem; }
        .acc-arrow { color: #001c55; }

        .cta-banner { background: #001c55; border-radius: 16px; padding: 3rem 4rem; color: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 2rem; position: relative; overflow: hidden; }
        .cta-banner::before { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 40%; background: radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%); }
        .cta-content { max-width: 500px; position: relative; z-index: 1; }
        .cta-content h2 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; }
        .cta-content p { font-size: 1.125rem; opacity: 0.9; line-height: 1.6; }
        .cta-actions { display: flex; gap: 1rem; align-items: center; position: relative; z-index: 1; flex-wrap: wrap; }
        .btn-white { background: white; color: #001c55; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; border: 2px solid white; transition: background 0.2s; }
        .btn-white:hover { background: #f8fafc; }
        .btn-outline-white { background: transparent; color: white; padding: 0.875rem 1.5rem; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; border: 2px solid rgba(255,255,255,0.4); transition: border-color 0.2s; }
        .btn-outline-white:hover { border-color: white; }

        @media (max-width: 1024px) {
          .features-grid { grid-template-columns: 1fr 1fr; }
          .info-split { grid-template-columns: 1fr; }
          .details-split { grid-template-columns: 1fr; }
          .cta-banner { padding: 3rem 2rem; flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 640px) {
          .features-grid { grid-template-columns: 1fr; }
          .hero-title { font-size: 2.5rem; }
          .btn-primary, .btn-outline { width: 100%; justify-content: center; }
          .cta-actions { flex-direction: column; width: 100%; }
          .btn-white, .btn-outline-white { width: 100%; justify-content: center; }
        }
      `}</style>
      
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/">Home</Link> <span>&gt;</span>
          <Link href="/services">Services</Link> <span>&gt;</span>
          <span className="active">Primary Care</span>
        </div>

        <div className="hero-section">
          <div className="tag">PRIMARY CARE</div>
          <h1 className="hero-title">Primary Care</h1>
          <h2 className="hero-subtitle">Your Partner in Lifelong Health</h2>
          <p className="hero-desc">
            Choosing a primary care physician for you and your family is an important
            decision. A primary care provider is usually the first medical professional
            you will contact when you have a health issue or need a wellness visit. 
            Your primary care provider is often your physician partner throughout 
            life&apos;s health journey.
          </p>
          <div className="hero-actions">
            <Link href="#" className="btn-primary">
              <Calendar size={18} /> Schedule an Appointment
            </Link>
            <Link href="#" className="btn-outline">
              <User size={18} /> Find a Primary Care Doctor
            </Link>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="fc-icon">
              <Users size={24} />
            </div>
            <h3 className="fc-title">Connected Care</h3>
            <p className="fc-desc">
              Our physicians share information electronically for faster treatment and better outcomes.
            </p>
          </div>
          <div className="feature-card">
            <div className="fc-icon">
              <MapPin size={24} />
            </div>
            <h3 className="fc-title">Local Access</h3>
            <p className="fc-desc">
              Partnered with top specialists and hospitals to provide quick, local access to the care you need.
            </p>
          </div>
          <div className="feature-card">
            <div className="fc-icon">
              <Clock size={24} />
            </div>
            <h3 className="fc-title">Convenient Appointments</h3>
            <p className="fc-desc">
              Same-day and next-day appointments available at all FMA locations.
            </p>
          </div>
          <div className="feature-card">
            <div className="fc-icon">
              <PhoneCall size={24} />
            </div>
            <h3 className="fc-title">Always Here for You</h3>
            <p className="fc-desc">
              On-call providers are available even after hours to address your health needs.
            </p>
          </div>
        </div>

        <div className="info-split">
          <div className="info-left">
            <p>
              Our physicians are connected electronically via a sophisticated electronic 
              medical record system. This allows our providers to have immediate access 
              to your medical records, which means faster treatment and a speedier recovery.
            </p>
            <p>
              First Medical Associates&apos; professionals focus on providing superior medical care 
              in a respectful, patient-centered environment. Our centers partner with hundreds 
              of the most medically distinguished physician specialists. This means you have 
              quick, LOCAL access to specialists and emergency care when you need it.
            </p>
            <p>
              Same-day and next-day appointments are available at all First Medical 
              Associates locations. Even when our offices are closed for the day, we have 
              on-call providers who take your calls to be sure your health needs are met.
            </p>
          </div>
          <div className="info-right">
            <div className="commitment-panel">
              <div className="cp-icon">
                <ShieldCheck size={24} strokeWidth={2} />
              </div>
              <h3 className="cp-title">Our Commitment to You</h3>
              <div className="cp-list">
                <div className="cp-item">
                  <CheckCircle2 size={20} /> Patient-centered care
                </div>
                <div className="cp-item">
                  <CheckCircle2 size={20} /> Respect and compassion
                </div>
                <div className="cp-item">
                  <CheckCircle2 size={20} /> High quality, coordinated care
                </div>
                <div className="cp-item">
                  <CheckCircle2 size={20} /> Better health, together
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="details-split">
          <div className="details-left">
            <h2>What is Primary Care?</h2>
            <p>
              A primary care physician (PCP) acts as your main medical provider. Many PCPs, 
              including those at First Medical Associates, are family doctors who treat 
              patients of all ages, from infants to seniors.
            </p>
            <p>
              Primary care doctors have undergone comprehensive medical education and 
              training, which allows them to meet virtually all of your standard health care 
              needs, including sick visits, immunizations, and preventive care.
            </p>
            <Link href="#" className="inline-link">
              Find a Primary Care Doctor <ArrowRight size={16} />
            </Link>
          </div>
          <div className="details-right">
            <div className="accordion-list">
              <div className="accordion-item">
                <div className="acc-left">
                  <div className="acc-icon"><ShieldCheck size={20} /></div>
                  <div className="acc-title">How does preventive care work?</div>
                </div>
                <ChevronDown size={20} className="acc-arrow" />
              </div>
              <div className="accordion-item">
                <div className="acc-left">
                  <div className="acc-icon"><User size={20} /></div>
                  <div className="acc-title">What if your primary care doctor can&apos;t help?</div>
                </div>
                <ChevronDown size={20} className="acc-arrow" />
              </div>
              <div className="accordion-item">
                <div className="acc-left">
                  <div className="acc-icon"><ClipboardList size={20} /></div>
                  <div className="acc-title">Which primary care services are available?</div>
                </div>
                <ChevronDown size={20} className="acc-arrow" />
              </div>
            </div>
          </div>
        </div>

        <div className="cta-banner">
          <div className="cta-content">
            <h2>Ready to Take the Next Step?</h2>
            <p>Our primary care team is here to help you and your family live healthier, every day.</p>
          </div>
          <div className="cta-actions">
            <Link href="#" className="btn-white">
              <Calendar size={18} /> Schedule an Appointment
            </Link>
            <Link href="#" className="btn-outline-white">
              Find a Doctor <ArrowRight size={18} />
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
