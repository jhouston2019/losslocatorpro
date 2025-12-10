"use client";

import NavBar from "@/app/components/NavBar";

export default function InternalLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100">
      <NavBar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}




