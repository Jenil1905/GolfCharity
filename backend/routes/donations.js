import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth } from './auth.js';

const router = express.Router();

// Public: Create an independent donation
router.post('/', async (req, res) => {
    const { charity_id, amount, userId } = req.body;

    if (!charity_id || !amount) {
        return res.status(400).json({ error: 'Charity ID and Amount are required.' });
    }

    const { data, error } = await supabaseAdmin
        .from('donations')
        .insert([{ 
            charity_id, 
            amount: Number(amount), 
            user_id: userId || null, // Optional for guests
            status: 'completed' // Mocking successful payment
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// Admin: list all donations
router.get('/', verifyAuth, async (req, res) => {
    // Check if admin (could use verifyAdmin middleware but keeping it simple for now)
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', req.user.id).single();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Not an admin' });

    const { data, error } = await supabaseAdmin
        .from('donations')
        .select('*, charities(name), profiles(first_name, last_name)')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

export default router;
