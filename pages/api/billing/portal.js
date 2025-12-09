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

  const { customerId } = req.body || {};

  if (!customerId) {
    return res
      .status(400)
      .json({ error: 'Missing required parameter: customerId' });
  }

  try {
    const origin =
      req.headers.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/auth`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Stripe billing portal error', error);
    return res.status(500).json({
      error: 'Unable to create Stripe billing portal session.',
    });
  }
}



