import { motion } from 'framer-motion';
import { Search, Bell, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

export const TopBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 bg-[#13131f] border-b border-[#1f1f2e] flex items-center justify-between px-6 shrink-0"
    >
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search logs, IPs, events..."
            className="w-full bg-[#050508] border border-[#1f1f2e] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] transition-colors"
          />
        </div>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Time */}
        <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
          <Clock size={16} />
          <span>{format(currentTime, 'yyyy-MM-dd HH:mm:ss')} UTC</span>
        </div>
        
        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </motion.button>
        
        {/* User */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#050508] border border-[#1f1f2e] hover:border-[#00d4ff] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <span className="text-sm text-gray-300">SOC Analyst</span>
        </motion.button>
      </div>
    </motion.header>
  );
};