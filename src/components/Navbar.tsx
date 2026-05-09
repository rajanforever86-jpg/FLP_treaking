import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Settings } from 'lucide-react';

const Navbar: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const firstName = profile?.fullName.split(' ')[0] || 'User';

  return (
    <nav className="sticky top-0 z-[100] w-full bg-[var(--bg)]/85 backdrop-blur-xl border-b border-[var(--border)] py-5 px-6 flex justify-between items-center transition-all lg:hidden">
      <div className="flex flex-col">
        <h2 className="font-syne font-black text-2xl text-[var(--text)] tracking-tight flex gap-1">
          Hey, <span className="text-[var(--blue)]">{firstName}!</span>
        </h2>
        <p className="font-dm text-[13px] text-[var(--text-muted)] font-medium mt-0.5">Let's hit your targets today.</p>
      </div>
      
      <button 
        onClick={() => navigate('/settings')}
        className="w-11 h-11 bg-[var(--card)] rounded-2xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--blue)] hover:border-[var(--blue)]/40 transition-all active:scale-95"
      >
        <Settings size={22} />
      </button>
    </nav>
  );
};

export default Navbar;
