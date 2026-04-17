import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Monitor, 
  Bell, 
  ShieldAlert
} from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import { getNodes, getSystemStats } from '../../api';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/windows', icon: Monitor, label: 'Windows Logs' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
];

export const Sidebar = () => {
  const { alertCount } = useAlerts();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentHost = queryParams.get('host');

  const [nodeStats, setNodeStats] = useState({ online: 0, total: 0 });
  const [sysStats, setSysStats] = useState({ cpu: 0, ram: 0, status: 'online' });

  useEffect(() => {
    const fetchNodeStats = async () => {
      try {
        const data = await getNodes();
        console.log('Sidebar Stats:', data);
        if (data) {
          const onlineCount = data.online_agents !== undefined ? data.online_agents : (data.online || 0);
          setNodeStats({
            online: onlineCount,
            total: data.total || 0
          });
        } else {
          setNodeStats({ online: 0, total: 0 });
        }
      } catch (error) {
        console.error("Failed to fetch node stats for sidebar:", error);
        setNodeStats({ online: 0, total: 0 });
      }
    };

    const fetchSysStats = async () => {
      try {
        const data = await getSystemStats(currentHost);
        if (data) {
          setSysStats({
            cpu: data.cpu || 0,
            ram: data.ram || 0,
            status: data.status || 'online'
          });
        }
      } catch (error) {
        console.error("Failed to fetch system stats:", error);
        setSysStats({ cpu: 0, ram: 0, status: 'disconnected' });
      }
    };

    fetchNodeStats();
    fetchSysStats();
    
    const nodeInterval = setInterval(fetchNodeStats, 3000);
    const sysInterval = setInterval(fetchSysStats, 10000); // 10s interval as requested
    
    return () => {
      clearInterval(nodeInterval);
      clearInterval(sysInterval);
    };
  }, [currentHost]);

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-64 bg-[#13131f] border-r border-[#1f1f2e] flex flex-col h-full"
    >
      {/* Logo */}
      <div className="p-6 border-b border-[#1f1f2e]">
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative">
            <ShieldAlert size={32} className="text-[#00d4ff]" />
            <motion.div
              className="absolute inset-0 rounded-full bg-[#00d4ff]/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">SOC</h1>
            <p className="text-xs text-gray-500">Security Operations</p>
          </div>
        </motion.div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                ${isActive 
                  ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.path === '/alerts' && alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {alertCount}
                </span>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>
      
      {/* Resource Monitor */}
      <div className="px-4 mb-4">
        <div className="bg-[#1a1a2e] rounded-lg p-3 border border-[#2e2e42]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resource Monitor</h3>
            {sysStats.status === 'disconnected' && (
              <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded border border-red-500/20 font-bold uppercase tracking-tighter animate-pulse">Disconnected</span>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-400">CPU Usage</span>
                <span className={sysStats.status === 'disconnected' ? 'text-gray-600' : sysStats.cpu > 80 ? 'text-red-400' : 'text-[#00d4ff]'}>
                  {sysStats.status === 'disconnected' ? '0%' : `${sysStats.cpu}%`}
                </span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${sysStats.status === 'disconnected' ? 'bg-gray-700' : sysStats.cpu > 80 ? 'bg-red-500' : 'bg-[#00d4ff]'}`}
                  animate={{ width: sysStats.status === 'disconnected' ? '0%' : `${sysStats.cpu}%` }}
                  transition={{ type: 'spring', stiffness: 50 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-400">RAM Usage</span>
                <span className={sysStats.status === 'disconnected' ? 'text-gray-600' : sysStats.ram > 80 ? 'text-red-400' : 'text-emerald-400'}>
                  {sysStats.status === 'disconnected' ? '0%' : `${sysStats.ram}%`}
                </span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${sysStats.status === 'disconnected' ? 'bg-gray-700' : sysStats.ram > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  animate={{ width: sysStats.status === 'disconnected' ? '0%' : `${sysStats.ram}%` }}
                  transition={{ type: 'spring', stiffness: 50 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status */}
      <div className="p-4 border-t border-[#1f1f2e]">
        <div className="bg-[#050508] rounded-lg p-4 border border-[#1f1f2e]">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${nodeStats.online > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-xs ${nodeStats.online > 0 ? 'text-emerald-400' : 'text-red-400'} font-medium`}>
              {nodeStats.online > 0 ? 'System Online' : 'No Agents Connected'}
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Agents:</span>
              <span className="text-white">{nodeStats.online}/{nodeStats.total || 1} Online</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span className="text-white">{nodeStats.online > 0 ? '24ms' : '--'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};