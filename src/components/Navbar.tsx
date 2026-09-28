import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle, logout, db } from '../firebase';
import { Drone, User as UserIcon, LogOut, MessageCircle, ShieldAlert, X, Activity, Menu } from 'lucide-react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

export default function Navbar() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [checklistUrl, setChecklistUrl] = useState('https://studio--drone-preflight-checklist.us-central1.hosted.app/');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().checklistUrl) {
        setChecklistUrl(snapshot.data().checklistUrl);
      }
    });

    if (!user) return () => unsubscribeSettings();
    const q = query(
      collection(db, 'meetupRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribeRequests = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => {
      unsubscribeRequests();
      unsubscribeSettings();
    };
  }, [user]);

  const handleRestrictedClick = (e: React.MouseEvent) => {
    if (!user && location.pathname === '/') {
      e.preventDefault();
      setShowRegistrationModal(true);
    }
  };

  return (
    <>
      <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Drone className="h-8 w-8 text-blue-400" />
                <div className="flex flex-col">
                  <span className="font-bold text-xl tracking-tight leading-tight">Global Wingman.org</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider hidden sm:block">Connecting drone pilots everywhere</span>
                </div>
              </Link>
              <div className="hidden md:flex ml-10 space-x-8">
                <Link to="/" className="text-slate-300 hover:text-white transition font-medium">Map</Link>
                <Link to="/regulations" onClick={handleRestrictedClick} className="text-slate-300 hover:text-white transition font-medium">Laws & Regs</Link>
                {user && <Link to="/forum" className="text-slate-300 hover:text-white transition font-medium">Forum</Link>}
                <a href={checklistUrl} onClick={handleRestrictedClick} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition font-medium">Pre-Flight Checklist</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="hidden md:flex items-center space-x-4">
                  {user.email === 'ttohumcu@gmail.com' && (
                    <Link to="/admin" className="flex items-center space-x-1 hover:text-blue-400 transition text-amber-400">
                      <ShieldAlert className="h-5 w-5" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}
                  <Link to="/dashboard" className="flex items-center space-x-1 hover:text-blue-400 transition">
                    <Activity className="h-5 w-5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                  <Link to="/messages" className="relative flex items-center space-x-1 hover:text-blue-400 transition">
                    <MessageCircle className="h-5 w-5" />
                    <span className="hidden sm:inline">Messages</span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/profile" className="flex items-center space-x-1 hover:text-blue-400 transition">
                    <UserIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-slate-300 hover:text-red-400 transition"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex flex-col items-center">
                  <button
                    onClick={signInWithGoogle}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition"
                  >
                    Sign in with Google
                  </button>
                  <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs font-medium text-slate-400 mt-1">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span>Live Global Map Active</span>
                  </div>
                </div>
              )}
              
              {/* Hamburger Button */}
              <button 
                onClick={toggleMobileMenu}
                className="md:hidden p-2 text-slate-300 hover:text-white transition"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-[500px] border-t border-slate-800' : 'max-h-0'}`}>
          <div className="px-4 pt-2 pb-6 space-y-2 bg-slate-900 shadow-xl">
            <Link to="/" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800">Map</Link>
            <Link to="/regulations" onClick={(e) => { handleRestrictedClick(e); closeMobileMenu(); }} className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800">Laws & Regs</Link>
            {user && <Link to="/forum" onClick={closeMobileMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800">Forum</Link>}
            <a href={checklistUrl} onClick={(e) => { handleRestrictedClick(e); closeMobileMenu(); }} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800">Pre-Flight Checklist</a>
            
            <div className="pt-4 mt-4 border-t border-slate-800">
              {user ? (
                <div className="space-y-2">
                  {user.email === 'ttohumcu@gmail.com' && (
                    <Link to="/admin" onClick={closeMobileMenu} className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-amber-400 hover:bg-slate-800">
                      <ShieldAlert className="h-5 w-5" />
                      <span>Admin</span>
                    </Link>
                  )}
                  <Link to="/dashboard" onClick={closeMobileMenu} className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800">
                    <Activity className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>
                  <Link to="/messages" onClick={closeMobileMenu} className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 relative">
                    <MessageCircle className="h-5 w-5" />
                    <span>Messages</span>
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/profile" onClick={closeMobileMenu} className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800">
                    <UserIcon className="h-5 w-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => { handleLogout(); closeMobileMenu(); }}
                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-slate-800"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2">
                  <button
                    onClick={() => { signInWithGoogle(); closeMobileMenu(); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showRegistrationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowRegistrationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Required</h2>
              <p className="text-slate-600 mb-6">
                Please sign in or create an account to access the Laws & Regulations and Pre-Flight Checklist.
              </p>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => {
                    signInWithGoogle();
                    setShowRegistrationModal(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center"
                >
                  <Drone className="w-5 h-5 mr-2" />
                  Sign in with Google
                </button>
                <button 
                  onClick={() => setShowRegistrationModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
