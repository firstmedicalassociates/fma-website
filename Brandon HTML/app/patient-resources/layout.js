'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  Megaphone,
  FileText,
  BookOpen
} from 'lucide-react';

export default function PatientResourceLayout({ children }) {
  const pathname = usePathname();

  const heroContent = {
    '/patient-resources': {
      subtitle: 'Streamlined access to insurance verification, clinical forms, and essential tools for managing your healthcare journey with First Medical Associates.',
      icon: FileText
    },
    '/patient-resources/insurance': {
      subtitle: 'Streamlined access to insurance verification, clinical forms, and essential tools for managing your healthcare journey with First Medical Associates.',
      icon: FileText
    },
    '/patient-resources/education': {
      subtitle: 'Expert medical insights, clinical guides, and essential tools curated by our specialists to empower your health journey.',
      icon: BookOpen
    },
    '/patient-resources/press': {
      subtitle: 'Expert medical insights, clinical updates, and important news from First Medical Associates.',
      icon: Megaphone
    }
  };

  const currentHero = heroContent[pathname] || heroContent['/patient-resources'];
  const HeroIcon = currentHero.icon;

  const tabs = [
    { name: 'Overview', href: '/patient-resources', icon: LayoutDashboard },
    { name: 'Insurance', href: '/patient-resources/insurance', icon: ShieldCheck },
    { name: 'Patients', href: '/patient-resources/patients', icon: Users },
    { name: 'Education', href: '/patient-resources/education', icon: GraduationCap },
    { name: 'Press Releases', href: '/patient-resources/press', icon: Megaphone },
  ];

  return (
    <main className="container">
      <section className="resource-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="hero-tag">Central Hub</div>
            <h1 className="hero-title">Patient Resource Center</h1>
            <p className="hero-subtitle">
              {currentHero.subtitle}
            </p>
          </div>
          <div style={{ background: '#e8f0fe', padding: '1.5rem', borderRadius: '12px' }}>
             <HeroIcon size={40} color="#001c55" />
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
