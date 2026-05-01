import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, User, Clock, AlertTriangle, Activity } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { getRecentAlerts } from '../../api';

export const TopBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef([]);
  
  // Time update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const data = await getRecentAlerts();
      const prevNotifications = notificationsRef.current;
      
      // Calculate new unread count
      if (prevNotifications.length > 0) {
        const existingIds = new Set(prevNotifications.map(n => n.id));
        const newItemsCount = data.filter(n => !existingIds.has(n.id)).length;
        if (newItemsCount > 0 && !dropdownOpen) {
          setUnreadCount(prev => prev + newItemsCount);
        }
      } else if (data.length > 0 && prevNotifications.length === 0) {
        // Set initial count if we have alerts on first load
        setUnreadCount(data.length);
      }
      
      setNotifications(data);
      notificationsRef.current = data;
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              if (!dropdownOpen) setUnreadCount(0);
            }}
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-[#13131f]">
                {unreadCount}
              </span>
            ) : (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 bg-[#13131f] border border-[#1f1f2e] rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-3 border-b border-[#1f1f2e] bg-[#1a1a2e]/50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Recent Alerts</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Live Feed</span>
                </div>
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className="p-3 border-b border-[#1f1f2e] last:border-0 hover:bg-[#1a1a2e] transition-colors cursor-pointer"
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${notif.type === 'status' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                            {notif.type === 'status' ? <Activity size={14} /> : <AlertTriangle size={14} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] text-gray-200 leading-normal line-clamp-2">
                              {notif.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-gray-500 font-mono">
                                {notif.host}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-500">No recent alerts</p>
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-2 border-t border-[#1f1f2e] bg-[#050508]/50 text-center">
                    <button className="text-[10px] text-[#00d4ff] hover:underline font-medium">View All Activity</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
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
