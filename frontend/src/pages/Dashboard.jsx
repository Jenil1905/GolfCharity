import API from '../utils/api';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

function DeleteModal({ isOpen, onConfirm, onCancel, scoreDate }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Score?</h3>
                <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                    Are you sure you want to remove the round from <span className="font-semibold">{scoreDate}</span>? This action can't be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl transition-colors shadow-sm">Delete</button>
                </div>
            </div>
        </div>
    );
}

function SubscribeToast({ show }) {
    if (!show) return null;
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-bounce-in text-sm font-medium">
            <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            </div>
            <span>Subscribe to submit scores</span>
            <span className="text-yellow-400 font-bold">→</span>
        </div>
    );
}

function Countdown({ targetDate }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

    useEffect(() => {
        if (!targetDate) return;
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const countTo = new Date(targetDate).getTime();
            const diff = countTo - now;

            if (diff <= 0) {
                clearInterval(timer);
                return;
            }

            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                secs: Math.floor((diff % (1000 * 60)) / 1000)
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="flex gap-4">
            {[['D', timeLeft.days], ['H', timeLeft.hours], ['M', timeLeft.mins], ['S', timeLeft.secs]].map(([label, val]) => (
                <div key={label} className="flex flex-col">
                    <span className="text-2xl font-black text-gray-900 tabular-nums leading-none">{val.toString().padStart(2, '0')}</span>
                    <span className="text-[9px] font-bold text-gray-300 mt-1">{label}</span>
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const [scores, setScores] = useState([]);
    const [newScore, setNewScore] = useState('');
    const [newDate, setNewDate] = useState('');
    const [session, setSession] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [profile, setProfile] = useState(null);
    const [charities, setCharities] = useState([]);
    const [selectedCharityId, setSelectedCharityId] = useState(null);
    const [charityPercentage, setCharityPercentage] = useState(10);
    const [subscriptionPlan, setSubscriptionPlan] = useState('monthly');
    const [subscriptionExpires, setSubscriptionExpires] = useState(null);
    const [myWinners, setMyWinners] = useState([]);
    const [currentDraw, setCurrentDraw] = useState(null);
    const [showSubToast, setShowSubToast] = useState(false);
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [proofInputs, setProofInputs] = useState({});
    const [stats, setStats] = useState({ estimatedPool: 0, nextDrawDate: null });
    const [isActivating, setIsActivating] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [showCharityModal, setShowCharityModal] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) {
                navigate('/auth');
            } else {
                setSession(session);
                await Promise.all([
                   fetchScores(session.access_token),
                   fetchProfile(session.access_token),
                   fetchCharities(),
                   fetchMyWinners(session.access_token),
                   fetchCurrentDraw(),
                   fetchStats()
                ]);
                setPageLoading(false);
            }
        });
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API}/draws/stats`);
            setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchProfile = async (token) => {
        try {
            const res = await fetch(`${API}/admin/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data) {
                const expiresAt = data.subscription_expires ? new Date(data.subscription_expires) : null;
                const now = new Date();

                // Treat admin-set active as active even if expires missing; if expired, mark inactive.
                let active = data.subscription_status === 'active';
                if (expiresAt) active = expiresAt > now;

                let expiresValue = data.subscription_expires;
                if (active && !expiresValue) {
                    const startDate = data.subscription_started_at ? new Date(data.subscription_started_at) : new Date(data.created_at);
                    const fallbackExpiration = new Date(startDate);
                    if (data.subscription_plan === 'yearly') {
                        fallbackExpiration.setFullYear(fallbackExpiration.getFullYear() + 1);
                    } else {
                        fallbackExpiration.setMonth(fallbackExpiration.getMonth() + 1);
                    }
                    expiresValue = fallbackExpiration.toISOString();
                }

                setProfile(data);
                setSubscriptionStatus(active ? 'active' : 'inactive');
                setSelectedCharityId(data.selected_charity_id || null);
                setCharityPercentage(data.charity_percentage || 10);
                setSubscriptionPlan(data.subscription_plan || 'monthly');
                setSubscriptionExpires(expiresValue || null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCharities = async () => {
        try {
            const res = await fetch(`${API}/charities`);
            const data = await res.json();
            if (Array.isArray(data)) setCharities(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchCurrentDraw = async () => {
        try {
            const res = await fetch(`${API}/draws/current`);
            const data = await res.json();
            setCurrentDraw(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMyWinners = async (token) => {
        try {
            const res = await fetch(`${API}/admin/my-winners`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setMyWinners(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchScores = async (token) => {
        try {
            const res = await fetch(`${API}/scores`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setScores(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddScore = async (e) => {
        e.preventDefault();

        // Subscription gate
        if (subscriptionStatus !== 'active') {
            setShowSubToast(true);
            setTimeout(() => setShowSubToast(false), 3000);
            return;
        }

        // Charity gate
        if (!selectedCharityId) {
            setShowCharityModal(true);
            return;
        }

        if (newScore < 1 || newScore > 45) return alert("Score must be 1-45");
        const selectedDate = new Date(newDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selectedDate > today) return alert("You cannot enter a future date.");

        setIsSubmitting(true);
        try {
            await fetch(`${API}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ score: Number(newScore), date: newDate })
            });
            await fetchScores(session.access_token);
            setNewScore('');
            setNewDate('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`${API}/scores/${deleteId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            await fetchScores(session.access_token);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteId(null);
        }
    };

    const saveProfile = async () => {
        if (!session) return;
        setIsProfileSaving(true);
        try {
            const res = await fetch(`${API}/admin/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    selected_charity_id: selectedCharityId,
                    charity_percentage: Number(charityPercentage),
                    subscription_plan: subscriptionPlan
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Unable to save profile');
            setProfile(data);
            fetchCharities();
            // No need to refetch scores/winners
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setIsProfileSaving(false);
        }
    };

    const submitProof = async (winnerId) => {
        if (!session || !proofInputs[winnerId]) return;
        try {
            const res = await fetch(`${API}/admin/my-winners/${winnerId}/proof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ proof_image_url: proofInputs[winnerId] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Unable to submit proof');
            alert('Proof submitted successfully');
            setProofInputs(prev => ({ ...prev, [winnerId]: '' }));
            fetchMyWinners(session.access_token);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    const handleStripeCheckout = async () => {
        setIsActivating(true);
        // Artificial delay for better UX (simulating payment processing)
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
            const res = await fetch(`${API}/admin/mock-activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ planType: subscriptionPlan })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            // Refresh profile data immediately
            setProfile(data);
            setSubscriptionStatus('active');
            setSubscriptionPlan(data.subscription_plan);
            setSubscriptionExpires(data.subscription_expires);
            fetchStats(); // Update the live jackpot pool immediately!
        } catch (err) {
            console.error(err);
            alert("Activation failed: " + err.message);
        } finally {
            setIsActivating(false);
        }
    };

    if (!session || pageLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-16 h-16 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">Synchronizing Portal...</p>
        </div>
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const deletingScore = scores.find(s => s.id === deleteId);
    const isSubscribed = subscriptionStatus === 'active';
    const expiresAt = subscriptionExpires ? new Date(subscriptionExpires) : null;
    const isPlanLocked = isSubscribed && (expiresAt ? expiresAt > new Date() : true);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <SubscribeToast show={showSubToast} />
            <DeleteModal
                isOpen={!!deleteId}
                onCancel={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                scoreDate={deletingScore ? new Date(deletingScore.date).toLocaleDateString() : ''}
            />

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-black tracking-tight">GolfPulse Portal</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                {/* Stats Header Bar */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-6 text-white shadow-xl flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Live Estimated Jackpot</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black tabular-nums">£{stats.estimatedPool.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-500 font-bold"> (£10 per active member)</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                {currentDraw?.is_published ? 'Next Monthly Deadline' : 'Current Round Status'}
                            </p>
                            {currentDraw?.is_published && (
                                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm border border-green-100 animate-pulse">
                                    Current Month Closed
                                </span>
                            )}
                        </div>
                        
                        {currentDraw?.is_published ? (
                            <Countdown targetDate={stats.nextDrawDate} />
                        ) : (
                            <div className="flex items-center gap-3 py-2">
                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                                    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">Submissions Open</p>
                                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Submit your latest 5 rounds now!</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Left Sidebar: Subscription & Impact */}
                <div className="flex flex-col gap-6 sticky top-24">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-900 p-6 text-white">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Membership</span>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isSubscribed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {isSubscribed ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight mb-1 capitalize">
                                {subscriptionPlan} Plan
                            </h2>
                            <p className="text-xs text-gray-400 font-medium">
                                {isSubscribed ? `Next renewal: ${subscriptionExpires ? new Date(subscriptionExpires).toLocaleDateString() : 'N/A'}` : 'Subscribe to enter the draw'}
                            </p>
                        </div>

                        <div className="p-6">
                            {!isSubscribed ? (
                                <div className="space-y-4">
                                    <div className="flex p-1 bg-gray-800 rounded-xl">
                                        <button 
                                            onClick={() => setSubscriptionPlan('monthly')}
                                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${subscriptionPlan === 'monthly' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Monthly £10
                                        </button>
                                        <button 
                                            onClick={() => setSubscriptionPlan('yearly')}
                                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${subscriptionPlan === 'yearly' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            Yearly £120
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleStripeCheckout} 
                                        disabled={isActivating}
                                        className="w-full py-4 bg-white text-black rounded-2xl hover:bg-gray-100 transition-all font-bold text-sm shadow-xl active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isActivating ? 'Activating account...' : 'Activate Membership'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                     <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl border border-green-100">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                        <div>
                                            <p className="text-xs font-bold text-green-900">Verified Member</p>
                                            <p className="text-[10px] text-green-700">Eligible for monthly prizes</p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Charity Support</p>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 ml-1 mb-1">Target Organization</label>
                                                <select
                                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-gray-200 transition-all outline-none"
                                                    value={selectedCharityId || ''}
                                                    onChange={e => setSelectedCharityId(e.target.value || null)}
                                                >
                                                    <option value="">Select a Charity</option>
                                                    {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 ml-1 mb-1">Contribution Level ({charityPercentage}%)</label>
                                                <input
                                                    type="range" min="10" max="100" step="5"
                                                    value={charityPercentage}
                                                    onChange={e => setCharityPercentage(e.target.value)}
                                                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-900 mb-2"
                                                />
                                                <div className="flex justify-between text-[9px] font-bold text-gray-400 px-1">
                                                    <span>MIN 10%</span>
                                                    <span>MAX 100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={saveProfile}
                                        disabled={isProfileSaving}
                                        className="w-full mt-4 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs disabled:opacity-50"
                                    >
                                        {isProfileSaving ? 'Updating...' : 'Save Preferences'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Impact Card */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Live Impact Summary</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-medium text-gray-500">Charity Selection</span>
                                <span className="text-xs font-black text-gray-900">{profile?.charities?.name || 'Incomplete'}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-medium text-gray-500">Donation Weight</span>
                                <span className="text-xs font-black text-gray-900">{profile?.charity_percentage || 10}%</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-medium text-gray-500">Current Status</span>
                                <span className="text-xs font-black text-green-600 uppercase">Qualifying</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
                    <h2 className="text-xl font-semibold border-b pb-2 mb-6">Rolling 5 Scores (Stableford)</h2>

                    <form onSubmit={handleAddScore} className="flex flex-col sm:flex-row gap-4 mb-8">
                        <input
                            type="number"
                            min="1" max="45"
                            required
                            placeholder="Score (1-45)"
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
                            value={newScore}
                            onChange={e => setNewScore(e.target.value)}
                        />
                        <input
                            type="date"
                            required
                            max={todayStr}
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none text-gray-700 transition-all"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                        />
                        <div className="relative group">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-8 py-3 rounded-xl font-bold transition-all min-w-[120px] shadow-sm active:scale-95 flex items-center justify-center gap-2 ${(!isSubscribed || !selectedCharityId)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-400'
                                    }`}
                            >
                                {isSubmitting ? '...' : 'Submit'}
                            </button>
                            
                            {/* Hover Tooltip for Charity Required */}
                            {isSubscribed && !selectedCharityId && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-10">
                                    Select a charity in your profile to submit!
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                </div>
                            )}
                        </div>
                    </form>

                    {scores.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            No scores recorded yet. Add your latest round!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {scores.map((s, i) => (
                                <div key={s.id || i} className={`flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl transition-all hover:shadow-lg hover:shadow-black/5 group scale-[0.99] hover:scale-[1] border-l-4 ${i === 0 ? 'border-l-green-500' : 'border-l-gray-200'}`}>
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-bold text-lg">{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <div className="flex gap-2 items-center mt-1">
                                            {i === 0 && <span className="text-[10px] text-green-600 font-extrabold uppercase tracking-wide bg-green-50 px-2 py-0.5 rounded">Newest</span>}
                                            {i === scores.length - 1 && scores.length === 5 && <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-wide bg-red-50 px-2 py-0.5 rounded">Drops Next</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-3xl tabular-nums text-gray-900">{s.score}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Points</span>
                                        </div>
                                        <button
                                            onClick={() => setDeleteId(s.id)}
                                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-6 leading-relaxed uppercase tracking-widest font-bold opacity-60">
                        * Only your 5 most recent rounds are retained for the draw.
                    </p>
                </div>
            </div>

            <div className="mt-10 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-semibold border-b pb-2 mb-4">Draw Participation & Winnings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Winnings</p>
                        <p className="text-2xl font-black text-gray-900">£{myWinners.reduce((sum, w) => sum + Number(w.prize_amount || 0), 0).toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Gross Prize Value</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl text-center border-l-4 border-red-500">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Donated</p>
                        <p className="text-2xl font-black text-red-600">£{myWinners.filter(w => w.status === 'paid').reduce((sum, w) => sum + Number(w.donation_amount || 0), 0).toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Impact Contributed</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl text-center border-l-4 border-yellow-400">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Awaiting Payout</p>
                        <p className="text-2xl font-black text-orange-600">£{myWinners.filter(w => w.status !== 'paid' && w.status !== 'rejected').reduce((sum, w) => sum + Number(w.prize_amount * (1 - (profile?.charity_percentage || 10) / 100)), 0).toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Net Estimation</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl text-center border-l-4 border-green-500">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Received</p>
                        <p className="text-2xl font-black text-green-600">£{myWinners.filter(w => w.status === 'paid').reduce((sum, w) => sum + Number(w.net_amount || 0), 0).toFixed(2)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Cleared to account</p>
                    </div>
                </div>

                {myWinners.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 border border-dashed border-gray-200 rounded-xl">
                        No winnings yet. Publish a draw from admin and match your scores to win.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {myWinners.map(w => (
                            <div key={w.id} className="p-4 border border-gray-100 rounded-xl flex flex-col md:flex-row justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-600 font-bold uppercase tracking-widest flex items-center justify-between">
                                        <span>Draw: {w.draws?.draw_month ? new Date(w.draws.draw_month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                                    </p>
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xs text-gray-400 font-bold uppercase">Total Prize</span>
                                            <span className="text-lg font-black text-gray-900">£{Number(w.prize_amount || 0).toFixed(2)}</span>
                                        </div>
                                        {w.status === 'paid' ? (
                                            <>
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-xs text-green-600 font-bold uppercase">Your Contribution</span>
                                                    <span className="text-sm font-bold text-green-600">-£{Number(w.donation_amount || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-baseline pt-1 border-t border-gray-100">
                                                    <span className="text-xs text-gray-900 font-black uppercase tracking-tight">Net Received</span>
                                                    <span className="text-xl font-black text-indigo-600 tabular-nums">£{Number(w.net_amount || 0).toFixed(2)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex justify-between items-baseline">
                                               <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">Awaiting Validation</span>
                                               <span className="text-xs text-gray-400 font-medium italic">Net estimation: ~£{Number(w.prize_amount * (1 - (profile?.charity_percentage || 10) / 100)).toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${w.status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                            Status: {w.status === 'paid' ? 'Paid to your account' : 'Pending Proof Approval'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="url"
                                        placeholder="Proof image URL"
                                        value={proofInputs[w.id] || ''}
                                        onChange={e => setProofInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                                        className="border border-gray-200 rounded-lg px-3 py-2"
                                    />
                                    <button
                                        onClick={() => submitProof(w.id)}
                                        disabled={!proofInputs[w.id] || w.status === 'paid'}
                                        className="text-xs py-2 px-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
                                    >
                                        Submit Proof
                                    </button>
                                    {w.proof_image_url && (
                                        <a href={w.proof_image_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View uploaded proof</a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Charity Required Modal */}
            {showCharityModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCharityModal(false)}></div>
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative z-[210] shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                             <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                             </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Charity Required</h3>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">Please select a charity in your profile settings before you can submit scores. Your play helps support these causes!</p>
                        <button 
                            onClick={() => { setShowCharityModal(false); setShowModal(true); }} 
                            className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-900 transition-all shadow-lg active:scale-95"
                        >
                            Select Charity Now
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
