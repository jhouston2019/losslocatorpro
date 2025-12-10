'use client';

import { usePathname } from 'next/navigation';

export default function DemoTag() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 flex justify-end">
      <p className="text-xs text-neutral-500">
        Internal Use — Prototype Demo
      </p>
    </div>
  );
}


