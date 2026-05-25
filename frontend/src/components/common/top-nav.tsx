'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <header className="topnav">
      <div className="topnav-left">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>LumenAI</span>
        </div>
        <span className="ws-pill">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="0.8" fill="none" />
          </svg>
          workspace
        </span>
      </div>
      <nav className="topnav-tabs">
        <Link href="/" className={'nav-tab' + (!isDashboard ? ' active' : '')}>
          Chat
        </Link>
        <Link href="/dashboard" className={'nav-tab' + (isDashboard ? ' active' : '')}>
          Analytics
        </Link>
      </nav>
      <div className="topnav-right">
        <div className="avatar" title="account">a</div>
      </div>
    </header>
  );
}
