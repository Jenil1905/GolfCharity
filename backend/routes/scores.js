import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth } from './auth.js';

const router = express.Router();

router.get('/', verifyAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('scores')
        .select('*')
        .eq('user_id', req.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Delete a score
router.delete('/:id', verifyAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to delete score: ${id} for user: ${req.user.id}`);
        const { error } = await supabaseAdmin
            .from('scores')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Score deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/', verifyAuth, async (req, res) => {
    const { score, date } = req.body;

    if (score < 1 || score > 45) {
        return res.status(400).json({ error: 'Score must be between 1 and 45' });
    }

    // Server-side subscription gate — cannot be bypassed by client
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('subscription_status')
        .eq('id', req.user.id)
        .single();

    if (profileError || profile?.subscription_status !== 'active') {
        return res.status(403).json({ error: 'Active subscription required to submit scores.' });
    }

    // Backend Date Validation
    const submittedDate = new Date(date);
    const now = new Date();
    if (submittedDate > now) {
        return res.status(400).json({ error: 'Score date cannot be in the future.' });
    }

    // Insert novel score
    const { data: newScore, error: insertError } = await supabaseAdmin
        .from('scores')
        .insert([{ user_id: req.user.id, score, date }])
        .select()
        .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    // Get all scores for this user ordered by date ascending (oldest first)
    const { data: allScores, error: fetchError } = await supabaseAdmin
        .from('scores')
        .select('*')
        .eq('user_id', req.user.id)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true }); // tie breaker

    if (fetchError) return res.status(500).json({ error: fetchError.message });

    // Enforce max 5 scores: delete oldest if more than 5
    if (allScores && allScores.length > 5) {
        const toDelete = allScores.slice(0, allScores.length - 5).map(s => s.id);
        await supabaseAdmin.from('scores').delete().in('id', toDelete);
    }

    res.status(201).json(newScore);
});

export default router;
