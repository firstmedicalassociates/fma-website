/* eslint-disable @next/next/no-img-element */
import { 
  HeartHandshake, 
  ShieldCheck, 
  Lightbulb, 
  Users, 
  Award
} from 'lucide-react';

export default function MissionPage() {
  return (
    <div className="mission-content">
      <style>{`
        .mission-content { width: 100%; display: flex; flex-direction: column; gap: 4rem; margin-bottom: 4rem; }

        .mission-split { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: stretch; background: white; border-radius: 32px; overflow: hidden; border: 1px solid #e2e8f0; }
        .m-left { padding: 4rem; display: flex; flex-direction: column; gap: 3rem; justify-content: center; }
        .m-block h2 { font-size: 2rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; }
        .m-block p { color: #475569; font-size: 1.125rem; line-height: 1.7; }
        .m-right img { width: 100%; height: 100%; object-fit: cover; min-height: 400px; }
        .m-divider { height: 1px; background: #e2e8f0; width: 100%; }

        .sec-header { margin-bottom: 2.5rem; }
        .sec-header h2 { font-size: 2rem; font-weight: 800; color: #001c55; margin-bottom: 0.5rem; }
        .sec-header p { color: #64748b; font-size: 1rem; }

        .values-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
        .value-card { background: white; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.03); padding: 2.5rem; border-radius: 24px; display: flex; flex-direction: column; gap: 1rem; }
        .v-icon { background: #eef4ff; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #0070f3; }
        .value-card h4 { font-size: 1rem; font-weight: 800; color: #001c55; }
        .value-card p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }

        .commitment-banner { background: #f8fafc; border-radius: 24px; padding: 4rem; display: flex; justify-content: space-between; align-items: center; gap: 4rem; }
        .comm-text h3 { font-size: 1.5rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; }
        .comm-text p { color: #475569; font-size: 1rem; line-height: 1.6; max-width: 800px; }
        .comm-icon { width: 96px; height: 96px; color: #001c55; flex-shrink: 0; }

        .impact-split { display: grid; grid-template-columns: 1fr 1fr; background: #001c55; border-radius: 24px; overflow: hidden; color: white; }
        .imp-left { padding: 4rem; display: flex; flex-direction: column; justify-content: center; }
        .imp-left h2 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; line-height: 1.2; }
        .imp-left p { opacity: 0.9; font-size: 1rem; line-height: 1.6; max-width: 90%; }
        .imp-right img { width: 100%; height: 100%; object-fit: cover; min-height: 400px; }

        @media (max-width: 1024px) {
          .mission-split, .impact-split, .commitment-banner { grid-template-columns: 1fr; }
          .values-grid { grid-template-columns: 1fr 1fr; }
          .commitment-banner { flex-direction: column; text-align: center; gap: 2.5rem; padding: 2.5rem; }
          .m-left, .imp-left { padding: 2.5rem; }
          .m-right img, .imp-right img { min-height: 250px; height: 350px; }
        }
        @media (max-width: 640px) {
          .values-grid { grid-template-columns: 1fr; }
          .m-block h2, .imp-left h2 { font-size: 1.75rem; }
        }
      `}</style>

      {/* Mission Split */}
      <div className="mission-split">
        <div className="m-left">
          <div className="m-block">
            <h2>Our Mission</h2>
            <p>To be the clinical curator of modern healthcare—delivering patient-first care through intentional clinical precision, compassion, and innovation.</p>
          </div>
          <div className="m-divider"></div>
          <div className="m-block">
            <h2>Our Vision</h2>
            <p>Healthier communities. Better tomorrows. Together.</p>
          </div>
        </div>
        <div className="m-right">
          <img src="https://picsum.photos/seed/doctor_child/1000/1000" alt="Doctor with child" />
        </div>
      </div>

      {/* Core Values */}
      <section>
        <div className="sec-header">
          <h2>Our Core Values</h2>
          <p>Our values define who we are, how we work, and the promise we keep with every patient and partner.</p>
        </div>
        <div className="values-grid">
          <div className="value-card">
            <div className="v-icon"><HeartHandshake size={20} /></div>
            <h4>Patient First</h4>
            <p>Every decision starts with the patient. We prioritize compassion, respect, and exceptional care.</p>
          </div>
          <div className="value-card">
            <div className="v-icon"><ShieldCheck size={20} /></div>
            <h4>Integrity</h4>
            <p>We do the right thing, every time—holding ourselves to the highest ethical standards.</p>
          </div>
          <div className="value-card">
            <div className="v-icon"><Lightbulb size={20} /></div>
            <h4>Excellence</h4>
            <p>We pursue excellence in all we do, continuously raising the bar for clinical and operational performance.</p>
          </div>
          <div className="value-card">
            <div className="v-icon"><Users size={20} /></div>
            <h4>Community</h4>
            <p>We are stronger together. We build trusted relationships that create healthier communities.</p>
          </div>
        </div>
      </section>

      {/* Commitment Banner */}
      <div className="commitment-banner">
        <div className="comm-text">
          <h3>Our Commitment to Quality</h3>
          <p>Quality is at the heart of everything we do. Through evidence-based medicine, data-driven insights, and continuous improvement, we deliver consistent, high-quality care across all our clinics.</p>
        </div>
        <Award className="comm-icon" strokeWidth={1} />
      </div>

      {/* Impact Split */}
      <div className="impact-split">
        <div className="imp-left">
          <h2>Driving Impact<br/>Every Day</h2>
          <p>Our mission and values guide our culture, our decisions, and the care we deliver—creating lasting impact for patients, providers, and communities.</p>
        </div>
        <div className="imp-right">
          <img src="https://picsum.photos/seed/medical_facility/1000/800" alt="Medical Facility" />
        </div>
      </div>

    </div>
  );
}

