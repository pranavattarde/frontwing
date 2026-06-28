import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState<string>('');

  // GMT/UTC Clock update interval
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#090A0C] text-[#8B95A5] overflow-x-hidden selection:bg-[#00E5FF]/20 selection:text-[#00E5FF]">
      {/* Precision Top Navigation */}
      <Header />

      {/* Primary Workspace Viewport */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 py-6 focus:outline-none flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Engineering Status Console Bar */}
      <footer className="w-full border-t border-[#1C2025] bg-[#0E1013] py-2 px-4 md:px-6 text-[11px] font-timing font-mono flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-4 text-[#8B95A5]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1BC944] animate-pulse"></span>
            Telemetry Engine: <span className="text-[#F3F5F7]">Online</span>
          </span>
          <span className="hidden sm:inline border-l border-[#1C2025] h-3"></span>
          <span className="hidden sm:inline">
            Redis Broker: <span className="text-[#00E5FF]">Connected</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-[#8B95A5]">
          <span className="hidden md:inline">
            Active Workspace: <span className="text-[#F3F5F7]">{location.pathname === '/' ? 'Console/Landing' : location.pathname.substring(1).toUpperCase()}</span>
          </span>
          <span className="hidden md:inline border-l border-[#1C2025] h-3"></span>
          <span className="text-[#F3F5F7] tracking-wider">{currentTime}</span>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
