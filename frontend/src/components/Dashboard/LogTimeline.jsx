import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { demoData } from '../../data/demoData';
import { SeverityBadge } from '../../common/SeverityBadge';
import { getAlerts } from '../../api';

export const LogTimeline = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentAlerts = async () => {
      try {
        setLoading(true);
        // Request alerts - specifically Windows ones if API supports it, 
        // otherwise we filter here for consistency.
        const response = await getAlerts({ limit: 10 });
        if (response && response.alerts) {
          const formattedAlerts = response.alerts
            .filter(alert => alert.os === 'windows')
            .slice(0, 5)
            .map(alert => ({
              id: alert._id,
              severity: alert.severity,
              title: alert.event || alert.log_type || 'Security Alert',
              description: alert.raw_log || alert.event,
              source_ip: alert.source_ip || 'Internal',
              timestamp: alert.timestamp,
              os: alert.os
            }));
          setLogs(formattedAlerts);
          setError(null);
        }
      } catch (error) {
        console.error("Failed to fetch recent alerts:", error);
        setError("Offline");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentAlerts();
    const interval = setInterval(fetchRecentAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!loading && logs.length === 0 && !error) {
    return (
      <div className="bg-soc-panel border border-soc-border rounded-xl p-6 text-center">
        <p className="text-gray-400 text-sm">No recent Windows security events</p>
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-soc-panel border border-soc-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-white">Windows Security Events</h3>
          {error && <span className="text-[10px] text-red-400 font-medium">● {error}</span>}
          {loading && !error && <span className="text-[10px] text-soc-primary font-medium animate-pulse">● Syncing...</span>}
        </div>
        <button className="text-xs text-soc-primary hover:text-white transition-colors">
          View All →
        </button>
      </div>
      
      <div className="space-y-4">
        {logs.map((log, index) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="relative pl-6 border-l-2 border-soc-border hover:border-soc-primary transition-colors group"
          >
            {/* Timeline Dot */}
            <div className={`
              absolute -left-[5px] top-0 w-2 h-2 rounded-full
              ${log.severity === 'high' ? 'bg-red-500' : 
                log.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}
              group-hover:scale-150 transition-transform
            `} />
            
            <div className="bg-soc-darker rounded-lg p-4 border border-soc-border group-hover:border-soc-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">{log.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{log.description}</p>
                </div>
                <SeverityBadge severity={log.severity} />
              </div>
              
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-mono">
                <span>{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Windows
                </span>
                <span className="text-soc-primary">{log.source_ip}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
