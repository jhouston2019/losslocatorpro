"use client";

import NavBar from "@/app/components/NavBar";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}





