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
    <header className="border-b border-neutral-800 bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-sm bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-100">
            LL
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-50">
              Loss Locator Pro — Internal
            </span>
            <span className="text-[11px] text-neutral-400">
              Loss intelligence & lead routing console
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-2 text-xs font-medium text-neutral-300 border-x border-neutral-800 px-3 py-1 rounded-md bg-neutral-900/40">
          {navItems.map((item) => {
            const isPropertyGroup =
              item.href.startsWith('/property') &&
              pathname?.startsWith('/property');
            const active =
              pathname === item.href || isPropertyGroup;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-md hover:bg-neutral-800 ${
                  active ? 'bg-neutral-800 text-white' : 'text-neutral-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-xs text-neutral-300">
          <span className="hidden sm:inline text-neutral-400">Ops user</span>
          <button
            type="button"
            className="rounded border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-neutral-200 hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}


