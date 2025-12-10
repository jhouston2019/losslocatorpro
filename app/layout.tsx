import '../styles/globals.css';
import React from 'react';
import DemoTag from './components/DemoTag';

export const metadata = {
  title: 'Loss Locator Pro — Internal Console',
  description: 'Internal loss intelligence and lead routing console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-50 antialiased">
        <DemoTag />
        {children}
      </body>
    </html>
  );
}


