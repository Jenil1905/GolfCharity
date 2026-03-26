import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import API from './utils/api';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Charities from './pages/Charities';
import Auth from './pages/Auth';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';

function ProfileModal({ isOpen, onClose, profile, onUpdate }) {
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFirstName(profile?.first_name || '');
      setLastName(profile?.last_name || '');
      setPhone(profile?.phone || '');
      supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email || ''));
    }
  }, [isOpen, profile]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Update DB Profile
      const res = await fetch(`${API}/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, phone })
      });
      if (!res.ok) throw new Error('Failed to update profile data');

      // Update Auth Email if changed
      const { data: { user } } = await supabase.auth.getUser();
      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
        setMessage({ type: 'success', text: 'Profile updated. Please check your new email for verification.' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }

      onUpdate();
      setTimeout(onClose, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-black transition">✕</button>
        <h2 className="text-3xl font-black tracking-tighter mb-2">Profile Settings</h2>
        <p className="text-gray-500 text-sm mb-8">Manage your personal information and contact details.</p>

        {message && (
          <div className={`p-4 rounded-2xl mb-6 font-bold text-xs ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">First Name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 mt-1 font-bold outline-none focus:ring-2 focus:ring-black transition" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 mt-1 font-bold outline-none focus:ring-2 focus:ring-black transition" required />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 mt-1 font-bold outline-none focus:ring-2 focus:ring-black transition" required />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 ..." className="w-full bg-gray-50 border-0 rounded-2xl py-3 px-4 mt-1 font-bold outline-none focus:ring-2 focus:ring-black transition" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-black text-white rounded-2xl py-4 font-black transition-all hover:bg-gray-800 disabled:bg-gray-200 mt-4 shadow-xl active:scale-[0.98]">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LogoutModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">Logout?</h3>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">Are you sure you want to end your session on GolfPulse?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-95">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95">Log Out</button>
        </div>
      </div>
    </div>
  );
}

function Navbar() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.access_token);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.access_token);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch(`${API}/admin/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404 || res.status === 401) return handleLogout();
      const data = await res.json();
      if (data.error) return handleLogout();
      setProfile(data);
    } catch (e) { 
      console.error(e);
      handleLogout();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowLogoutModal(false);
    setShowDropdown(false);
    setProfile(null);
    navigate('/');
  };

  return (
    <>
      <nav className="fixed w-full z-[100] bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center px-4 md:px-12">
        <div className="font-bold text-xl tracking-tighter cursor-pointer flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-xs italic font-black text-center pr-0.5">GP</div>
          <Link to="/" className="hidden sm:block">GOLFPULSE</Link>
        </div>
        
        <div className="flex items-center gap-6">
          <Link to="/charities" className="text-gray-500 hover:text-black transition text-xs font-black uppercase tracking-widest">Charities</Link>
          
          {!session ? (
            <Link to="/auth" className="text-black transition text-xs font-black uppercase tracking-widest border-b-2 border-black">Sign In</Link>
          ) : (
            <>
              {location.pathname === '/' ? (
                <Link 
                  to={profile?.role === 'admin' ? '/admin' : '/dashboard'} 
                  className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="relative">
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg hover:scale-105 transition-all outline-none"
                  >
                    {profile?.first_name?.[0] || 'U'}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-3 border-b border-gray-50 mb-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                        <p className="text-xs font-black truncate">{profile?.first_name} {profile?.last_name}</p>
                      </div>
                      <button onClick={() => { setShowModal(true); setShowDropdown(false); }} className="w-full text-left px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition">Settings</button>
                      <div className="h-px bg-gray-50 my-2"></div>
                      <button onClick={() => { setShowLogoutModal(true); setShowDropdown(false); }} className="w-full text-left px-5 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition">Log Out</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      <ProfileModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        profile={profile} 
        onUpdate={() => session && fetchProfile(session.access_token)} 
      />

      <LogoutModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={handleLogout} 
      />
    </>
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
