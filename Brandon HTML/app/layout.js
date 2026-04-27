'use client';
import './globals.css';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="site-header">
          <div className="container nav-container">
            <Link href="/" className="logo">First Medical Associates</Link>
            <nav className="main-nav">
              <Link href="/about" className={`nav-link ${pathname.startsWith('/about') ? 'active' : ''}`}>About</Link>
              <Link href="/patient-resources" className={`nav-link ${pathname.startsWith('/patient-resources') ? 'active' : ''}`}>Patient Resources</Link>
            </nav>
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="container">
            <div className="footer-content">
              <div className="logo">First Medical Associates</div>
              <div className="footer-links">
                <Link href="/privacy" className="nav-link">Privacy Policy</Link>
                <Link href="/terms" className="nav-link">Terms of Service</Link>
                <Link href="/hipaa" className="nav-link">HIPAA Compliance</Link>
                <Link href="/accessibility" className="nav-link">Accessibility</Link>
              </div>
            </div>
            <div className="footer-bottom">
              <div>© 2024 First Medical Associates. Built for Clinical Excellence.</div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
