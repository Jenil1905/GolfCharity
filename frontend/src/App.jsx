import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Charities from './pages/Charities';
import Auth from './pages/Auth';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';

function Navbar() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center">
      <div className="font-bold text-xl tracking-tighter cursor-pointer flex items-center gap-2">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-xs italic font-black">GP</div>
        <Link to="/">GOLFPULSE</Link>
      </div>
      <div className="space-x-4 text-sm font-medium">
        <Link to="/charities" className="text-gray-600 hover:text-black transition">Impact</Link>
        {!session ? (
          <Link to="/auth" className="text-gray-600 hover:text-black transition">Sign In</Link>
        ) : (
          <Link to="/dashboard" className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition shadow-sm active:scale-95">Portal</Link>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans bg-[#fbfbfb] text-gray-900 flex flex-col">
        <Navbar />
        <main className="flex-grow pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/charities" element={<Charities />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
