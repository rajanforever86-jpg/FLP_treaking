import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import './../App.css';

const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signup, firebaseUser } = useAuth();

  React.useEffect(() => {
    document.title = "TRAKZY AI — Sign Up";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create Firebase Auth User
      await signup(email, password);
      
      // Note: firebaseUser might be null right after signup call if state hasn't updated
      // But we can usually get the user from auth.currentUser safely here or wait
      // Actually AuthProvider will update fUser eventually.
      // Firebase's createUserWithEmailAndPassword returns the user credential, 
      // but here we used the wrapped function.
      // If we need the UID immediately, it's better if signup() returns it or we use auth.currentUser.
      
      // Let's modify signup in AuthContext to return the user or just use auth.currentUser here.
      const currentAuthUser = auth.currentUser;
      if (!currentAuthUser) throw new Error("User creation failed");

      // 2. Create Firestore User Profile
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await setDoc(doc(db, 'users', currentAuthUser.uid), {
        fullName,
        email,
        phone,
        referralCode: generatedCode,
        referredBy: referredBy || null,
        rank: 'Member',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      });

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Signup failed');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-6 py-12">
      {/* Animated Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[100px] animate-[float_10s_infinite]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-[float_12s_infinite_reverse]"></div>

      <div className="relative z-10 w-full max-w-[420px] bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.07] rounded-[28px] p-10 md:p-11 shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-fade-up">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-blue-500 rounded-[14px] flex items-center justify-center font-syne font-[900] text-[32px] text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] mb-4">
            T
          </div>
          <h1 className="font-syne font-[800] text-[26px] text-white">Create Account</h1>
          <p className="font-dm text-[14px] text-gray-500 mt-1">Join the TRAKZY AI ecosystem.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="font-dm text-[11px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              required 
              placeholder="Your Name"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-3.5 text-white font-dm text-[14px] outline-none focus:border-blue-600 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-dm text-[11px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="name@example.com"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-3.5 text-white font-dm text-[14px] outline-none focus:border-blue-600 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-dm text-[11px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Phone Number</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              required 
              placeholder="91XXXXXXXX"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-3.5 text-white font-dm text-[14px] outline-none focus:border-blue-600 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-dm text-[11px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-3.5 text-white font-dm text-[14px] outline-none focus:border-blue-600 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-dm text-[11px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Referral Code (Optional)</label>
            <input 
              type="text" 
              value={referredBy} 
              onChange={(e) => setReferredBy(e.target.value)} 
              placeholder="Enter upline code"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-3.5 text-white font-dm text-[14px] outline-none focus:border-blue-600 transition-all font-mono"
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-medium text-center">{error}</p>}
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 py-4 mt-2 rounded-full font-syne font-bold text-white text-[15px] hover:bg-blue-500 transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)]"
          >
            Start Tracking Now
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[14px] text-gray-500">
            Already have an account? <Link to="/login" className="text-blue-500 font-bold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
