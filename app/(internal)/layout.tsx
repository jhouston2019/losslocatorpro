"use client";

import NavBar from "@/app/components/NavBar";

export default function InternalLayout({ children }) {
  return (
    <div className="flex">
      <NavBar />
      <main className="flex-1 p-6 ml-64">
        {children}
      </main>
    </div>
  );
}


