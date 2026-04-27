/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { 
  Heart, 
  Droplets, 
  Brain, 
  User, 
  Baby, 
  Search,
  ArrowRight,
  Clock,
  BookOpen,
  Scale,
  Activity,
  ChevronRight,
  Stethoscope,
  Weight,
  Venus,
  PlusCircle,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';

export default function EducationPage() {
  const topCategories = [
    { label: 'PRIMARY CARE', title: 'Living Well, Every Day', href: '#' },
    { label: 'HEART HEALTH', title: 'Heart Smart Guide', href: '#' },
    { label: 'WEIGHT MANAGEMENT', title: 'Healthy Weight, Healthy You', href: '#' },
    { label: 'WOMEN\'S HEALTH', title: 'Women\'s Health Essentials', href: '#' },
    { label: 'MENTAL WELLNESS', title: 'Mind & Mood Matters', href: '#' },
  ];

  const topics = [
    { name: 'Heart Health', icon: Heart },
    { name: 'Weight Management', icon: Weight },
    { name: 'Diabetes Care', icon: Droplets },
    { name: 'Mental Wellness', icon: Brain },
    { name: 'Women\'s Health', icon: Venus },
    { name: 'Children\'s Health', icon: Baby },
  ];

  return (
    <div className="education-content">
      <style>{`
        .education-content { width: 100%; display: flex; flex-direction: column; gap: 2rem; }
        
        .edu-stats { display: flex; justify-content: flex-end; align-items: center; gap: 1.5rem; margin-bottom: 0.5rem; }
        .edu-stats h4 { font-size: 1.5rem; font-weight: 800; color: #001c55; }
        .edu-stats span { font-size: 0.75rem; color: #64748b; font-weight: 600; }

        .cat-hero-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
          margin-bottom: 1rem;
        }
        .edu-cat-card {
           background: #f1f5f9;
           padding: 1.5rem;
           border: 0;
           border-radius: 12px;
           text-align: left;
           display: flex;
           flex-direction: column;
           gap: 0.5rem;
           transition: background 0.2s;
           cursor: pointer;
           font: inherit;
           appearance: none;
        }
        .edu-cat-card:hover { background: #e2e8f0; }
        .edu-cat-card span { font-size: 0.625rem; font-weight: 700; color: #64748b; letter-spacing: 0.05em; }
        .edu-cat-card h5 { font-size: 0.8125rem; font-weight: 700; color: #001c55; display: flex; justify-content: space-between; align-items: center; }

        .grid-main {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2.5rem;
        }
        
        .main-feat {
           background: white;
           border-radius: 24px;
           display: flex;
           flex-direction: column;
        }
        .feat-img-box {
           height: 400px;
           position: relative;
           border-radius: 20px;
           overflow: hidden;
        }
        .feat-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .feat-badge { 
           position: absolute; top: 1.5rem; left: 1.5rem; 
           background: #001c55; color: white; padding: 0.4rem 0.75rem; 
           border-radius: 6px; font-size: 0.6875rem; font-weight: 700; 
        }
        .feat-body { padding: 2.5rem 0; }
        .feat-body h3 { font-size: 2.25rem; font-weight: 800; color: #001c55; line-height: 1.1; margin-bottom: 1.5rem; }
        .feat-body p { color: #475569; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }
        .feat-footer { display: flex; gap: 2rem; align-items: center; }
        .feat-btn,
        .side-link {
          width: fit-content;
          min-height: 40px;
          padding: 0 15px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease,
            background-color 180ms ease,
            color 180ms ease;
        }
        .feat-btn {
          border: 1px solid transparent;
          background: linear-gradient(135deg, #0d2c72 0%, #1d5fa8 100%);
          color: #ffffff;
          box-shadow: 0 14px 30px rgba(13, 44, 114, 0.2);
        }
        .feat-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 34px rgba(13, 44, 114, 0.24);
        }
        .feat-time { color: #64748b; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }

        .side-col { display: flex; flex-direction: column; gap: 1.5rem; }
        .side-row-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .side-sq-card {
           background: white; border: 1px solid #f1f5f9; padding: 2rem; border-radius: 20px;
           display: flex; flex-direction: column; gap: 1.5rem;
        }
        .side-icon-box { background: #f1f5f9; width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #001c55; }
        .side-sq-card h4 { font-size: 1.125rem; font-weight: 800; color: #001c55; }
        .side-sq-card p { font-size: 0.8125rem; color: #64748b; line-height: 1.5; }
        .side-link {
          border: 1px solid rgba(19, 36, 73, 0.12);
          background: rgba(255, 255, 255, 0.84);
          color: #0d2c72;
          margin-top: auto;
        }
        .side-link:hover {
          transform: translateY(-1px);
          border-color: rgba(13, 44, 114, 0.28);
          box-shadow: 0 12px 26px rgba(13, 44, 114, 0.12);
        }
        .feat-btn:focus-visible,
        .side-link:focus-visible {
          outline: 2px solid rgba(13, 44, 114, 0.45);
          outline-offset: 2px;
        }

        .wide-card {
           background: white; border: 1px solid #f1f5f9; border-radius: 24px; padding: 2rem;
           display: flex; gap: 1.5rem; align-items: center;
        }
        .wide-img { width: 140px; height: 140px; border-radius: 16px; object-fit: cover; }
        .wide-body { flex: 1; }
        .wide-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .wide-meta span { font-size: 0.625rem; font-weight: 800; }
        .wide-body h4 { font-size: 1.125rem; font-weight: 800; color: #001c55; margin-bottom: 1rem; line-height: 1.3; }
        .wide-body p { font-size: 0.8125rem; color: #64748b; margin-bottom: 1.5rem; }

        .browse-topics-sec { margin-top: 2rem; padding-top: 1rem; }
        .browse-topics-sec h3 { font-size: 1.25rem; font-weight: 800; color: #001c55; margin-bottom: 2rem; }
        .topics-scroller {
           display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem;
        }
        .topic-item {
           display: flex; align-items: center; gap: 0.75rem; white-space: nowrap;
        }
        .topic-round-icon {
           background: #f1f5f9; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; color: #001c55; flex-shrink: 0;
        }
        .topic-name { font-size: 0.75rem; font-weight: 700; color: #475569; }

        .search-full-width {
          background: #001c55; border-radius: 24px; padding: 4rem; margin-top: 2rem;
          color: white; display: flex; flex-direction: column; gap: 1rem; text-align: left;
        }
        .search-full-width h2 { font-size: 2.25rem; font-weight: 800; }
        .search-full-width p { opacity: 0.7; font-size: 1.125rem; max-width: 500px; }
        .search-bar-row {
           display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-top: 1rem;
           background: rgba(255,255,255,0.1); padding: 0.5rem; border-radius: 16px;
           border: 1px solid rgba(255,255,255,0.2);
        }
        .search-bar-row input { background: transparent; border: none; outline: none; color: white; padding: 0.75rem 1.5rem; font-size: 1.125rem; }
        .search-bar-row input::placeholder { color: rgba(255,255,255,0.4); }
        .search-bar-row button { background: white; color: #001c55; padding: 0.75rem 2.5rem; border-radius: 12px; font-weight: 800; }
        .search-bar-row button {
          border: 0;
          cursor: pointer;
          font: inherit;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .search-bar-row button:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(2, 14, 49, 0.2); }

        @media (max-width: 1100px) {
          .cat-hero-row { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
          .grid-main { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header Stats */}
      <div className="edu-stats">
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span>Updated weekly</span>
            <h4>840+ Medical Guides</h4>
         </div>
      </div>

      {/* Top Categories Navigation */}
      <div className="cat-hero-row">
         {topCategories.map((cat, i) => (
           <Link key={i} className="edu-cat-card" href={cat.href}>
              <span>{cat.label}</span>
              <h5>{cat.title} <ChevronRight size={14} color="#64748b" /></h5>
           </Link>
         ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid-main">
         <div className="main-feat">
            <div className="feat-img-box">
               <img src="https://picsum.photos/seed/doctor_edu/1200/800" alt="Doctor" />
               <span className="feat-badge">FEATURED GUIDE</span>
            </div>
            <div className="feat-body">
               <h3>Understanding Primary Care: Your First Line of Defense</h3>
               <p>
                 Learn how a strong relationship with your primary care provider can help prevent illness, 
                 catch problems early, and support your long-term health.
               </p>
               <div className="feat-footer">
                  <Link className="feat-btn" href="#">
                    Read Guide <ArrowRight size={18} />
                  </Link>
                  <span className="feat-time"><Clock size={16} /> 12 min read</span>
               </div>
            </div>
         </div>

         <div className="side-col">
            <div className="side-row-cards">
               <div className="side-sq-card">
                 <div className="side-icon-box"><Heart size={20} /></div>
                 <h4>Heart Health Tips</h4>
                 <p>Evidence-based tips and lifestyle changes to support a healthier heart.</p>
                 <Link className="side-link" href="#">
                   Explore Tips <ArrowRight size={16} />
                 </Link>
               </div>
               <div className="side-sq-card">
                 <div className="side-icon-box"><Droplets size={20} /></div>
                 <h4>Managing Diabetes</h4>
                 <p>Tools, meal planning guides, and strategies to help you manage diabetes with confidence.</p>
                 <Link className="side-link" href="#">
                   View Guide <ArrowRight size={16} />
                 </Link>
               </div>
            </div>

            <div className="wide-card">
               <img src="https://picsum.photos/seed/vaccine/300/300" className="wide-img" alt="Immunization" />
               <div className="wide-body">
                  <div className="wide-meta">
                     <span style={{ color: '#0070f3' }}>IMMUNOLOGY</span>
                     <span style={{ color: '#64748b' }}>6 MIN READ</span>
                  </div>
                  <h4>The Annual Wellness Immunization Guide</h4>
                  <p>A comprehensive timeline for adults over 50 for flu, pneumonia, and shingles.</p>
                  <Link className="side-link" href="#">
                    Read Guide <ArrowRight size={16} />
                  </Link>
               </div>
            </div>
         </div>
      </div>

      {/* Browse Topics */}
      <section className="browse-topics-sec">
         <h3>Browse by Topic</h3>
         <div className="topics-scroller">
            {topics.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="topic-item">
                  <div className="topic-round-icon"><Icon size={18} /></div>
                  <span className="topic-name">{t.name}</span>
                </div>
              );
            })}
            <div className="topic-item">
               <div className="topic-round-icon"><MoreHorizontal size={18} /></div>
               <span className="topic-name">View All Topics</span>
            </div>
         </div>
      </section>

      {/* Search Banner */}
      <div className="search-full-width">
         <h2>Can't find a specific guide?</h2>
         <p>Search our entire database of peer-reviewed articles and patient education materials.</p>
         <div className="search-bar-row">
            <input type="text" placeholder="e.g. Hypertension, Diet, Back Pain..." />
            <button>Search</button>
         </div>
      </div>
    </div>
  );
}


