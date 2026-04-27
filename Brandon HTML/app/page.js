import Link from 'next/link';
import { ArrowRight, ShieldCheck, Heart, Clock, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <style>{`
          .hero {
            padding: 8rem 0;
            background: linear-gradient(135deg, #001c55 0%, #00308f 100%);
            color: white;
            text-align: center;
          }
          .hero h1 {
            font-size: 4rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            letter-spacing: -0.02em;
          }
          .hero p {
            font-size: 1.25rem;
            opacity: 0.9;
            max-width: 700px;
            margin: 0 auto 3rem;
          }
          .cta-group {
            display: flex;
            justify-content: center;
            gap: 1.5rem;
          }
          .btn-primary {
            background: white;
            color: #001c55;
            padding: 1rem 2rem;
            border-radius: 9999px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .btn-outline {
            border: 2px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 1rem 2rem;
            border-radius: 9999px;
            font-weight: 700;
          }
          
          .features { padding: 8rem 0; background: #fff; }
          .feature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3rem;
          }
          .feature-card { text-align: center; }
          .feature-icon-box {
            width: 64px;
            height: 64px;
            background: #e8f0fe;
            color: #001c55;
            border-radius: 16px;
            display: grid;
            place-items: center;
            margin: 0 auto 1.5rem;
          }
          @media (max-width: 768px) {
            .hero h1 { font-size: 2.5rem; }
            .feature-grid { grid-template-columns: 1fr; }
          }
        `}</style>
        
        <div className="container">
          <h1>First Class Care for You<br/>and Your Family.</h1>
          <p>
            Experience excellence in healthcare with personalized attention, 
            advanced technology, and a network of dedicated specialists.
          </p>
          <div className="cta-group">
            <Link href="/patient-resources" className="btn-primary">
              View Resources <ArrowRight size={20} />
            </Link>
            <button className="btn-outline">Find a Doctor</button>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon-box"><ShieldCheck size={32} /></div>
              <h3>Trusted Care</h3>
              <p style={{ color: '#666', marginTop: '1rem' }}>Over 20 years of excellence in community medicine and patient outcomes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box"><Heart size={32} /></div>
              <h3>Patient First</h3>
              <p style={{ color: '#666', marginTop: '1rem' }}>Personalized treatment plans tailored to your specific health needs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box"><Clock size={32} /></div>
              <h3>24/7 Access</h3>
              <p style={{ color: '#666', marginTop: '1rem' }}>Digital tools and patient portal for instant access to your records and team.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '6rem 0', background: '#f4f7fa' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#001c55', marginBottom: '1.5rem' }}>Ready to get started?</h2>
          <p style={{ color: '#666', marginBottom: '3rem' }}>Join the First Medical Associates family today.</p>
          <Link href="/patient-resources" className="portal-btn" style={{ padding: '1rem 3rem', fontSize: '1.125rem' }}>
            Browse Patient Hub
          </Link>
        </div>
      </section>
    </main>
  );
}
