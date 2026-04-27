'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Info, 
  Briefcase, 
  Handshake, 
  Target, 
  Users,
  Building2
} from 'lucide-react';

export default function AboutLayout({ children }) {
  const pathname = usePathname();

  const heroContent = {
    '/about': {
      tag: 'Our Legacy of Care',
      title: 'The Clinical Curator of Modern Healthcare.',
      subtitle: 'Redefining medical excellence through intentional clinical precision and compassionate patient stewardship for over two decades.'
    },
    '/about/careers': {
      tag: 'Careers',
      title: 'A Career That Makes a Difference.',
      subtitle: 'Join a team of compassionate professionals building healthier communities through patient-first care.'
    },
    '/about/partners': {
      tag: 'Partner With Us',
      title: 'Stronger Together.\nBetter Care for All.',
      subtitle: 'We collaborate with organizations that share our commitment to improving health outcomes and strengthening the communities we serve.'
    },
    '/about/mission': {
      tag: 'Mission & Values',
      title: 'Our Mission.\nOur Commitment.',
      subtitle: 'Guided by purpose and driven by core values, we are committed to transforming healthcare through patient-first care.'
    },
    '/about/leadership': {
      tag: 'Leadership',
      title: 'Guided by Clinical Excellence.',
      subtitle: 'Meet the team of medical professionals and healthcare leaders dedicated to shaping the future of First Medical Associates.'
    }
  };

  const currentHero = heroContent[pathname] || heroContent['/about'];

  const tabs = [
    { name: 'About', href: '/about', icon: Info },
    { name: 'Careers', href: '/about/careers', icon: Briefcase },
    { name: 'Partner With Us', href: '/about/partners', icon: Handshake },
    { name: 'Mission & Values', href: '/about/mission', icon: Target },
    { name: 'Leadership', href: '/about/leadership', icon: Users },
  ];

  return (
    <main className="container">
      <style>{`
        .about-hero { padding: 4rem 0 2rem; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: flex-start; }
        .hero-title { font-size: 3.5rem; font-weight: 800; color: #001c55; line-height: 1.1; marginBottom: 2rem; white-space: pre-line; }
        .hero-subtitle-box { padding-top: 2.5rem; }
        .hero-subtitle { color: #475569; font-size: 1.125rem; line-height: 1.6; max-width: 400px; }
        
        @media (max-width: 1024px) {
          .about-hero { padding: 2rem 0 1rem; }
          .hero-grid { grid-template-columns: 1fr; gap: 2rem; }
          .hero-title { font-size: 2.5rem; white-space: normal; }
          .hero-subtitle-box { padding-top: 0; }
        }
        @media (max-width: 640px) {
          .hero-title { font-size: 2rem; }
        }
      `}</style>
      <section className="about-hero">
        <div className="hero-grid">
          <div>
            <div className="hero-tag" style={{ color: '#0070f3', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>{currentHero.tag}</div>
            <h1 className="hero-title" style={{ marginBottom: '2rem' }}>
              {currentHero.title}
            </h1>
          </div>
          <div className="hero-subtitle-box">
            <p className="hero-subtitle">
              {currentHero.subtitle}
            </p>
          </div>
        </div>
      </section>

      <nav className="tabs-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link 
              key={tab.href} 
              href={tab.href}
              className={`tab-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              {tab.name}
            </Link>
          );
        })}
      </nav>

      <div className="tab-content">
        {children}
      </div>
    </main>
  );
}
