import API from '../utils/api';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function AdminRoute({ children }) {
    const [isAdmin, setIsAdmin] = useState(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setIsAdmin(false);
                return;
            }

            try {
                // Use backend endpoint with service key — not affected by RLS
                const res = await fetch(`${API}/admin/check-role`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });

                if (res.ok) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch {
                setIsAdmin(false);
            }
        };

        checkAdmin();
    }, []);

    if (isAdmin === null) return <div className="p-12 text-center">Verifying access...</div>;
    if (isAdmin === false) return <Navigate to="/dashboard" replace />;

    return children;
}
