import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, Filter, AlertTriangle, CheckCircle, Archive, Loader2, Settings2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AlertCard } from './AlertCard';
import { getAlerts, dismissAlert } from '../../api';
import { useAlerts } from '../../context/AlertContext';
import { AlertRulesModal } from '../Dashboard/AlertRulesModal';

export const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const prevAlertIds = useRef(new Set());
  const { alertCount, severityCounts, setAlertCount, refreshAlertCount, refreshAllData } = useAlerts();

  const handleDismiss = async (alertId) => {
    try {
      // Optimistic update
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      
      // Backend call
      await dismissAlert(alertId);
      
      // Refresh global stats across Sidebar and Dashboard
      refreshAllData();
      
      toast.success("Alert dismissed successfully", {
        style: {
          background: '#1a1a1a',
          color: '#10b981',
          border: '1px solid #10b98133'
        }
      });
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      toast.error("Failed to dismiss alert");
      // Re-fetch to sync
      fetchAlerts(false);
      refreshAlertCount();
    }
  };

  const fetchAlerts = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const params = filter === 'all' ? { severity: null, limit: 100 } : { severity: filter, limit: 100 };
      const response = await getAlerts(params);
      
      if (response && response.alerts) {
        if (filter === 'all') {
          setAlertCount(response.count);
        }

        const formattedAlerts = response.alerts.map(alert => ({
          id: alert._id,
          severity: alert.severity,
          is_priority: alert.is_priority || false,
          title: alert.event || 'Security Alert',
          description: alert.raw_log || 'No detailed log available',
          source_ip: alert.source_ip || 'Internal',
          target: alert.host || 'Unknown',
          timestamp: alert.timestamp,
          os: alert.os,
          event_type: alert.log_type,
          count: alert.count || 1,
          event_id: alert.event_id
        }));

        if (!isInitial) {
          formattedAlerts.forEach(alert => {
            if (!prevAlertIds.current.has(alert.id)) {
              // Since the backend only returns configured alerts, anything here is critical
              const message = `CRITICAL: ${alert.title} detected on ${alert.target}`;
              
              toast.error(message, {
                duration: 5000,
                position: 'top-right',
                style: {
                  background: '#1a1a1a',
                  color: '#ff4d4d',
                  border: '1px solid #ff4d4d33'
                }
              });
            }
          });
        }

        prevAlertIds.current = new Set(formattedAlerts.map(a => a.id));
        setAlerts(formattedAlerts);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setError("Connection failed. Could not retrieve real-time alerts.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(true);
    const interval = setInterval(() => {
      fetchAlerts(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [filter]);
  
  const displayCounts = {
    all: alertCount,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length
  };
  
  if (loading && alerts.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-red-400">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Loading Security Alerts...</h2>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {(loading || error) && (
        <div className="flex gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-soc-primary text-xs font-medium animate-pulse">
              <Bell size={14} className="animate-bounce" /> Syncing alerts...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 relative">
            <Bell size={24} className="text-red-400" />
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {alerts.length}
            </motion.div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Security Alerts</h1>
            <p className="text-gray-400 text-sm">Manage and respond to security incidents</p>
          </div>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsRulesOpen(true)}
            className="px-4 py-2 bg-soc-primary/10 border border-soc-primary/30 rounded-lg text-sm text-soc-primary hover:bg-soc-primary/20 transition-colors flex items-center gap-2"
          >
            <Settings2 size={16} />
            Configure Alerts
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-soc-darker border border-soc-border rounded-lg text-sm text-gray-300 hover:text-white hover:border-soc-primary transition-colors flex items-center gap-2"
          >
            <Archive size={16} />
            Archive All
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={16} />
            Acknowledge All
          </motion.button>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {[
          { key: 'all', label: 'All Alerts', color: 'blue' },
          { key: 'high', label: 'High Severity', color: 'red' },
          { key: 'medium', label: 'Medium Severity', color: 'amber' },
          { key: 'low', label: 'Low Severity', color: 'emerald' }
        ].map((tab) => (
          <motion.button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${filter === tab.key
                ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                : 'bg-soc-panel border border-soc-border text-gray-400 hover:text-white'}
            `}
          >
            {tab.label}
            <span className={`
              ml-2 px-2 py-0.5 rounded-full text-xs
              ${filter === tab.key ? 'bg-white/10' : 'bg-soc-darker'}
            `}>
              {displayCounts[tab.key]}
            </span>
          </motion.button>
        ))}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {alerts.map((alert, index) => (
          <AlertCard 
            key={alert.id} 
            alert={alert} 
            index={index} 
            onDismiss={() => handleDismiss(alert.id)}
          />
        ))}
      </motion.div>
      
      {alerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-soc-panel border border-soc-border mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No active threats detected</h3>
          <p className="text-gray-400">Your systems are currently secure.</p>
        </motion.div>
      )}

      <AlertRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
      />
    </div>
  );
};
