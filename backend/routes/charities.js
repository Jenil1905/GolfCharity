import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth, verifyAdmin } from './auth.js';

const router = express.Router();

// Public: list all charities with search and filter
router.get('/', async (req, res) => {
    const { search, category } = req.query;
    let query = supabaseAdmin.from('charities').select('*');

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    const { data, error } = await query.order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Admin: add charity
router.post('/', verifyAuth, verifyAdmin, async (req, res) => {
    const { name, description, image_url, is_featured, category, upcoming_events } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { data, error } = await supabaseAdmin
        .from('charities')
        .insert([{ 
            name, 
            description, 
            image_url, 
            is_featured: !!is_featured,
            category: category || 'General',
            upcoming_events: upcoming_events || []
        }])
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// Admin: edit charity
router.patch('/:id', verifyAuth, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, image_url, is_featured, category, upcoming_events } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (category !== undefined) updates.category = category;
    if (upcoming_events !== undefined) updates.upcoming_events = upcoming_events;

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
