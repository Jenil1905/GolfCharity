import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';

const router = express.Router();

// Middleware to verify Supabase JWT
export const verifyAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = user;
    next();
};

// Admin Middleware
export const verifyAdmin = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    if (error || profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
};

export default router;
