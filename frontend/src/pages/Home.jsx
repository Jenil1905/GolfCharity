import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import API from '../utils/api';

export default function Home() {
    const [session, setSession] = useState(null);
    const [winners, setWinners] = useState([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        fetch(`${API}/draws/hall-of-fame`).then(r => r.json()).then(d => { if (Array.isArray(d)) setWinners(d); });
    }, []);

    return (
        <div className="relative w-full overflow-hidden bg-[#fafafa]">
            
            {/* Hero Section */}
            <div className="relative min-h-[90vh] flex items-center justify-center">
                {/* Abstracted Background shapes */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-charity-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-black text-white text-xs font-semibold tracking-widest mb-6 border border-white/20">
                            A NEW WAY TO GIVE
                        </span>
                        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.9] text-gray-900 mb-6 drop-shadow-sm">
                            GolfPulse. <br className="hidden md:block" /> Play with Purpose.
                        </h1>
                        <p className="text-lg md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                            Record your scores. Enter the monthly draw. Support the causes you care about most with every round.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to={session ? "/dashboard" : "/auth"}
                                className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-full font-medium text-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl hover:-translate-y-1 inline-block active:scale-95"
                            >
                                {session ? "Go to Dashboard" : "Join the Movement"}
                            </Link>
                            <Link to="/charities" className="w-full sm:w-auto px-8 py-4 bg-white text-black border border-gray-200 rounded-full font-medium text-lg hover:bg-gray-50 transition shadow-sm hover:shadow-md inline-block active:scale-95">
                                Explore Charities
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Hall of Fame / Recent Legends Section */}
            {winners.length > 0 && (
                <div className="bg-white py-24 border-y border-gray-100">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Recent Legends</h2>
                            <p className="text-gray-500 mt-2">Real players. Real prizes. Real impact.</p>
                        </div>

                        <div className="relative">
                            <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide px-4">
                                {winners.map((w, i) => (
                                    <div key={i} className="min-w-[280px] bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center text-white text-xl font-black mb-4">
                                            {w.profiles?.first_name?.[0] || 'G'}
                                        </div>
                                        <p className="font-bold text-gray-900">{w.profiles?.first_name} {w.profiles?.last_name?.[0]}.</p>
                                        <div className="mt-2 text-2xl font-black text-green-600">£{Number(w.prize_amount).toLocaleString()}</div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            {w.draws?.draw_month ? new Date(w.draws.draw_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ''}
                                        </p>
                                        <div className="mt-4 px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 uppercase">
                                            {w.match_tier} Matches
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="absolute right-0 top-0 bottom-8 w-32 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* CTA Section */}
            <div className="py-24 bg-[#fafafa]">
                 <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black mb-6">Ready to change the game?</h2>
                    <p className="text-gray-500 mb-10">Join thousands of golfers contributing to global causes while competing for monthly prizes.</p>
                    <Link to="/auth" className="inline-block px-10 py-5 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition shadow-xl active:scale-95">
                        Start Playing Today
                    </Link>
                 </div>
            </div>
        </div>
    );
}
