import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';

import { User, LogOut, Shield, Info, ExternalLink, ChevronRight, Save, Share2, Sun, Moon } from 'lucide-react';
import './../App.css';

const Settings: React.FC = () => {
  const { user, profile: userProfile, logout } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState({ fullName: '', phone: '' });
  const [rank, setRank] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (userProfile) {
      setProfile({ fullName: userProfile.fullName || '', phone: userProfile.phone || '' });
      setRank(userProfile.rank || '');
      setLogoUrl(userProfile.logoUrl || '');
    }
  }, [userProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        fullName: profile.fullName,
        phone: profile.phone,
        updatedAt: serverTimestamp()
      });
      showToast("Profile updated ✅", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRank = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        rank,
        logoUrl,
        updatedAt: serverTimestamp()
      });
      showToast("Rank & Branding updated ✅", "success");
    } catch (err) {
      console.error(err);
      showToast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    const referralCode = userProfile?.referralCode || '';
    try {
      await navigator.clipboard.writeText(referralCode);
      showToast("Referral code copied!", "success");
    } catch (err) {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = referralCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast("Referral code copied!", "success");
    }
  };

  const shareReferralCode = () => {
    const referralCode = userProfile?.referralCode || '';
    const msg = encodeURIComponent(
      `Join me on TRAKZY AI! \nUse my referral code: ${referralCode}\nTrack. Grow. Lead. 🚀`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="dashboard-container">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* User Profile */}
          <div className="glass-card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                {userProfile?.logoUrl ? <img src={userProfile.logoUrl} className="w-full h-full rounded-full object-cover" /> : userProfile?.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{userProfile?.fullName}</h2>
                <p className="text-gray-400 text-sm">{userProfile?.phone}</p>
                <div className="mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded text-[10px] font-bold uppercase w-fit">{userProfile?.rank}</div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="input-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={profile.fullName} 
                  onChange={(e) => setProfile({...profile, fullName: e.target.value})} 
                />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={profile.phone} 
                  onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                />
              </div>
              <button type="submit" className="btn btn-primary">Update Profile</button>
            </form>
          </div>

          {/* Theme Toggle */}
          <div className="glass-card">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-orange-400" />}
                <div>
                  <h3 className="font-bold text-sm">Appearance</h3>
                  <p className="text-[10px] text-gray-500">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'} Enabled</p>
                </div>
              </div>
              <button 
                onClick={toggleTheme}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>

          {/* Business Details */}
          <div className="glass-card space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Shield size={18} className="text-blue-500" /> Rank & Brand
            </h3>
            <div className="input-group">
              <label>Current Rank</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1"
                  value={rank} 
                  onChange={(e) => setRank(e.target.value)} 
                />
                <button onClick={handleUpdateRank} className="btn btn-primary w-auto whitespace-nowrap">Save</button>
              </div>
            </div>
            <div className="input-group">
              <label>Logo URL (Direct Link)</label>
              <input 
                type="text" 
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Referral Code */}
          <div className="glass-card">
            <h3 className="font-bold mb-2">My Referral Code</h3>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
              <span className="font-mono text-xl font-bold text-blue-400 tracking-wider font-mono">{userProfile?.referralCode}</span>
              <div className="flex gap-2">
                <button 
                  onClick={copyReferralCode}
                  className="text-[10px] bg-blue-600 px-3 py-1.5 rounded-lg font-bold"
                >COPY</button>
                <button 
                  onClick={shareReferralCode}
                  className="text-[10px] bg-green-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                >
                  <Share2 size={12} /> SHARE
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">Share this code with your team to join your GEN levels.</p>
          </div>

          <div className="glass-card space-y-3">
             <button 
              onClick={() => window.location.href='/about'}
              className="w-full flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Info size={18} className="text-gray-400" />
                <span className="text-sm font-medium">About TRAKZY AI</span>
              </div>
              <ChevronRight size={18} className="text-gray-600" />
            </button>
            <button 
              onClick={logout}
              className="w-full flex justify-between items-center p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:bg-red-500/20 group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} className="text-red-500" />
                <span className="font-bold text-red-500">Logout Session</span>
              </div>
              <ChevronRight size={18} className="text-red-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
