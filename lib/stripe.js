import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // We intentionally throw here so API routes fail loudly in development
  throw new Error(
    'Missing Stripe environment variable. Please set STRIPE_SECRET_KEY on the server.'
  );
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});


