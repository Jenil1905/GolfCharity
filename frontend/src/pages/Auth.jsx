import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    const passRules = {
        length: password.length >= 8,
        capital: /[A-Z]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    const isPassValid = passRules.length && passRules.capital && passRules.special;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard', { replace: true });
        });
    }, [navigate]);

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!isLogin && !isPassValid) return; // Prevent weak passwords on signup
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName
                        }
                    }
                });
                if (error) throw error;
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh] bg-[#fbfbfb]">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
                <h2 className="text-3xl font-extrabold text-center mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

                <form className="space-y-4" onSubmit={handleAuth}>
                    {!isLogin && (
                        <div className="flex gap-4">
                            <input
                                type="text" placeholder="First Name"
                                className="w-1/2 border px-4 py-3 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                required
                                value={firstName} onChange={e => setFirstName(e.target.value)}
                            />
                            <input
                                type="text" placeholder="Last Name"
                                className="w-1/2 border px-4 py-3 rounded-lg focus:ring-2 focus:ring-black outline-none"
                                required
                                value={lastName} onChange={e => setLastName(e.target.value)}
                            />
                        </div>
                    )}

                    <input
                        type="email" placeholder="Email address"
                        className="w-full border px-4 py-3 rounded-lg focus:ring-2 focus:ring-black outline-none"
                        required
                        autoComplete="email"
                        value={email} onChange={e => setEmail(e.target.value)}
                    />
                    <div className="space-y-2">
                        <input
                            type="password" placeholder="Password"
                            className="w-full border px-4 py-3 rounded-lg focus:ring-2 focus:ring-black outline-none"
                            required
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                        
                        {!isLogin && password.length > 0 && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Password Requirements</p>
                                {[
                                    { label: '8+ Characters', met: passRules.length },
                                    { label: 'One Capital Letter', met: passRules.capital },
                                    { label: 'One Special Character', met: passRules.special },
                                ].map(rule => (
                                    <div key={rule.label} className="flex items-center gap-2">
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-colors ${rule.met ? 'bg-green-500 border-green-600' : 'bg-white border-gray-200'}`}>
                                            {rule.met && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`text-[11px] font-bold ${rule.met ? 'text-green-700' : 'text-gray-400'}`}>{rule.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (!isLogin && !isPassValid)}
                        className="w-full bg-black text-white font-bold py-3 rounded-lg mt-4 hover:bg-gray-800 transition shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                    </button>
                </form>

                <div className="text-center mt-6 text-sm text-gray-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => { setIsLogin(!isLogin); setPassword(''); setError(null); }} className="font-bold text-black border-b border-black">
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
