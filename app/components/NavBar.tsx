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
    <header className="w-full bg-white border-b border-gray-200" style={{ boxShadow: 'var(--panel-shadow)' }}>
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            LL
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">
              Loss Locator Pro — Internal
            </p>
            <p className="text-xs text-slate-600">
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition
  ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-gray-100"}
`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-xs pr-4">
          <span className="hidden sm:inline text-slate-700">
            {user?.email || 'Loading...'}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  );
}


