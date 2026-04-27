/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { 
  Megaphone, 
  ArrowRight, 
  Search,
  Building2,
  Stethoscope,
  Heart,
  Trophy,
  ChevronRight,
  Clock,
  ExternalLink,
  Users
} from 'lucide-react';

export default function PressPage() {
  const categories = [
    { title: 'ALL PRESS RELEASES', sub: 'View All', icon: Building2 },
    { title: 'CORPORATE NEWS', sub: 'Company updates', icon: Building2 },
    { title: 'CLINICAL NEWS', sub: 'Medical advancements', icon: Stethoscope },
    { title: 'COMMUNITY IMPACT', sub: 'Outreach & partnerships', icon: Users },
    { title: 'AWARDS & RECOGNITION', sub: 'Achievements', icon: Trophy },
  ];

  const releases = [
    { date: 'April 8, 2024', tag: 'CLINICAL NEWS', title: 'Advanced Imaging Technology Now Available at Select Locations', color: '#e8f0fe', textColor: '#0070f3' },
    { date: 'April 1, 2024', tag: 'CORPORATE NEWS', title: 'Leadership Update: Welcoming Our New Chief Medical Officer', color: '#f0fdf4', textColor: '#16a34a' },
    { date: 'March 25, 2024', tag: 'COMMUNITY IMPACT', title: 'Free Health Screenings Event Coming to Your Community', color: '#fef3f2', textColor: '#dc2626' },
    { date: 'March 18, 2024', tag: 'AWARDS & RECOGNITION', title: 'Excellence in Patient Care: Celebrating Our Dedicated Teams', color: '#fef9c3', textColor: '#ca8a04' },
    { date: 'March 11, 2024', tag: 'CORPORATE NEWS', title: 'First Medical Associates Announces Continued Growth in 2024', color: '#f0fdf4', textColor: '#16a34a' },
  ];

  return (
    <div className="press-layout">
      <style>{`
        .press-layout { width: 100%; display: flex; flex-direction: column; gap: 2.5rem; }
        
        .press-header-sec { display: flex; justify-content: flex-end; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
        .press-header-sec h2 { font-size: 1.5rem; color: #001c55; font-weight: 800; }
        
        .cat-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .cat-card {
          background: #f1f5f9;
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: left;
          transition: transform 0.2s;
        }
        .cat-card:hover { transform: translateY(-2px); background: #e2e8f0; }
        .cat-card h6 { font-size: 0.625rem; font-weight: 700; color: #64748b; letter-spacing: 0.02em; }
        .cat-card div { display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; font-weight: 700; color: #001c55; }

        .news-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2.5rem;
        }
        .main-featured {
          background: white;
          border-radius: 24px;
          overflow: hidden;
        }
        .main-img-wrap { height: 400px; position: relative; border-radius: 20px; overflow: hidden; }
        .main-img { width: 100%; height: 100%; object-fit: cover; }
        .featured-tag { 
          position: absolute; top: 1.5rem; left: 1.5rem; 
          background: #001c55; color: white; 
          padding: 0.4rem 0.75rem; border-radius: 6px; 
          font-size: 0.6875rem; font-weight: 700; 
        }
        .main-body { padding: 2.5rem 0; }
        .main-body .date { color: #64748b; font-size: 0.875rem; margin-bottom: 1rem; }
        .main-body h3 { font-size: 2.25rem; font-weight: 800; color: #001c55; line-height: 1.1; margin-bottom: 1.5rem; }
        .main-body p { color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }
        .read-more-link { display: flex; align-items: center; gap: 0.5rem; color: #0070f3; font-weight: 700; }

        .side-news { display: flex; flex-direction: column; gap: 1.5rem; }
        .side-card { 
          background: white; border: 1px solid #f1f5f9; padding: 2rem; border-radius: 20px;
          display: flex; flex-direction: column; gap: 1rem; flex: 1;
        }
        .side-icons { 
          background: #f1f5f9; width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center; color: #001c55;
        }
        .side-card .date { font-size: 0.8125rem; color: #64748b; }
        .side-card h4 { font-size: 1.25rem; font-weight: 800; color: #001c55; line-height: 1.3; }
        .side-card p { font-size: 0.875rem; color: #475569; }

        .recent-sec { margin-top: 3rem; }
        .sec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .sec-header h3 { font-size: 1.25rem; font-weight: 800; color: #001c55; }
        .view-all-table { display: flex; align-items: center; gap: 0.5rem; color: #0070f3; font-weight: 700; font-size: 0.875rem; }
        
        .news-table { width: 100%; border-collapse: collapse; }
        .news-row { border-bottom: 1px solid #f1f5f9; }
        .news-row:hover { background: #f8fafc; }
        .news-cell { padding: 1.25rem 1rem; font-size: 0.875rem; }
        .cell-date { color: #64748b; width: 140px; }
        .cell-cat { width: 200px; }
        .cat-pill { padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.6875rem; font-weight: 700; }
        .cell-title { color: #001c55; font-weight: 600; }
        .cell-action { text-align: right; color: #0070f3; font-weight: 700; width: 100px; }

        .search-banner {
          background: #001c55;
          border-radius: 24px;
          padding: 4rem;
          margin-top: 4rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          color: white;
        }
        .search-banner h2 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1rem; }
        .search-banner p { opacity: 0.7; font-size: 1rem; }
        .search-input-group { position: relative; width: 100%; }
        .search-input-group input { 
          width: 100%; padding: 1.25rem 2rem; border-radius: 12px; border: none; 
          background: rgba(255,255,255,0.1); color: white; font-size: 1rem; outline: none;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .search-input-group input::placeholder { color: rgba(255,255,255,0.4); }
        .search-go-btn { 
          position: absolute; right: 8px; top: 8px; 
          background: white; color: #001c55; padding: 0.75rem 2rem; border-radius: 8px; 
          font-weight: 800; 
        }

        @media (max-width: 1024px) {
          .cat-row { grid-template-columns: repeat( auto-fit, minmax(180px, 1fr) ); }
          .news-grid { grid-template-columns: 1fr; }
          .search-banner { grid-template-columns: 1fr; gap: 2rem; padding: 3rem; text-align: center; }
        }
      `}</style>

      {/* Page Header */}
      <div className="press-header-sec">
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Updated weekly</span>
            <h2>Latest Press Releases</h2>
         </div>
      </div>

      {/* Categories Row */}
      <div className="cat-row">
        {categories.map((cat, i) => (
          <button key={i} className="cat-card">
            <h6>{cat.title}</h6>
            <div>{cat.sub} <ChevronRight size={14} color="#64748b" /></div>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="news-grid">
         <div className="main-featured">
            <div className="main-img-wrap">
               <img src="https://picsum.photos/seed/medical_center/1200/800" className="main-img" alt="First Medical Center" />
               <span className="featured-tag">FEATURED RELEASE</span>
            </div>
            <div className="main-body">
               <div className="date">May 14, 2024</div>
               <h3>First Medical Associates Opens New State-of-the-Art Care Center</h3>
               <p>
                 Our new facility expands access to high-quality primary and specialty care with 
                 advanced technology and a patient-first experience. Focused on holistic wellness 
                 and immediate care availability.
               </p>
               <button className="read-more-link">Read Full Release <ArrowRight size={18} /></button>
            </div>
         </div>

         <div className="side-news">
            <div className="side-card">
               <div className="side-icons"><Stethoscope size={20} /></div>
               <div className="date">May 7, 2024</div>
               <h4>New Cardiology Program Enhances Heart Care Services</h4>
               <p>We are excited to announce the expansion of our cardiology services with advanced diagnostics and treatments.</p>
               <button className="read-more-link" style={{ fontSize: '0.875rem' }}>Read Full Release <ArrowRight size={16} /></button>
            </div>
            <div className="side-card">
               <div className="side-icons"><Trophy size={20} /></div>
               <div className="date">April 30, 2024</div>
               <h4>First Medical Associates Named Top Workplace 2024</h4>
               <p>We are honored to be recognized for our commitment to our team and the communities we serve.</p>
               <button className="read-more-link" style={{ fontSize: '0.875rem' }}>Read Full Release <ArrowRight size={16} /></button>
            </div>
         </div>
      </div>

      {/* Recent Releases Section */}
      <section className="recent-sec">
         <div className="sec-header">
            <h3>Recent Press Releases</h3>
            <button className="view-all-table">View All Press Releases <ArrowRight size={16} /></button>
         </div>

         <table className="news-table">
            <tbody>
               {releases.map((rel, i) => (
                  <tr key={i} className="news-row">
                     <td className="news-cell cell-date">{rel.date}</td>
                     <td className="news-cell cell-cat">
                        <span className="cat-pill" style={{ background: rel.color, color: rel.textColor }}>{rel.tag}</span>
                     </td>
                     <td className="news-cell cell-title">{rel.title}</td>
                     <td className="news-cell cell-action">
                        Read <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </section>

      {/* Search Banner */}
      <div className="search-banner">
         <div>
            <h2>Can't find a specific release?</h2>
            <p>Search our archive of press releases by keyword, topic, or date.</p>
         </div>
         <div className="search-input-group">
            <input type="text" placeholder="e.g. new clinic opening, partnership, award..." />
            <button className="search-go-btn">Search</button>
         </div>
      </div>
    </div>
  );
}

