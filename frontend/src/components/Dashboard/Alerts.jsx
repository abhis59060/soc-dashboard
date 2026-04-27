import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  X, 
  ShieldAlert, 
  Info, 
  Activity,
  ArrowRight,
  ShieldCheck,
  Search,
  Settings2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AlertCard } from './AlertCard';
import { AlertRulesModal } from './AlertRulesModal';
import { getAlerts, dismissAlert } from '../../api';
import { useAlerts } from '../../context/AlertContext';

export const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [investigatingAlert, setInvestigatingAlert] = useState(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const prevAlertIds = useRef(new Set());
  const { alertCount, setAlertCount, refreshAlertCount } = useAlerts();

  const handleDismiss = async (alertId) => {
    try {
      // Optimistic update
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      
      // Backend call
      await dismissAlert(alertId);
      
      // Refresh global stats
      refreshAlertCount();
      
      toast.success("Threat marked as resolved", {
        style: {
          background: '#0a0a14',
          color: '#10b981',
          border: '1px solid #10b98133',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      toast.error("Resolution failed");
      fetchAlerts(false);
      refreshAlertCount();
    }
  };

  const handleInvestigate = (alert) => {
    setInvestigatingAlert(alert);
  };

  const getInvestigationSummary = (alert) => {
    const eid = String(alert.event_id);
    if (eid === '666') {
      return {
        what: "Confirmed Malicious Activity",
        risk: "DANGER: This computer has detected a direct security breach or a known virus pattern. This is not a false alarm.",
        action: "IMMEDIATE: Disconnect this computer from the network and run a full deep scan. Change the user's password immediately."
      };
    } else if (eid === '4625') {
      return {
        what: "Failed Login (Possible Brute Force)",
        risk: "WARNING: Someone is trying to guess a password on this computer. If there are many attempts, it means a hacker or a script is trying to break in.",
        action: "RECOMMENDED: Check if the user just forgot their password. If the IP address is unknown, block it and ensure Multi-Factor Authentication (MFA) is enabled."
      };
    } else if (eid === '4672') {
      return {
        what: "Privileged User Session Started",
        risk: "HIGH: A user has logged in with Administrative rights. This grants them full control over the system, including the ability to change security settings and access sensitive data.",
        action: "RECOMMENDED: A user has logged in with Administrative rights. Verify if this was an authorized maintenance task."
      };
    } else if (alert.severity === 'critical' || alert.is_priority) {
      return {
        what: "Critical System Event",
        risk: "HIGH: A highly sensitive system file or setting was changed. This is often done by attackers to stay hidden in the network.",
        action: "RECOMMENDED: Review the system changes. If this was not done by an IT admin, revert the changes and check for other suspicious files."
      };
    }
    return {
      what: alert.title || "Security Observation",
      risk: "MODERATE: A security event was recorded that deviates from normal behavior. It might be a configuration change or an unusual user action.",
      action: "RECOMMENDED: Monitor this host for more events. If more alerts appear, escalate to a full investigation."
    };
  };

  const fetchAlerts = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const params = { severity: filter === 'all' ? null : filter, limit: 100 };
      const response = await getAlerts(params);
      
      if (response && response.alerts) {
        setAlertCount(response.count);

        const formattedAlerts = response.alerts.map(alert => ({
          id: alert._id,
          severity: alert.severity,
          is_priority: alert.is_priority || false,
          title: alert.reason || alert.event || 'Security Alert',
          description: alert.raw_log || 'No detailed log available',
          source_ip: alert.source_ip || 'Internal',
          target: alert.host || 'Unknown',
          timestamp: alert.timestamp,
          os: alert.os,
          event_type: alert.type || 'security_alert',
          count: alert.count || 1,
          event_id: alert.event_id
        }));

        prevAlertIds.current = new Set(formattedAlerts.map(a => a.id));
        setAlerts(formattedAlerts);
        setError(null);
      }

    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setError("Synchronizer Offline");
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
  
  if (loading && alerts.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-red-400">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-black uppercase tracking-tighter">Initializing Threat Matrix...</h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2">Connecting to Secure Vault</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Investigation Modal */}
      <AnimatePresence>
        {investigatingAlert && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setInvestigatingAlert(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="max-w-xl w-full bg-[#0d0d17] border border-soc-border rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-soc-primary via-red-500 to-soc-primary" />
              
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-soc-primary/10 rounded-xl text-soc-primary border border-soc-primary/20">
                    <ShieldAlert size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Threat Analysis</h3>
                    <p className="text-gray-500 text-[10px] font-mono font-bold uppercase tracking-widest">Case ID: {investigatingAlert.id.slice(-8)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setInvestigatingAlert(null)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 text-soc-primary mb-2">
                    <Info size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">What Happened?</span>
                  </div>
                  <p className="text-lg font-bold text-white leading-tight mb-2">
                    {getInvestigationSummary(investigatingAlert).what}
                  </p>
                  <div className="text-xs text-gray-400 font-medium">
                    Target Host: <span className="text-white font-bold">{investigatingAlert.target}</span> • 
                    Event ID: <span className="text-soc-primary font-bold">{investigatingAlert.event_id}</span>
                  </div>
                </div>

                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-500 mb-2">
                    <Activity size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Why is it a risk?</span>
                  </div>
                  <p className="text-sm text-red-100 font-medium leading-relaxed">
                    {getInvestigationSummary(investigatingAlert).risk}
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-500 mb-2">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Recommended Action</span>
                  </div>
                  <p className="text-sm text-emerald-100 font-bold leading-relaxed italic">
                    {getInvestigationSummary(investigatingAlert).action}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => {
                    handleDismiss(investigatingAlert.id);
                    setInvestigatingAlert(null);
                  }}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  <CheckCircle size={20} />
                  Mark as Resolved
                </button>
                <button 
                  onClick={() => setInvestigatingAlert(null)}
                  className="px-6 py-4 bg-white/5 text-gray-400 rounded-xl font-bold hover:text-white hover:bg-white/10 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5"
        >
          <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 relative shadow-[0_0_30px_rgba(239,68,68,0.15)]">
            <Bell size={32} className="text-red-500" />
            <AnimatePresence>
              {alertCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-xs text-white font-black shadow-lg border-2 border-[#0a0a0f]"
                >
                  {alertCount}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Security Matrix</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {alertCount} Active Incidents • Live Polling Active
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Filter threats..." 
              className="bg-soc-panel/50 border border-soc-border text-white text-[10px] font-bold uppercase tracking-widest rounded-xl pl-10 pr-4 py-3 outline-none focus:border-soc-primary transition-all w-48"
            />
          </div>
          <div className="h-10 w-[1px] bg-soc-border mx-2" />
          <div className="flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRulesModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-soc-panel border border-soc-border text-gray-400 hover:text-white hover:border-soc-primary transition-all rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
            >
              <Settings2 size={16} /> Alert Rules
            </motion.button>
            {error && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black rounded-xl">
                <AlertTriangle size={14} /> SYNC ERROR
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-soc-primary/10 border border-soc-primary/20 text-soc-primary text-[10px] font-black rounded-xl">
                <Loader2 size={14} className="animate-spin" /> SYNCING
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 bg-soc-panel/30 p-1.5 rounded-2xl border border-soc-border w-fit">
        {[
          { key: 'all', label: 'All Matrix', color: 'red' },
          { key: 'critical', label: 'Breach Level', color: 'red' },
          { key: 'high', label: 'High Priority', color: 'orange' },
          { key: 'medium', label: 'Warnings', color: 'amber' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`
              px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              ${filter === tab.key
                ? `bg-white/5 text-white border border-white/10 shadow-inner`
                : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {alerts.map((alert, index) => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                index={index} 
                onDismiss={() => handleDismiss(alert.id)}
                onInvestigate={handleInvestigate}
              />
            ))}
          </AnimatePresence>
        </div>
        
        {alerts.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 bg-soc-panel/10 border border-dashed border-soc-border rounded-[2rem]"
          >
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">System Sanitized</h3>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Zero unread security threats detected</p>
          </motion.div>
        )}
      </div>

      <AlertRulesModal 
        isOpen={isRulesModalOpen} 
        onClose={() => setIsRulesModalOpen(false)} 
      />
    </div>
  );
};
