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
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Users can update their charity selection and contribution percentage
router.patch('/profile', verifyAuth, async (req, res) => {
    const { selected_charity_id, charity_percentage } = req.body;
    const updates = {};
    if (selected_charity_id !== undefined) updates.selected_charity_id = selected_charity_id;
    if (charity_percentage !== undefined) updates.charity_percentage = Number(charity_percentage);

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
    const [usersRes, activeRes, drawsRes, winnersRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active').neq('role', 'admin'),
        supabaseAdmin.from('draws').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('winners').select('prize_amount'),
    ]);

    const totalUsers = usersRes.count || 0;
    const activeSubscribers = activeRes.count || 0;
    const totalDraws = drawsRes.count || 0;
    const totalPrizePool = activeSubscribers * 10; // £10/month assumption
    const totalPaidOut = (winnersRes.data || []).reduce((sum, w) => sum + Number(w.prize_amount), 0);
    const charityContribution = totalPrizePool * 0.10; // 10% goes to charity

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

    res.json({ totalUsers, activeSubscribers, totalDraws, totalPrizePool, totalPaidOut, charityContribution, monthlySubscribers, yearlySubscribers });
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
        .select('*, profiles(first_name, last_name), draws(draw_month)')
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
    const { data, error } = await supabaseAdmin
        .from('winners')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
