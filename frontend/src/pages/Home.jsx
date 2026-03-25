import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Home() {
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    }, []);

    return (
        <div className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#fafafa]">

            {/* Abstracted Background shapes instead of literal golf images */}
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
                        Play with <br className="hidden md:block" /> Purpose.
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
    );
}
