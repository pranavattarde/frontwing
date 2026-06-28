import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const isLinkActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { label: 'Live Leaderboard', path: '/' },
    { label: 'Driver Analysis', path: '/driver' },
    { label: 'Team Analytics', path: '/team' },
    { label: 'Strategy Simulator', path: '/simulate' },
    { label: 'Ghost Battle', path: '/battle' },
  ];

  return (
    <header className="w-full border-b border-[#1C2025] bg-[#0E1013]/90 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Brand Identity / Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1 rounded bg-[#FF1801] text-white transition-transform group-hover:scale-105 duration-200">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm tracking-widest text-[#F3F5F7] font-mono group-hover:text-white transition-colors">
            FRONT<span className="text-[#FF1801]">WING</span>
          </span>
        </Link>

        {/* Navigation Actions */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-xs font-medium tracking-wide transition-all duration-150 relative py-1 hover:text-[#F3F5F7] ${
                isLinkActive(item.path)
                  ? 'text-[#F3F5F7]'
                  : 'text-[#8B95A5]'
              }`}
            >
              {item.label}
              {isLinkActive(item.path) && (
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#FF1801] rounded-full"></span>
              )}
            </Link>
          ))}
        </nav>

        {/* Control utility */}
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 border border-[#1C2025] bg-[#16191E] text-[10px] font-timing font-mono rounded text-[#00E5FF] tracking-wider select-none animate-pulse">
            LIVE FEED
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
