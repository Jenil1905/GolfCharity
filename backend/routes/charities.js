import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth, verifyAdmin } from './auth.js';

const router = express.Router();

// Public: list all charities
router.get('/', async (req, res) => {
    const { data, error } = await supabaseAdmin.from('charities').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Admin: add charity
router.post('/', verifyAuth, verifyAdmin, async (req, res) => {
    const { name, description, image_url, is_featured } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { data, error } = await supabaseAdmin
        .from('charities')
        .insert([{ name, description, image_url, is_featured: !!is_featured }])
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// Admin: edit charity
router.patch('/:id', verifyAuth, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, image_url, is_featured } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_featured !== undefined) updates.is_featured = is_featured;

    const { data, error } = await supabaseAdmin
        .from('charities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Admin: delete charity
router.delete('/:id', verifyAuth, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('charities').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Charity deleted' });
});

export default router;
