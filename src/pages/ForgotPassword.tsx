import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './../App.css';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    document.title = "TRAKZY AI — Reset Password";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      setMessage('');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-6">
       {/* Animated Blobs */}
       <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[100px] animate-[float_8s_infinite]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-[float_11s_infinite_reverse]"></div>

      <div className="relative z-10 w-full max-w-[420px] bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.07] rounded-[28px] p-10 md:p-11 shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-fade-up text-center">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-blue-500 rounded-[14px] flex items-center justify-center font-syne font-[900] text-[32px] text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] mb-4">
            T
          </div>
          <h1 className="font-syne font-[800] text-[26px] text-white">Reset Password</h1>
          <p className="font-dm text-[14px] text-gray-500 mt-1">Recover your TRAKZY AI account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-left">
            <label className="font-dm text-[12px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="name@example.com"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-4 text-white font-dm text-[15px] outline-none focus:border-blue-600 transition-all placeholder:text-[#475569]"
            />
          </div>
          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}
          {message && <p className="text-emerald-500 text-xs font-medium">{message}</p>}
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 py-4 rounded-full font-syne font-bold text-white text-[16px] hover:bg-blue-500 transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)]"
          >
            Send Reset Link
          </button>
        </form>

        <div className="mt-8">
          <Link to="/login" className="text-[14px] text-blue-500 font-bold hover:underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
