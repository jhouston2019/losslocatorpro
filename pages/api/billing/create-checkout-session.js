import { stripe } from '../../../lib/stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res
      .status(500)
      .json({ error: 'Stripe secret key is not configured on the server.' });
  }

  const { priceId } = req.body || {};

  if (!priceId) {
    return res.status(400).json({ error: 'Missing required parameter: priceId' });
  }

  try {
    const origin =
      req.headers.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/`,
      cancel_url: `${origin}/auth`,
      automatic_tax: { enabled: true },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Stripe checkout session error', error);
    return res
      .status(500)
      .json({ error: 'Unable to create Stripe Checkout session.' });
  }
}



