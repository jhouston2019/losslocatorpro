'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
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

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-900/20 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full p-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 disabled:opacity-50"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full p-2 rounded-md bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}


