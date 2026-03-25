import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

import authRoute from './routes/auth.js';
import scoresRoute from './routes/scores.js';
import drawsRoute from './routes/draws.js';
import charitiesRoute from './routes/charities.js';
import adminRoute from './routes/admin.js';
import stripeRoute from './routes/stripe.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
// Stripe webhook needs raw body, but for MVP mocking we parse JSON
app.use(express.json());

app.use('/api/auth', authRoute);
app.use('/api/scores', scoresRoute);
app.use('/api/draws', drawsRoute);
app.use('/api/charities', charitiesRoute);
app.use('/api/admin', adminRoute);
app.use('/api/stripe', stripeRoute);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Golf Charity API is running.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
