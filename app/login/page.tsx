'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700 shadow-lg w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4 text-white">
          Loss Locator Pro — Internal Console
        </h1>

        <p className="text-sm text-neutral-400 mb-6">
          Internal access only. Use your assigned credentials.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500"
          />

          <button
            type="submit"
            className="w-full p-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}


