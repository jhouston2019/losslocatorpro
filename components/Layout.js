import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Layout({ user, children }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <header className="border-b border-slate-800 bg-[#0A2540]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <div className="h-8 w-8 rounded-lg bg-sky-400/90 flex items-center justify-center text-slate-900 font-bold text-sm">
              CI
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white tracking-tight">
                Loss Locator Pro
              </span>
              <span className="text-xs text-slate-200/80">
                Claim Intelligence Dashboard
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden sm:flex flex-col text-right mr-2">
                <span className="text-xs text-slate-200/80">
                  Signed in as
                </span>
                <span className="text-sm font-medium text-white truncate max-w-[180px]">
                  {user.email}
                </span>
              </div>
            )}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="ci-button-secondary bg-slate-900/60 text-slate-100 border-slate-700 hover:bg-slate-800"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}



