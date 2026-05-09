import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './../App.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  React.useEffect(() => {
    document.title = "TRAKZY AI — Login";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] px-6">
      {/* Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[100px] animate-[float_8s_infinite]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-[float_11s_infinite_reverse]"></div>

      <div className="relative z-10 w-full max-w-[420px] bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.07] rounded-[28px] p-10 md:p-11 shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-fade-up">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-700 to-blue-500 rounded-[14px] flex items-center justify-center font-syne font-[900] text-[42px] text-white shadow-[0_0_40px_rgba(37,99,235,0.5)] mb-6 transition-transform hover:scale-105">
            T
          </div>
          <h1 className="font-syne font-[800] text-[30px] text-white flex gap-1 items-baseline">
            <span className="text-[#fcfcfc] uppercase">rakzy</span>
            <span className="text-[#3B82F6] uppercase">AI</span>
          </h1>
          <p className="font-mono text-[11px] text-[#ffffff] tracking-[3px] uppercase mt-2">Tracking to Target.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="font-dm text-[12px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="name@example.com"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-4 text-white font-dm text-[15px] outline-none focus:border-blue-600 focus:bg-blue-600/[0.08] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all placeholder:text-[#475569]"
            />
          </div>
          <div className="space-y-2">
            <label className="font-dm text-[12px] font-semibold uppercase text-[#94A3B8] tracking-[0.5px]">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              className="w-full bg-white/[0.05] border border-white/[0.07] rounded-[14px] p-4 text-white font-dm text-[15px] outline-none focus:border-blue-600 focus:bg-blue-600/[0.08] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all placeholder:text-[#475569]"
            />
          </div>
          {error && <p className="text-red-500 text-xs font-medium text-center">{error}</p>}
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 py-4 rounded-full font-syne font-bold text-white text-[16px] hover:bg-blue-500 transition-all hover:-translate-y-0.5 active:scale-95 shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_32px_rgba(37,99,235,0.6)]"
          >
            Login Session
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link to="/forgot-password" title="Forgot Password" id="forgot-password-link" className="text-[13px] text-[#94A3B8] hover:text-white transition-colors">Forgot Password?</Link>
          <p className="text-[14px] text-gray-500">
            New here? <Link to="/signup" className="text-blue-500 font-bold hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
