import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, BookOpen, Settings, LogOut } from 'lucide-react';
import { cn } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await logout();
      navigate('/login');
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', emoji: '📊' },
    { icon: Users, label: 'Team', path: '/team', emoji: '👥' },
    { icon: BarChart3, label: 'Analysis', path: '/analysis', emoji: '📈' },
    { icon: BookOpen, label: 'Training', path: '/training', emoji: '🎓' },
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[240px] bg-[var(--bg)] backdrop-blur-xl border-r border-[var(--border)] p-6 flex flex-col z-50 hidden lg:flex">
      <div className="flex items-center gap-3 mb-12 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-10 h-10 bg-[var(--blue)] rounded-[14px] flex items-center justify-center font-black text-xl font-syne shadow-lg shadow-[var(--shadow-blue)] text-white">T</div>
        <div className="flex flex-col">
          <div className="flex gap-1 items-baseline">
            <span className="font-syne font-black text-[18px] text-[var(--text)] uppercase leading-none">rakzy</span>
            <span className="font-syne font-black text-[18px] text-[#3B82F6] uppercase leading-none">AI</span>
          </div>
          <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-[2px] mt-1 uppercase">Tracking to Target.</span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-dm font-medium transition-all group",
              location.pathname === item.path 
                ? "bg-[var(--blue-dim)] text-[var(--blue)] border border-[var(--border-blue)]" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
            )}
          >
            <span className={cn("text-lg transition-transform", location.pathname === item.path && "scale-110")}>{item.emoji}</span>
            <span className="text-sm">{item.label}</span>
            {location.pathname === item.path && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--blue)] shadow-[0_0_10px_var(--blue)]"></div>
            )}
          </button>
        ))}
      </nav>

      <button
        onClick={() => navigate('/settings')}
        className={cn(
          "flex items-center gap-4 px-4 py-3.5 rounded-2xl font-dm font-medium transition-all mb-2",
          location.pathname === '/settings' 
            ? "bg-[var(--blue-dim)] text-[var(--blue)] border border-[var(--border-blue)]" 
            : "text-[var(--text-secondary)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
        )}
      >
        <span className="text-lg">⚙️</span>
        <span className="text-sm">Settings</span>
      </button>

      <button
        onClick={handleLogout}
        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-dm font-medium text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold"
      >
        <LogOut size={20} className="ml-1" />
        <span className="text-sm">Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;
