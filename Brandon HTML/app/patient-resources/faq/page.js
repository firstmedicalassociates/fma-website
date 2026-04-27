import { HelpCircle, Search, MessageSquare, Phone } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    { q: "How do I schedule an appointment?", a: "You can schedule via our website, patient portal, or by calling our office directly." },
    { q: "What should I bring to my first visit?", a: "Please bring a photo ID, your insurance card, and any current medications." },
    { q: "Do you offer telemedicine?", a: "Yes, we provide virtual consultations for select services and follow-up appointments." },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#001c55', marginBottom: '1rem' }}>Support & FAQ</h1>
        <p style={{ color: '#666' }}>Find answers to common questions or reach out to our team.</p>
        
        <div style={{ position: 'relative', marginTop: '2rem', maxWidth: '500px', margin: '2rem auto 0' }}>
          <input 
            type="text" 
            placeholder="Search help topics..." 
            style={{ width: '100%', padding: '1rem 3rem', borderRadius: '9999px', border: '1px solid #ddd', outline: 'none' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '1.125rem', color: '#999' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #eee' }}>
            <h4 style={{ color: '#001c55', marginBottom: '0.5rem', fontWeight: 700 }}>{faq.q}</h4>
            <p style={{ color: '#666', fontSize: '0.9375rem' }}>{faq.a}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '4rem', padding: '3rem', background: '#001c55', borderRadius: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Still have questions?</h3>
          <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>We're available 24/7 to assist you with your needs.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button style={{ background: 'white', color: '#001c55', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} /> Chat Now
          </button>
          <button style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Phone size={18} /> Call us
          </button>
        </div>
      </div>
    </div>
  );
}
