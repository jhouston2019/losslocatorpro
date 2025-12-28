'use client';

import { useState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (formData: FormData) => {
    setError('');
    setLoading(true);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="bg-[#1e293b] p-8 rounded-lg border border-[#334155] shadow-panel w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#00D9FF] to-[#00B8D9] font-bold text-slate-900 shadow-glow-cyan">
            LL
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">
              Loss Locator Pro
            </h1>
            <p className="text-xs text-[#B8BFCC]">
              Internal Console
            </p>
          </div>
        </div>

        <p className="text-sm text-[#8B92A3] mb-6">
          Internal access only. Use your assigned credentials.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 text-[#FF3B5C] text-sm">
            {error}
          </div>
        )}

        <form action={handleLogin} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            disabled={loading}
            className="w-full p-3 rounded-md bg-[#1A1D29] border border-[#3A4556] text-white placeholder-[#8B92A3] focus:border-[#00D9FF] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 disabled:opacity-50 transition-all duration-200"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            disabled={loading}
            className="w-full p-3 rounded-md bg-[#1A1D29] border border-[#3A4556] text-white placeholder-[#8B92A3] focus:border-[#00D9FF] focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/20 disabled:opacity-50 transition-all duration-200"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 rounded-md bg-[#00D9FF] hover:bg-[#00B8D9] text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-cyan transition-all duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}


