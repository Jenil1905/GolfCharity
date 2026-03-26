import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth, verifyAdmin } from './auth.js';

const router = express.Router();

// ─── Profile/Role Checks ────────────────────────────────────────────────────

router.get('/profile', verifyAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*, charities(name, description, image_url)')
        .eq('id', req.user.id)
        .maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    
    res.json(data);
});

// Users can update their charity selection and contribution percentage
router.patch('/profile', verifyAuth, async (req, res) => {
    const { selected_charity_id, charity_percentage, first_name, last_name, phone } = req.body;
    const updates = {};
    if (selected_charity_id !== undefined) updates.selected_charity_id = selected_charity_id;
    if (charity_percentage !== undefined) updates.charity_percentage = Number(charity_percentage);
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;

    if (updates.charity_percentage !== undefined && (updates.charity_percentage < 10 || updates.charity_percentage > 100)) {
        return res.status(400).json({ error: 'Charity percentage must be between 10 and 100.' });
    }

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', req.user.id)
        .select('*, charities(name, description, image_url)')
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Mock Activation (Bypasses Stripe for testing)
router.post('/mock-activate', verifyAuth, async (req, res) => {
    const { planType } = req.body;
    if (!['monthly', 'yearly'].includes(planType)) {
        return res.status(400).json({ error: 'Invalid plan type' });
    }

    const now = new Date();
    const expiresAt = new Date(now);
    if (planType === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
            subscription_status: 'active',
            subscription_plan: planType,
            subscription_started_at: now.toISOString(),
            subscription_expires: expiresAt.toISOString()
        })
        .eq('id', req.user.id)
        .select('*, charities(name, description, image_url)')
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/check-role', verifyAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();
    if (error) return res.status(500).json({ error: error.message });
    console.log(`[check-role] user: ${req.user.id}, role in DB: ${data?.role}`);
    if (data?.role !== 'admin') return res.status(403).json({ error: 'Not an admin', yourRole: data?.role });
    res.json({ role: 'admin' });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

router.get('/analytics', verifyAuth, verifyAdmin, async (req, res) => {
    const [usersRes, activeRes, drawsRes, winnersRes, donationsRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').neq('role', 'admin'),
        supabaseAdmin.from('draws').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('winners').select('prize_amount, donation_amount, net_amount, status, profiles(charity_percentage)'),
        supabaseAdmin.from('donations').select('amount, winner_id'),
    ]);

    const totalUsers = usersRes.count || 0;
    const activeSubscribers = activeRes.count || 0;
    const totalDraws = drawsRes.count || 0;
    
    // £10/user baseline. 10% of this (£1/user) is the platform's baseline charity impact.
    const totalPrizePool = activeSubscribers * 10; 
    const platformBaselineCharity = activeSubscribers * 1; // 10% of 10

    // Calculate prize donations and payouts considering both pending and paid winners.
    // This represents "what we are going to pay" and "what is coming from winnings".
    let prizeDonations = 0;
    let totalPaidOut = 0;

    (winnersRes.data || []).forEach(w => {
        if (w.status === 'paid') {
            prizeDonations += Number(w.donation_amount || 0);
            totalPaidOut += Number(w.net_amount || 0);
        } else {
            // Potential amounts for pending winners based on their profile preference
            const pct = w.profiles?.charity_percentage || 10;
            const prize = Number(w.prize_amount || 0);
            prizeDonations += prize * (pct / 100);
            totalPaidOut += prize * (1 - (pct / 100));
        }
    });

    // One-time donations (not linked to a winner entry)
    const totalDirectDonations = (donationsRes.data || []).filter(d => !d.winner_id).reduce((sum, d) => sum + Number(d.amount || 0), 0);

    // Total Charity Impact = 10% of Price Pool + Winning Impact + One-time Donations
    const totalCharityImpact = platformBaselineCharity + prizeDonations + totalDirectDonations;

    const { count: monthlySubscribers = 0 } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .neq('role', 'admin')
        .eq('subscription_plan', 'monthly');

    const { count: yearlySubscribers = 0 } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .neq('role', 'admin')
        .eq('subscription_plan', 'yearly');

    res.json({ 
        totalUsers, 
        activeSubscribers, 
        totalDraws, 
        totalPrizePool, 
        totalPaidOut, 
        totalCharityImpact, 
        monthlySubscribers, 
        yearlySubscribers, 
        totalDonations: totalDirectDonations, 
        prizeDonations 
    });
});

// ─── User Management ─────────────────────────────────────────────────────────

router.get('/users', verifyAuth, verifyAdmin, async (req, res) => {
    // Get profiles excluding admins
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*, scores(count)')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // Get auth users to pull real emails
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const emailMap = {};
    authUsers.forEach(u => { emailMap[u.id] = u.email; });

    const enriched = profiles.map(p => ({ ...p, email: emailMap[p.id] || null }));
    res.json(enriched);
});

router.patch('/users/:id', verifyAuth, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, subscription_status, role } = req.body;
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (subscription_status !== undefined) updates.subscription_status = subscription_status;
    if (role !== undefined) updates.role = role;

    // Set started_at if activating
    if (subscription_status === 'active') {
        const { data: current } = await supabaseAdmin.from('profiles').select('subscription_started_at').eq('id', id).single();
        if (!current?.subscription_started_at) {
            updates.subscription_started_at = new Date().toISOString();
        }
    }

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.get('/users/:id/scores', verifyAuth, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
        .from('scores')
        .select('*')
        .eq('user_id', id)
        .order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.delete('/users/:userId/scores/:scoreId', verifyAuth, verifyAdmin, async (req, res) => {
    const { scoreId } = req.params;
    const { error } = await supabaseAdmin.from('scores').delete().eq('id', scoreId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Score deleted' });
});

// ─── Winners Management ──────────────────────────────────────────────────────

router.get('/winners', verifyAuth, verifyAdmin, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('winners')
        .select('*, profiles(first_name, last_name), draws(draw_month, winning_numbers)')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// User-only route: fetch the caller's winner entries
router.get('/my-winners', verifyAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('winners')
        .select('*, draws(draw_month)')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// User uploads proof for their own winner entry
router.post('/my-winners/:id/proof', verifyAuth, async (req, res) => {
    const { id } = req.params;
    const { proof_image_url } = req.body;

    const allowed = ['pending', 'rejected'];
    const existing = await supabaseAdmin.from('winners').select('status').eq('id', id).eq('user_id', req.user.id).single();
    if (!existing.data) return res.status(404).json({ error: 'Winner entry not found.' });
    if (!allowed.includes(existing.data.status)) return res.status(400).json({ error: 'Cannot submit proof for approved payout.' });

    const { data, error } = await supabaseAdmin
        .from('winners')
        .update({ proof_image_url, status: 'pending' })
        .eq('id', id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

router.patch('/winners/:id', verifyAuth, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Fetch current winner and user preference
    const { data: winner, error: fetchErr } = await supabaseAdmin
        .from('winners')
        .select('*, profiles(charity_percentage, selected_charity_id)')
        .eq('id', id)
        .single();
    
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    const updates = { status };

    if (status === 'paid') {
        const percentage = winner.profiles?.charity_percentage || 10;
        const totalPrize = Number(winner.prize_amount);
        
        const donationAmount = totalPrize * (percentage / 100);
        const netAmount = totalPrize - donationAmount;

        updates.donation_amount = donationAmount;
        updates.net_amount = netAmount;

        // 2. Record the donation officially
        if (donationAmount > 0) {
            await supabaseAdmin.from('donations').insert({
                user_id: winner.user_id,
                charity_id: winner.profiles?.selected_charity_id,
                winner_id: id,
                amount: donationAmount,
                status: 'completed'
            });
        }
    }

    const { data, error } = await supabaseAdmin
        .from('winners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
