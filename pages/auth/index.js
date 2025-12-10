import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabaseClient';

const planConfig = [
  {
    id: 'basic',
    name: 'Basic',
    priceLabel: '$199/mo',
    description: 'For small teams validating event-driven claims workflows.',
    features: [
      'Up to 5 analyst seats',
      'U.S. hail & wind events',
      'Property-level probability scores',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceLabel: '$499/mo',
    description: 'For regional carriers and MGAs scaling claims intelligence.',
    features: [
      'Up to 20 analyst seats',
      'Hail, wind, fire, FEMA events',
      'Priority ingestion and support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: '$2,500/mo+',
    description: 'For national carriers requiring SSO, SLAs, and data exports.',
    features: [
      'Unlimited users',
      'Dedicated environment',
      'Custom data contracts & SLAs',
    ],
  },
];

const STRIPE_PRICE_IDS = {
  basic: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  enterprise: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
};

export default function AuthAndBillingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);

  // Auth form state
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Billing state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [portalCustomerId, setPortalCustomerId] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data?.user || null);
    };
    loadUser();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.user) {
      router.push('/');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.session || data.user) {
      // Auto-login after registration
      router.push('/');
    } else {
      setAuthError(
        'Check your email to confirm your account, then sign in to continue.'
      );
    }
  };

  const handlePasswordReset = async () => {
    setAuthError('');
    if (!email) {
      setAuthError('Enter your email address first to receive a reset link.');
      return;
    }
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setAuthError(
          'If an account exists for this email, a reset link has been sent.'
        );
      }
    } catch (err) {
      setAuthError('Unable to send reset email at this time.');
    }
  };

  const handleCheckout = async (planId) => {
    setBillingError('');
    setCheckoutLoading(true);
    try {
      const plan = planConfig.find((p) => p.id === planId);
      if (!plan) {
        setBillingError('Unknown plan selected.');
        setCheckoutLoading(false);
        return;
      }

      const priceId = STRIPE_PRICE_IDS[planId];
      if (!priceId) {
        setBillingError(
          `Missing Stripe price ID for ${plan.name} plan. Set NEXT_PUBLIC_STRIPE_${planId.toUpperCase()}_PRICE_ID.`
        );
        setCheckoutLoading(false);
        return;
      }

      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();
      setCheckoutLoading(false);
      if (!response.ok) {
        setBillingError(data.error || 'Unable to start checkout.');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError('Stripe did not return a checkout URL.');
      }
    } catch (err) {
      setCheckoutLoading(false);
      setBillingError('Unexpected error starting checkout.');
    }
  };

  const handlePortal = async () => {
    setBillingError('');
    if (!portalCustomerId) {
      setBillingError('Enter your Stripe customer ID to access the portal.');
      return;
    }
    setPortalLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId: portalCustomerId }),
      });
      const data = await response.json();
      setPortalLoading(false);
      if (!response.ok) {
        setBillingError(data.error || 'Unable to open billing portal.');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError('Stripe did not return a billing portal URL.');
      }
    } catch (err) {
      setPortalLoading(false);
      setBillingError('Unexpected error opening billing portal.');
    }
  };

  return (
    <Layout user={currentUser}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Auth section */}
        <section className="ci-card p-5 sm:p-6">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
            Access Loss Locator Pro
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your workspace or create a new account to get started.
          </p>

          <div className="mt-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md py-1.5 ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-md py-1.5 ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          <form
            className="mt-4 space-y-4"
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="you@carrier.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="Enter a strong password"
              />
            </div>
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Re-enter your password"
                />
              </div>
            )}

            {authError && (
              <p className="text-xs text-rose-500">{authError}</p>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={authLoading}
                className="ci-button-primary"
              >
                {authLoading
                  ? mode === 'login'
                    ? 'Signing in…'
                    : 'Creating account…'
                  : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              </button>
              <button
                type="button"
                onClick={handlePasswordReset}
                className="text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                Forgot password?
              </button>
            </div>
          </form>

          {currentUser && (
            <p className="mt-4 text-[11px] text-emerald-600">
              You are already signed in. Completing checkout will attach billing
              to your existing workspace.
            </p>
          )}
        </section>

        {/* Billing section */}
        <section className="space-y-4">
          <div className="ci-card p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Choose your Loss Locator Pro plan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Start with the plan that fits your claims operation. You can
              upgrade or downgrade later from the billing portal.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {planConfig.map((plan) => (
                <div
                  key={plan.id}
                  className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {plan.priceLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.description}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                      {plan.features.map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading}
                    className="mt-4 ci-button-primary w-full"
                  >
                    {checkoutLoading ? 'Starting checkout…' : 'Start with this plan'}
                  </button>
                </div>
              ))}
            </div>

            {billingError && (
              <p className="mt-3 text-xs text-rose-500">{billingError}</p>
            )}
          </div>

          {currentUser && (
            <div className="ci-card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Manage billing
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Already a customer? Enter your Stripe customer ID to open the
                self-service billing portal.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={portalCustomerId}
                  onChange={(e) => setPortalCustomerId(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="cus_1234…"
                />
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="ci-button-secondary sm:w-auto"
                >
                  {portalLoading ? 'Opening portal…' : 'Manage billing'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}



