'use client';

import '../styles/globals.css';
import { usePathname } from 'next/navigation';
import NavBar from '@/app/components/NavBar';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const hideNav = pathname === '/login';

  return (
    <html lang="en">
      <body className="bg-neutral-900 text-neutral-100">
        {!hideNav && <NavBar />}
        <main className={hideNav ? 'w-full' : 'ml-64 p-6'}>{children}</main>
      </body>
    </html>
  );
}


