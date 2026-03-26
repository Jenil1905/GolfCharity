import express from 'express';
import { supabaseAdmin } from '../utils/supabaseClient.js';
import { verifyAuth, verifyAdmin } from './auth.js';

const router = express.Router();

// Helper to generate 5 random unique numbers (1-45)
function generateRandomNumbers() {
    const nums = new Set();
    while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
    return Array.from(nums).sort((a, b) => a - b);
}

// Algorithmic: weight towards most frequent user scores
async function generateAlgorithmicNumbers() {
    const { data: scores } = await supabaseAdmin.from('scores').select('score');
    if (!scores || scores.length < 5) return generateRandomNumbers();
    const freq = {};
    scores.forEach(s => freq[s.score] = (freq[s.score] || 0) + 1);
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(x => Number(x[0]));
    const nums = new Set();
    sorted.slice(0, 2).forEach(n => nums.add(n));
    while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
    return Array.from(nums).sort((a, b) => a - b);
}

// Check matches for a user's scores against winning numbers
function countMatches(userScores, winningNumbers) {
    const winSet = new Set(winningNumbers);
    return userScores.filter(s => winSet.has(s.score)).length;
}

// Simulate draw (does not save)
router.post('/simulate', verifyAuth, verifyAdmin, async (req, res) => {
    const { type } = req.body;
    const winning_numbers = type === 'algorithmic'
        ? await generateAlgorithmicNumbers()
        : generateRandomNumbers();

    const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('subscription_status', 'active');

    let match5 = 0, match4 = 0, match3 = 0;
    if (users) {
        for (const u of users) {
            const { data: userScores } = await supabaseAdmin
                .from('scores').select('score').eq('user_id', u.id)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(5);
            if (!userScores) continue;
            const matches = countMatches(userScores, winning_numbers);
            if (matches === 5) match5++;
            else if (matches === 4) match4++;
            else if (matches === 3) match3++;
        }
    }

    res.json({ winning_numbers, match5, match4, match3 });
});

// Get history of published draws (public)
router.get('/history', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('draws')
        .select('*')
        .order('draw_month', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get latest draw details (public)
router.get('/current', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('draws')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get current jackpot stats (public)
router.get('/stats', async (req, res) => {
    try {
        const { count: activeCount } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('subscription_status', 'active');
        
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
        
        res.json({
            activeSubscribers: activeCount || 0,
            estimatedPool: (activeCount || 0) * 10,
            nextDrawDate: lastDayOfMonth.toISOString()
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hall of Fame (public)
router.get('/hall-of-fame', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('winners')
            .select('prize_amount, match_tier, profiles(first_name, last_name), draws(draw_month)')
            .order('created_at', { ascending: false })
            .limit(15);
        if (error) throw error;
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Publish draw — saves draw to DB and generates winners
router.post('/publish', verifyAuth, verifyAdmin, async (req, res) => {
    const { winning_numbers, draw_type } = req.body;
    if (!winning_numbers || winning_numbers.length !== 5) {
        return res.status(400).json({ error: 'You must simulate a draw first before publishing.' });
    }

    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7) + '-01'; 

    // Guard: Prevent double-publishing for the same month
    const { data: existing } = await supabaseAdmin
        .from('draws')
        .select('id')
        .eq('draw_month', currentMonthStr)
        .limit(1)
        .maybeSingle();

    if (existing) {
        return res.status(400).json({ error: `A draw has already been published for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}.` });
    }

    const drawMonth = new Date(currentMonthStr);

    // total prize pool based on active subscribers
    const { data: users, error: usersError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('subscription_status', 'active');
    if (usersError) return res.status(500).json({ error: usersError.message });

    const totalPool = (users?.length || 0) * 10; // £10/user/month

    // Determine rollover from previous unclaimed 5-match pools
    const { data: rolloverDraws, error: rolloverError } = await supabaseAdmin
        .from('draws')
        .select('total_pool')
        .eq('jackpot_rolled_over', true);
    if (rolloverError) return res.status(500).json({ error: rolloverError.message });

    let rolloverAmount = 0;
    if (rolloverDraws && rolloverDraws.length > 0) {
        rolloverAmount = rolloverDraws.reduce((sum, d) => sum + Number(d.total_pool || 0) * 0.4, 0);
    }

    const fivePool = rolloverAmount + totalPool * 0.40;
    const fourPool = totalPool * 0.35;
    const threePool = totalPool * 0.25;

    // Evaluate winners
    const winnerCandidates = [];
    let matchCounts = { 5: 0, 4: 0, 3: 0 };

    for (const u of users || []) {
        const { data: userScores } = await supabaseAdmin
            .from('scores').select('score').eq('user_id', u.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(5);
        if (!userScores) continue;

        const matches = countMatches(userScores, winning_numbers);
        if (matches >= 3) {
            matchCounts[matches]++;
            winnerCandidates.push({ user_id: u.id, match_tier: matches });
        }
    }

    const drawRecord = {
        draw_month: drawMonth.toISOString().split('T')[0],
        winning_numbers,
        is_published: true,
        draw_type: draw_type || 'random',
        total_pool: totalPool,
        jackpot_rolled_over: matchCounts[5] === 0,
    };

    const { data: draw, error: drawError } = await supabaseAdmin
        .from('draws')
        .insert([drawRecord])
        .select()
        .single();

    if (drawError) return res.status(500).json({ error: drawError.message });

    // If there are winners, split tier pools equally
    const winnerInserts = [];
    const tierPools = { 5: fivePool, 4: fourPool, 3: threePool };

    for (const candidate of winnerCandidates) {
        const count = matchCounts[candidate.match_tier];
        if (count === 0) continue;
        const prizeAmount = Number((tierPools[candidate.match_tier] / count).toFixed(2));
        winnerInserts.push({
            user_id: candidate.user_id,
            draw_id: draw.id,
            match_tier: candidate.match_tier,
            prize_amount: prizeAmount,
            status: 'pending',
        });
    }

    if (winnerInserts.length > 0) {
        const { error: insertError } = await supabaseAdmin.from('winners').insert(winnerInserts);
        if (insertError) return res.status(500).json({ error: insertError.message });
    }

    res.json({
        draw,
        winnersGenerated: winnerInserts.length,
        matchCounts,
        tierPools: {
            '5': Number(fivePool.toFixed(2)),
            '4': Number(fourPool.toFixed(2)),
            '3': Number(threePool.toFixed(2)),
        },
        rolloverAmount: Number(rolloverAmount.toFixed(2)),
    });
});

export default router;
