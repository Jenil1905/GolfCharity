import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function ProtectedRoute({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) return <div className="p-12 text-center">Loading...</div>;
    if (!session) return <Navigate to="/auth" replace />;

    return children;
}
