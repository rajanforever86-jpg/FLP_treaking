import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', emoji: '🏠' },
    { label: 'Team', path: '/team', emoji: '👥' },
    { label: 'Analysis', path: '/analysis', emoji: '📈' },
    { label: 'Training', path: '/training', emoji: '📚' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-[var(--bg2)] border-t border-[var(--border)] backdrop-blur-[20px] transition-all flex items-center justify-around z-[100] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className="flex flex-col items-center gap-[3px] py-2 px-5 cursor-pointer bg-transparent border-none min-w-[60px] min-height-[44px] relative"
        >
          <span className={`text-[22px] transition-transform duration-300 ${isActive(item.path) ? '-translate-y-[2px]' : ''}`}>
            {item.emoji}
          </span>
          <span className={`font-dm text-[10px] font-bold transition-colors ${isActive(item.path) ? 'text-[#2563EB]' : 'text-[var(--text-muted)]'}`}>
            {item.label}
          </span>
          {isActive(item.path) && (
            <div className="w-[4px] h-[4px] bg-[#2563EB] rounded-full mt-[2px] animate-pulse"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default BottomNav;
