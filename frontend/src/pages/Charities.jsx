import API from '../utils/api';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const CATEGORIES = ['All', 'Medical', 'Nature', 'Youth', 'Education', 'Other'];

function DonationModal({ charity, isOpen, onClose }) {
    const [amount, setAmount] = useState('10');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleDonate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${API}/donations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    charity_id: charity.id, 
                    amount: Number(amount),
                    userId: session?.user?.id || null 
                })
            });
            setSuccess(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors">✕</button>
                
                {!success ? (
                    <>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Support {charity.name}</h3>
                        <p className="text-gray-500 mb-6 text-sm">One-time gift. 100% goes directly to the cause.</p>
                        
                        <form onSubmit={handleDonate} className="space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                {['10', '25', '50'].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setAmount(val)}
                                        className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${amount === val ? 'bg-black text-white border-black' : 'hover:border-gray-300 border-gray-100'}`}
                                    >
                                        £{val}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">£</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Other amount"
                                    className="w-full bg-gray-50 border-0 rounded-2xl py-4 pl-8 pr-4 font-bold outline-none focus:ring-2 focus:ring-black transition-all"
                                    required
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white rounded-2xl py-4 font-black transition-all hover:bg-gray-800 disabled:bg-gray-200 active:scale-[0.98]"
                            >
                                {loading ? 'Processing...' : `Donate £${amount} Now`}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">✓</div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Thank You!</h3>
                        <p className="text-gray-500 text-sm mb-8">Your donation of £{amount} has been processed successfully. You're a hero.</p>
                        <button onClick={onClose} className="w-full py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors">Close</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Charities() {
    const [charities, setCharities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedCharity, setSelectedCharity] = useState(null);

    const fetchCharities = useCallback(() => {
        setLoading(true);
        const query = new URLSearchParams();
        if (searchTerm) query.append('search', searchTerm);
        if (activeCategory !== 'All') query.append('category', activeCategory);

        fetch(`${API}/charities?${query.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCharities(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [searchTerm, activeCategory]);

    useEffect(() => {
        const timer = setTimeout(() => fetchCharities(), 300);
        return () => clearTimeout(timer);
    }, [fetchCharities]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-16">
            <DonationModal 
                isOpen={!!selectedCharity} 
                charity={selectedCharity} 
                onClose={() => setSelectedCharity(null)} 
            />

            <div className="text-center mb-16 max-w-3xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 text-gray-900 leading-tight">Where Every Swing <br/><span className="text-indigo-600">Makes an Impact.</span></h1>
                <p className="text-lg text-gray-500 font-medium">10% of your subscription goes directly to your cause. No overhead, no hidden fees—just pure impact.</p>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
                <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all border-2 whitespace-nowrap ${activeCategory === cat ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="Search charities..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 font-bold text-sm outline-none focus:ring-2 focus:ring-black transition-all shadow-sm"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                </div>
            </div>

            {loading && charities.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1,2,3].map(i => <div key={i} className="h-[450px] bg-gray-100 animate-pulse rounded-3xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {charities.map((c, i) => (
                        <div key={c.id || i} className="bg-white group rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col scale-[0.99] hover:scale-[1]">
                            <div className="h-56 overflow-hidden relative bg-gray-50">
                                {c.image_url ? (
                                    <img
                                        src={c.image_url}
                                        alt={c.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                        onError={(e) => { e.target.src = `https://placehold.co/400x250/f9fafb/94a3b8?text=${encodeURIComponent(c.name)}`; }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 font-black text-4xl">
                                        {c.name.charAt(0)}
                                    </div>
                                )}
                                <div className="absolute top-6 left-6">
                                    <span className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-900 border border-gray-100 shadow-sm">{c.category || 'General'}</span>
                                </div>
                            </div>
                            
                            <div className="p-8 flex-grow flex flex-col">
                                <h3 className="text-2xl font-black mb-3 text-gray-900 tracking-tight">{c.name}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-grow">{c.description}</p>
                                
                                {c.upcoming_events?.length > 0 && (
                                    <div className="mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Upcoming Event</p>
                                        <p className="text-xs font-bold text-gray-900">⛳️ {c.upcoming_events[0].name}</p>
                                        <p className="text-[10px] text-indigo-400 mt-0.5">{new Date(c.upcoming_events[0].date).toLocaleDateString()}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Link to="/auth" className="flex-1 py-4 rounded-2xl bg-black text-white font-black text-sm hover:bg-gray-800 transition-all text-center shadow-lg shadow-black/10 active:scale-95">
                                        Subscribe
                                    </Link>
                                    <button 
                                        onClick={() => setSelectedCharity(c)}
                                        className="px-6 py-4 rounded-2xl border-2 border-gray-100 text-gray-900 font-black text-sm hover:border-black hover:bg-gray-50 transition-all active:scale-95"
                                    >
                                        Donate
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && charities.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 mt-8">
                    <p className="text-gray-400 font-bold">No charities found matching your search.</p>
                </div>
            )}
        </div>
    );
}
