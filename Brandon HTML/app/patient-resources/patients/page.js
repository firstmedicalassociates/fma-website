import { 
  ShieldAlert, 
  Lock, 
  Zap, 
  MousePointer2,
  Download,
  Info,
  ChevronRight,
  Phone
} from 'lucide-react';

export default function PatientsPage() {
  const forms = [
    { title: 'Privacy Policy', desc: 'Learn how we protect your personal and health information.', action: 'View Policy', type: 'link' },
    { title: 'Release Medical Records', desc: 'Authorize the release of your medical records to a third party.', id: 'download', type: 'download' },
    { title: 'Physical VS Office Visit', desc: 'Understand the difference between a physical exam and an office visit.', type: 'download' },
    { title: 'HIPAA Right of Access Form', desc: 'Request access to inspect or obtain a copy of your protected health information.', type: 'download' },
    { title: 'Request Medical Records', desc: 'Use this form to request your medical records from First Medical Associates.', type: 'download' },
    { title: 'HIPAA Privacy Notice', desc: 'Review our notice of privacy practices and your rights under HIPAA.', type: 'download' },
    { title: 'FMLA, Disability and Other Forms', desc: 'Access forms related to FMLA, disability, and other leave requests.', type: 'download' },
  ];

  return (
    <div className="patients-grid">
      <style>{`
        .patients-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 2rem;
        }
        .sidebar {
          background: #001c55;
          color: white;
          padding: 2.5rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .sidebar h2 { font-size: 1.75rem; line-height: 1.2; }
        .feature-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .feature-icon {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem;
          border-radius: 50%;
        }
        .feature-text h4 { font-size: 1rem; margin-bottom: 0.25rem; }
        .feature-text p { font-size: 0.8125rem; opacity: 0.7; }
        
        .main-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-card {
           display: flex;
           justify-content: space-between;
           align-items: center;
           padding: 1.5rem 2rem;
           background: white;
           border: 1px solid #eee;
           border-radius: 16px;
           transition: border-color 0.2s;
        }
        .form-card:hover { border-color: #0070f3; }
        .form-info { display: flex; gap: 1.5rem; align-items: center; }
        .form-icon-box {
           background: #f4f7fa;
           width: 48px;
           height: 48px;
           border-radius: 12px;
           display: grid;
           place-items: center;
           color: #001c55;
        }
        .form-action {
           display: flex;
           align-items: center;
           gap: 0.5rem;
           font-size: 0.875rem;
           font-weight: 600;
           color: #001c55;
        }
        
        @media (max-width: 992px) {
          .patients-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <aside className="sidebar">
        <h2>Forms & Policies. Made for You.</h2>
        <p style={{ opacity: 0.8, fontSize: '0.9375rem' }}>
          Easily find and complete the forms you need or review our policies to stay informed and prepared.
        </p>

        <div className="feature-item">
          <div className="feature-icon"><Lock size={20} /></div>
          <div className="feature-text">
            <h4>Secure & Confidential</h4>
            <p>Your information is protected with industry-standard safeguards.</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon"><Zap size={20} /></div>
          <div className="feature-text">
            <h4>Save Time</h4>
            <p>Complete forms ahead of your visit to streamline your experience.</p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon"><MousePointer2 size={20} /></div>
          <div className="feature-text">
            <h4>Accessible Anytime</h4>
            <p>View our policies online and download forms whenever it's convenient for you.</p>
          </div>
        </div>

        <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '12px' }}>
           <h4 style={{ marginBottom: '0.5rem' }}>Need Help?</h4>
           <p style={{ fontSize: '0.8125rem', opacity: 0.8, marginBottom: '1.5rem' }}>Our team is here to help you find the right form.</p>
           <button style={{ width: '100%', background: 'white', color: '#001c55', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Phone size={18} /> Contact Our Team
           </button>
        </div>
      </aside>

      <div className="main-content">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Patient Forms & Policies</h2>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '2rem' }}>
           Review our policies online and download the forms you need to prepare for your next appointment or request information.
        </p>

        {forms.map((form, i) => (
          <div key={i} className="form-card">
            <div className="form-info">
              <div className="form-icon-box">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{form.title}</h4>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>{form.desc}</p>
              </div>
            </div>
            <div className="form-action">
              {form.type === 'download' ? (
                <>Download <Download size={18} /></>
              ) : (
                <>{form.action} <ChevronRight size={18} /></>
              )}
            </div>
          </div>
        ))}

        <div style={{ background: '#e8f0fe', padding: '1.5rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <div style={{ background: 'white', padding: '0.5rem', borderRadius: '50%' }}>
              <Info size={20} color="#0070f3" />
           </div>
           <p style={{ fontSize: '0.875rem', color: '#001c55', fontWeight: 500 }}>
             Please complete all required forms before your visit. This helps us ensure a smooth check-in process.
           </p>
        </div>
      </div>
    </div>
  );
}
