import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

import API from '../utils/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ status }) {
    const map = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-500',
        canceled: 'bg-red-100 text-red-700',
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-700',
        user: 'bg-blue-100 text-blue-700',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${map[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    );
}

function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function TableSkeleton({ cols = 5, rows = 4 }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex gap-4">
                {Array(cols).fill(0).map((_, i) => <Skeleton key={i} className="h-3 w-20" />)}
            </div>
            {Array(rows).fill(0).map((_, i) => (
                <div key={i} className="px-4 py-4 border-b border-gray-50 flex gap-4 items-center">
                    {Array(cols).fill(0).map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}
                </div>
            ))}
        </div>
    );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ token }) {
    const [stats, setStats] = useState(null);
    useEffect(() => {
        fetch(`${API}/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(setStats).catch(console.error);
    }, [token]);

    const cards = stats ? [
        { label: 'Total Users', value: stats.totalUsers ?? 0, color: 'text-gray-900' },
        { label: 'Active Subscribers', value: stats.activeSubscribers ?? 0, color: 'text-green-600' },
        { label: 'Monthly Subs', value: stats.monthlySubscribers ?? 0, color: 'text-indigo-600' },
        { label: 'Monthly Prize Pool', value: `£${stats.totalPrizePool ?? 0}`, sub: '£10 × active subscribers', color: 'text-blue-600' },
        { label: 'Direct Donations', value: `£${(stats.totalDonations ?? 0).toFixed(2)}`, sub: 'Non-game one-time gifts', color: 'text-orange-600' },
        { label: 'Winning Contributed', value: `£${(stats.prizeDonations ?? 0).toFixed(2)}`, sub: 'From user winning impact', color: 'text-pink-600' },
        { label: 'Total Payout', value: `£${(stats.totalPaidOut ?? 0).toFixed(2)}`, sub: 'What we are going to pay users', color: 'text-purple-600' },
        { label: 'Total Charity Impact', value: `£${(stats.totalCharityImpact ?? 0).toFixed(2)}`, sub: 'Pool 10% + Winning + Direct', color: 'text-green-600' },
    ] : [];

    return (
        <div>
            <div className="mb-6"><h2 className="text-2xl font-bold">Reports & Analytics</h2><p className="text-sm text-gray-500 mt-0.5">Live platform statistics.</p></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {!stats ? Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <Skeleton className="h-3 w-24 mb-3" />
                        <Skeleton className="h-10 w-20 mb-2" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                )) : cards.map(c => (
                    <div key={c.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{c.label}</p>
                        <p className={`text-4xl font-black tabular-nums ${c.color}`}>{c.value}</p>
                        {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ token }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [userScores, setUserScores] = useState({});
    const [editing, setEditing] = useState({});

    const loadUsers = useCallback(() => {
        setLoading(true);
        fetch(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setUsers(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const loadScores = async (userId) => {
        if (userScores[userId]) return;
        const res = await fetch(`${API}/admin/users/${userId}/scores`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setUserScores(prev => ({ ...prev, [userId]: Array.isArray(data) ? data : [] }));
    };

    const toggleExpand = (id) => {
        if (expandedId === id) { setExpandedId(null); return; }
        setExpandedId(id);
        loadScores(id);
    };

    const updateUser = async (id, updates) => {
        await fetch(`${API}/admin/users/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updates)
        });
        loadUsers();
        setEditing({});
    };

    const deleteScore = async (userId, scoreId) => {
        await fetch(`${API}/admin/users/${userId}/scores/${scoreId}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        setUserScores(prev => ({ ...prev, [userId]: prev[userId].filter(s => s.id !== scoreId) }));
    };

    if (loading) return (
        <div>
            <div className="mb-6"><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-32" /></div>
            <TableSkeleton cols={5} rows={5} />
        </div>
    );

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-sm text-gray-500 mt-0.5">{users.length} regular users (admins excluded)</p>
            </div>
            {users.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center text-gray-400">No users yet.</div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Name', 'Email', 'Subscription', 'Scores', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map(u => (
                                <React.Fragment key={u.id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {editing[u.id] ? (
                                                <div className="flex gap-1">
                                                    <input defaultValue={u.first_name} id={`fn-${u.id}`} className="border rounded-lg px-2 py-1 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-black" />
                                                    <input defaultValue={u.last_name} id={`ln-${u.id}`} className="border rounded-lg px-2 py-1 w-24 text-xs focus:outline-none focus:ring-1 focus:ring-black" />
                                                </div>
                                            ) : (
                                                <span>{u.first_name || '—'} {u.last_name || ''}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {u.email || <span className="italic text-gray-300">No email</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={u.subscription_status}
                                                onChange={e => updateUser(u.id, { subscription_status: e.target.value })}
                                                className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                                            >
                                                <option value="inactive">Inactive</option>
                                                <option value="active">Active</option>
                                                <option value="canceled">Canceled</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                                            {u.scores?.[0]?.count ?? 0} / 5
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 items-center">
                                                {editing[u.id] ? (
                                                    <>
                                                        <button onClick={() => updateUser(u.id, { first_name: document.getElementById(`fn-${u.id}`)?.value, last_name: document.getElementById(`ln-${u.id}`)?.value })}
                                                            className="text-xs bg-black text-white px-2.5 py-1 rounded-lg font-bold">Save</button>
                                                        <button onClick={() => setEditing({})} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setEditing({ [u.id]: true })} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                                                )}
                                                <button onClick={() => toggleExpand(u.id)} className="text-xs text-gray-400 hover:text-black border border-gray-200 px-2.5 py-1 rounded-lg transition-colors">
                                                    {expandedId === u.id ? '▲' : '▼'} Scores
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === u.id && (
                                        <tr key={`${u.id}-exp`}>
                                            <td colSpan={5} className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Golf Scores</p>
                                                {!userScores[u.id] ? (
                                                    <div className="flex gap-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-24" />)}</div>
                                                ) : (userScores[u.id] || []).length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic">No scores recorded.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {(userScores[u.id] || []).map(s => (
                                                            <div key={s.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm shadow-sm">
                                                        </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function Countdown({ targetDate }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const target = new Date(targetDate);
            const diff = target - now;

            if (diff <= 0) {
                clearInterval(timer);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / 1000 / 60) % 60),
                    seconds: Math.floor((diff / 1000) % 60)
                });
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="flex gap-4">
            {[ ['Days', timeLeft.days], ['Hrs', timeLeft.hours], ['Min', timeLeft.minutes], ['Sec', timeLeft.seconds] ].map(([label, val]) => (
                <div key={label} className="text-center">
                    <div className="bg-gray-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
                        {String(val).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{label}</div>
                </div>
            ))}
        </div>
    );
}

// ─── Draw Tab ─────────────────────────────────────────────────────────────────

function DrawTab({ token }) {
    const [drawType, setDrawType] = useState('random');
    const [simulation, setSimulation] = useState(null);
    const [simLoading, setSimLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [publishResult, setPublishResult] = useState(null);
    const [drawStatus, setDrawStatus] = useState({ isLocked: false, month: '', drawDetails: null });
    const [statusLoading, setStatusLoading] = useState(true);
    const [nextDrawDate, setNextDrawDate] = useState(null);

    useEffect(() => {
        fetchDrawStatus();
        fetchStats();
    }, [token]);

    const fetchDrawStatus = async () => {
        setStatusLoading(true);
        try {
            const res = await fetch(`${API}/draws/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setDrawStatus(data);
        } catch (e) { console.error(e); }
        finally { setStatusLoading(false); }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API}/draws/stats`);
            const data = await res.json();
            setNextDrawDate(data.nextDrawDate);
        } catch (e) { console.error(e); }
    };

    const runSimulation = async () => {
        if (drawStatus.isLocked) return;
        setSimLoading(true);
        setSimulation(null);
        setPublishResult(null);
        try {
            const res = await fetch(`${API}/draws/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ type: drawType })
            });
            setSimulation(await res.json());
        } catch (e) { console.error(e); }
        finally { setSimLoading(false); }
    };

    const publishDraw = async () => {
        if (!simulation || drawStatus.isLocked) return;
        setPublishLoading(true);
        try {
            const res = await fetch(`${API}/draws/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ winning_numbers: simulation.winning_numbers, draw_type: drawType })
            });
            
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to publish draw');
                return;
            }
            
            setPublishResult(data);
            setSimulation(null);
            fetchDrawStatus(); 
        } catch (e) { 
            console.error(e);
            alert('A network error occurred while publishing the draw.');
        }
        finally { setPublishLoading(false); }
    };

    return (
        <div>
            {/* Header with Timer */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
                <div className="relative z-10 text-center md:text-left">
                    <h2 className="text-3xl font-black tracking-tighter text-gray-900 leading-tight">
                        {drawStatus.isLocked ? 'Monthly Draw Finalized' : 'Draw Preparation'}
                    </h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {drawStatus.isLocked ? `Official Results for ${drawStatus.month}` : 'Simulate & Publish Results'}
                    </p>
                </div>
                
                <div className="relative z-10">
                    {drawStatus.isLocked && nextDrawDate && (
                        <>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 text-center md:text-right">Next Monthly Deadline</p>
                            <Countdown targetDate={nextDrawDate} />
                        </>
                    )}
                    {!drawStatus.isLocked && (
                        <div className="flex flex-col items-center md:items-end justify-center">
                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                                <span className="text-sm font-bold tracking-tight">User Submissions Active</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Decorative background element */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-gray-50 rounded-full blur-3xl opacity-50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Controls */}
                <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 transition-all duration-500 ${drawStatus.isLocked ? 'grayscale opacity-60' : ''}`}>
                    <div className="flex items-center justify-between mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Step 1 — Strategy</p>
                        {drawStatus.isLocked && <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-green-200">Draw Completed ✓</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {['random', 'algorithmic'].map(t => (
                            <button key={t}
                                onClick={() => !drawStatus.isLocked && setDrawType(t)}
                                className={`py-6 rounded-3xl text-sm font-black capitalize transition-all border-2 ${drawType === t
                                    ? 'bg-black text-white border-black shadow-xl shadow-black/20'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-black'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{t === 'random' ? '🎲' : '⚙️'}</div>
                                {t}
                            </button>
                        ))}
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Step 2 — Trigger</p>
                    <button
                        onClick={runSimulation}
                        disabled={simLoading || drawStatus.isLocked || statusLoading}
                        className="w-full py-5 rounded-[1.5rem] font-black text-sm transition-all relative overflow-hidden bg-black text-white hover:bg-gray-800 active:scale-[0.98] disabled:bg-gray-200 disabled:cursor-not-allowed shadow-xl shadow-black/20"
                    >
                        {statusLoading ? 'Validating...' : simLoading ? 'Calculating Odds...' : drawStatus.isLocked ? 'Month Completed' : 'Simulate Match Results →'}
                    </button>
                </div>

                {/* Results Panel */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col min-h-[400px]">
                    {!simulation && !publishResult && !drawStatus.isLocked && !simLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-300">
                            <div className="text-6xl mb-4 bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">🎯</div>
                            <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Awaiting Execution</p>
                            <p className="text-[10px] text-gray-400 mt-2 max-w-[200px]">Run a strategy simulation to see potential winners for this month.</p>
                        </div>
                    )}

                    {simLoading && (
                        <div className="flex-1 flex flex-col gap-6 justify-center">
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-32 mx-auto" />
                                <div className="flex justify-center gap-3">
                                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="w-12 h-12 rounded-full" />)}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-[1.5rem]" />)}
                            </div>
                            <Skeleton className="h-14 w-full rounded-2xl mt-4" />
                        </div>
                    )}

                    {(drawStatus.isLocked || simulation || publishResult) && !simLoading && (
                        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Official Numbers</p>
                                    <p className="text-xs font-black text-indigo-600 capitalize">
                                        {drawStatus.isLocked ? 'Finalized Results' : `${drawType} Strategy`}
                                    </p>
                                </div>
                                {drawStatus.isLocked && (
                                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">Official</div>
                                )}
                            </div>

                            <div className="flex gap-3 mb-8">
                                {(drawStatus.isLocked ? (drawStatus.drawDetails?.winning_numbers || []) : (simulation || publishResult)?.winning_numbers || []).map((n, i) => (
                                    <div key={i} className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-lg shadow-xl hover:scale-110 transition-transform cursor-default">
                                        {n}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-8">
                                {[
                                    ['5 MATCHES', (drawStatus.isLocked ? drawStatus.drawDetails?.winning_stats?.matchCounts?.[5] : (simulation || publishResult)?.match5) ?? 0, 'text-yellow-600'],
                                    ['4 MATCHES', (drawStatus.isLocked ? drawStatus.drawDetails?.winning_stats?.matchCounts?.[4] : (simulation || publishResult)?.match4) ?? 0, 'text-orange-500'],
                                    ['3 MATCHES', (drawStatus.isLocked ? drawStatus.drawDetails?.winning_stats?.matchCounts?.[3] : (simulation || publishResult)?.match3) ?? 0, 'text-blue-500']
                                ].map(([label, val, color]) => (
                                    <div key={label} className="bg-gray-50 rounded-[1.5rem] p-5 text-center border border-gray-100 flex flex-col justify-center">
                                        <div className={`text-3xl font-black ${color} tracking-tighter`}>{val}</div>
                                        <div className="text-[9px] text-gray-400 mt-2 font-black uppercase tracking-widest leading-none">{label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto">
                                {drawStatus.isLocked ? (
                                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payout Pool</span>
                                            <span className="text-sm font-black text-gray-900">£{drawStatus.drawDetails?.total_pool?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Status</span>
                                            <span className="text-xs font-black text-green-700">✓ Completed</span>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={publishDraw}
                                        disabled={publishLoading || drawStatus.isLocked || statusLoading}
                                        className="w-full py-5 rounded-[1.5rem] font-black text-sm bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] transition-all shadow-xl shadow-green-600/20 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    >
                                        {statusLoading ? 'Checking Lock...' : publishLoading ? 'Finalizing Draw...' : '✓ Publish Official Draw'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {publishResult && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="font-black text-gray-900 text-2xl tracking-tight">Draw Published Successfully!</h3>
                            <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                                The monthly results have been finalized. <strong>{publishResult.winnersGenerated} winners</strong> have been notified in their dashboards.
                            </p>
                            <div className="text-left text-xs text-gray-500 mt-3 space-y-1">
                                <p>5-match: {publishResult.matchCounts?.[5] || 0}</p>
                                <p>4-match: {publishResult.matchCounts?.[4] || 0}</p>
                                <p>3-match: {publishResult.matchCounts?.[3] || 0}</p>
                                <p>Jackpot rollover added: £{publishResult.rolloverAmount?.toFixed(2) || '0.00'}</p>
                                <p>5-match pool: £{publishResult.tierPools?.['5']?.toFixed(2) || '0.00'}</p>
                                <p>4-match pool: £{publishResult.tierPools?.['4']?.toFixed(2) || '0.00'}</p>
                                <p>3-match pool: £{publishResult.tierPools?.['3']?.toFixed(2) || '0.00'}</p>
                            </div>
                            <button onClick={() => setPublishResult(null)} className="mt-6 text-xs text-gray-400 hover:text-black underline transition-colors">Run another draw</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Charities Tab ────────────────────────────────────────────────────────────

function CharitiesTab({ token }) {
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', description: '', image_url: '', is_featured: false, category: 'General', upcoming_events: [] });
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`${API}/charities`)
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setCharities(d); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        const url = editId ? `${API}/charities/${editId}` : `${API}/charities`;
        await fetch(url, {
            method: editId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(form)
        });
        setForm({ name: '', description: '', image_url: '', is_featured: false, category: 'General', upcoming_events: [] });
        setEditId(null);
        setShowForm(false);
        load();
    };

    const startEdit = (c) => {
        setForm({ 
            name: c.name, 
            description: c.description || '', 
            image_url: c.image_url || '', 
            is_featured: c.is_featured,
            category: c.category || 'General',
            upcoming_events: c.upcoming_events || []
        });
        setEditId(c.id);
        setShowForm(true);
    };

    const del = async (id) => {
        if (!confirm('Delete this charity?')) return;
        await fetch(`${API}/charities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        load();
    };

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Charity Management</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{charities.length} charities registered</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '', image_url: '', is_featured: false }); }}
                    className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition active:scale-95 shadow-sm">
                    {showForm ? 'Cancel' : '+ Add Charity'}
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <p className="font-bold text-sm mb-4 text-gray-700">{editId ? 'Edit Charity' : 'New Charity'}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Charity name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className="border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                            className="border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition">
                            {['General', 'Medical', 'Nature', 'Youth', 'Education', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                            className="border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                         <input placeholder='Upcoming Event (e.g. "Golf Day,2024-12-01")' 
                            onChange={e => {
                                const [name, date] = e.target.value.split(',');
                                if (name && date) setForm({ ...form, upcoming_events: [{ name, date }] });
                            }}
                            className="border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition" />
                        <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                            className="border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black transition md:col-span-2 resize-none" rows={2} />
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="w-4 h-4 accent-black" />
                            Featured charity
                        </label>
                    </div>
                    <button onClick={save} disabled={!form.name}
                        className="mt-4 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:bg-gray-300 active:scale-95">
                        {editId ? 'Save Changes' : 'Create Charity'}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-4">
                            <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                            <div className="flex-1"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-full" /></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {charities.map(c => (
                        <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex gap-4 items-start">
                            {c.image_url ? (
                                <img src={c.image_url} alt={c.name} className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-100"
                                    onError={e => { e.target.onerror = null; e.target.src = `https://placehold.co/56x56/f3f4f6/9ca3af?text=${c.name[0]}`; }} />
                            ) : (
                                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-black text-gray-300 shrink-0">{c.name[0]}</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-bold text-gray-900 truncate">{c.name}</p>
                                    {c.is_featured && <span className="text-[10px] bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full uppercase shrink-0">Featured</span>}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{c.description || 'No description'}</p>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                                <button onClick={() => startEdit(c)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                                <button onClick={() => del(c.id)} className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Winners Tab ──────────────────────────────────────────────────────────────

function WinnersTab({ token }) {
    const [winners, setWinners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProof, setSelectedProof] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`${API}/admin/winners`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setWinners(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (id, status) => {
        setProcessingId(id);
        try {
            const res = await fetch(`${API}/admin/winners/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Update failed');
            load();
        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return (
        <div>
            <div className="mb-6"><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-40" /></div>
            <TableSkeleton cols={6} rows={4} />
        </div>
    );

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Winners Management</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review, approve, reject and track payouts.</p>
            </div>
            {winners.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-24 text-center">
                    <div className="text-5xl mb-4">🏆</div>
                    <p className="font-bold text-gray-400">No winners yet.</p>
                    <p className="text-sm text-gray-300 mt-1">Publish a draw to generate winners automatically.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Winner', 'Draw Month', 'Numbers', 'Match', 'Prize', 'Status', 'Proof', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {winners.map(w => (
                                <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{w.profiles?.first_name || '—'} {w.profiles?.last_name || ''}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {w.draws?.draw_month ? new Date(w.draws.draw_month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1" title={w.played_numbers ? "Player's Hand" : "Draw Reference (Legacy)"}>
                                            {(w.played_numbers || w.draws?.winning_numbers || []).map((n, idx) => {
                                                const isMatch = w.played_numbers ? (w.draws?.winning_numbers || []).includes(n) : false;
                                                const isLegacy = !w.played_numbers;
                                                return (
                                                    <span key={idx} className={`w-6 h-6 rounded-lg text-[10px] flex items-center justify-center font-black shadow-sm border ${
                                                        isMatch ? 'bg-green-600 text-white border-green-700' : 
                                                        isLegacy ? 'bg-gray-50 text-gray-300 border-gray-100 italic' :
                                                        'bg-gray-100 text-gray-400 border-gray-200'
                                                    }`}>
                                                        {n}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-black text-gray-900">{w.match_tier}</span>
                                        <span className="text-gray-400 text-xs ml-1">match{w.match_tier !== 1 ? 'es' : ''}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900">£{Number(w.prize_amount).toFixed(2)}</span>
                                            {w.donation_amount > 0 && (
                                                <span className="text-[10px] text-green-600 font-bold">-£{Number(w.donation_amount).toFixed(2)} Charity</span>
                                            )}
                                            {w.status === 'paid' && (
                                                <span className="text-[10px] text-gray-400 font-medium italic">Net: £{Number(w.net_amount).toFixed(2)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><Badge status={w.status} /></td>
                                    <td className="px-4 py-3">
                                        {w.proof_image_url ? (
                                            <button onClick={() => setSelectedProof(w.proof_image_url)} className="text-indigo-600 hover:underline font-bold text-xs">View Proof</button>
                                        ) : (
                                            <span className="text-gray-300 italic text-xs">No proof</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {w.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => updateStatus(w.id, 'paid')} 
                                                        disabled={processingId === w.id}
                                                        className="text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg font-bold hover:bg-green-700 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {processingId === w.id ? '...' : 'Mark Paid'}
                                                    </button>
                                                    <button 
                                                        onClick={() => updateStatus(w.id, 'rejected')} 
                                                        disabled={processingId === w.id}
                                                        className="text-xs bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-100 transition active:scale-95 disabled:opacity-50"
                                                    >
                                                        {processingId === w.id ? '...' : 'Reject'}
                                                    </button>
                                                </>
                                            )}
                                            {w.status !== 'pending' && (
                                                <button onClick={() => updateStatus(w.id, 'pending')} className="text-xs text-gray-400 hover:text-black underline">Reset</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Proof Modal */}
            {selectedProof && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProof(null)}>
                    <div className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                         <button onClick={() => setSelectedProof(null)} className="absolute top-4 right-4 bg-white/50 backdrop-blur px-3 py-1 rounded-lg text-sm font-bold z-10">✕ Close</button>
                         <img src={selectedProof} alt="Score Proof" className="w-full h-auto rounded-xl max-h-[80vh] object-contain" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'analytics', label: '📊 Reports' },
    { id: 'users', label: '👥 Users' },
    { id: 'draw', label: '🎯 Draw' },
    { id: 'charities', label: '♥ Charities' },
    { id: 'winners', label: '🏆 Winners' },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('analytics');
    const [session, setSession] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/auth');
            else setSession(session);
        });
    }, [navigate]);

    if (!session) return null;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Admin HQ</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage users, draws, charities, and payouts.</p>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl mb-8 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'analytics' && <AnalyticsTab token={session.access_token} />}
            {activeTab === 'users' && <UsersTab token={session.access_token} />}
            {activeTab === 'draw' && <DrawTab token={session.access_token} />}
            {activeTab === 'charities' && <CharitiesTab token={session.access_token} />}
            {activeTab === 'winners' && <WinnersTab token={session.access_token} />}
        </div>
    );
}
