'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut, getCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/loss-feed', label: 'Loss Feed' },
  { href: '/lead-routing', label: 'Lead Routing' },
  { href: '/property/10001', label: 'Property Lookup' },
  { href: '/admin', label: 'Admin' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      setSigningOut(false);
    }
  };

  return (
    <header className="w-full bg-[#2D3748] border-b border-[#3A4556]" style={{ boxShadow: 'var(--panel-shadow)' }}>
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#00B8D9] font-bold text-slate-900 shadow-glow-cyan">
            LL
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-white">
              Loss Locator Pro — Internal
            </p>
            <p className="text-xs text-[#B8BFCC]">
              Loss intelligence & routing
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-xs font-medium px-4 py-2">
          {navItems.map((item) => {
            const isPropertyGroup =
              item.href.startsWith('/property') &&
              pathname?.startsWith('/property');
            const active = pathname === item.href || isPropertyGroup;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
  ${active ? "bg-[#00D9FF] text-slate-900 shadow-glow-cyan" : "text-[#B8BFCC] hover:bg-[#3A4556] hover:text-white"}
`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-xs pr-4">
          <span className="hidden sm:inline text-[#B8BFCC]">
            {user?.email || 'Loading...'}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg border border-[#4A5568] bg-[#3A4556] px-3 py-1.5 text-[11px] font-medium text-gray-300 hover:bg-[#4A5568] hover:border-[#00D9FF] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}


