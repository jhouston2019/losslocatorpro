'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/loss-feed', label: 'Loss Feed' },
  { href: '/lead-routing', label: 'Lead Routing' },
  { href: '/property/12345', label: 'Property Lookup' },
  { href: '/admin', label: 'Admin' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="w-full bg-sapphire-800 border-b border-slateglass-700 shadow-card">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-sapphire-700 font-bold text-white shadow-card">
            LL
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-white">
              Loss Locator Pro — Internal
            </p>
            <p className="text-xs text-neutral-400">
              Loss intelligence & routing
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-xs font-medium text-neutral-300 px-4 py-2">
          {navItems.map((item) => {
            const isPropertyGroup =
              item.href.startsWith('/property') &&
              pathname?.startsWith('/property');
            const active = pathname === item.href || isPropertyGroup;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium
  ${active ? "bg-sapphire-700 text-white shadow-card" : "text-neutral-300 hover:bg-sapphire-700/40"}
`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-xs text-neutral-300 pr-4">
          <span className="hidden sm:inline text-neutral-300">Ops user</span>
          <button
            type="button"
            className="rounded-lg border border-slateglass-700 bg-sapphire-700 px-3 py-1.5 text-[11px] font-medium text-neutral-100 hover:bg-sapphire-600 shadow-card"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}


