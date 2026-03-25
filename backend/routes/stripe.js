import express from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth } from './auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' });

// Create Checkout Session — requires auth, userId derived from JWT (cannot be spoofed)
router.post('/create-checkout-session', verifyAuth, async (req, res) => {
    const { planType, returnUrl } = req.body;
    const userId = req.user.id; // derived from verified JWT

    // Check if user already has an active subscription
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status, subscription_expires')
        .eq('id', userId)
        .single();

    if (profile && profile.subscription_status === 'active' && profile.subscription_expires && new Date(profile.subscription_expires) > new Date()) {
        return res.status(400).json({ error: 'You already have an active subscription. Please wait until it expires to change plans.' });
    }

    const priceId = planType === 'yearly' ? (process.env.STRIPE_YEARLY_PRICE || 'price_yearly_placeholder') : (process.env.STRIPE_MONTHLY_PRICE || 'price_monthly_placeholder');

    // If Stripe is not configured in local/dev, simulate subscription activation flow
    const stripeConfigured = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder') && !priceId.includes('placeholder');

    if (!stripeConfigured) {
        // Directly set user as active with expiry in DB and return fake URL
        const expires = new Date();
        if (planType === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
        else expires.setMonth(expires.getMonth() + 1);

        await supabaseAdmin.from('profiles').update({
            subscription_status: 'active',
            subscription_plan: planType,
            subscription_expires: expires.toISOString(),
            stripe_customer_id: 'local-mock',
            stripe_subscription_id: 'local-mock'
        }).eq('id', userId);

        return res.json({ url: `${returnUrl}?session_id=mock_session` });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: returnUrl,
            client_reference_id: userId,
            metadata: { planType },
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stripe Webhook (needs raw body, but assuming global express.json() is configured to handle it correctly or it's mocked)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    // Real world: Verify Stripe signature here using endpointSecret
    const event = req.body;

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const planType = session.metadata?.planType || 'monthly';

        if (userId) {
            const now = new Date();
            const expires = new Date(now);
            if (planType === 'yearly') {
                expires.setFullYear(expires.getFullYear() + 1);
            } else {
                expires.setMonth(expires.getMonth() + 1);
            }

            await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_status: 'active',
                    subscription_plan: planType,
                    subscription_expires: expires.toISOString(),
                    stripe_customer_id: session.customer,
                    stripe_subscription_id: session.subscription
                })
                .eq('id', userId);
        }
    }

    res.json({ received: true });
});

export default router;
