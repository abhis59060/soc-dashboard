import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Server, Activity, Shield, Clock, HardDrive, AlertTriangle, ExternalLink } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { format } from 'date-fns';

export const HostModal = ({ isOpen, onClose, hostData, logs = [], loading = false }) => {
  const navigate = useNavigate();
  if (!hostData && !loading) return null;

  const handleFullInvestigation = () => {
    onClose();
    navigate(`/windows?host=${hostData.ip}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-soc-panel border border-soc-border w-full max-w-2xl rounded-2xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-soc-border flex items-center justify-between bg-gradient-to-r from-soc-primary/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-soc-primary/20 flex items-center justify-center text-soc-primary">
                    <Server size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{hostData?.ip || 'Host Details'}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      System Active • {hostData?.threat || 'Security Monitoring'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-soc-darker border border-soc-border p-4 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <Activity size={12} /> Total Events
                    </div>
                    <div className="text-xl font-bold text-white font-mono">{hostData?.count || 0}</div>
                  </div>
                  <div className="bg-soc-darker border border-soc-border p-4 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <Shield size={12} /> Security Status
                    </div>
                    <div className="text-sm font-semibold text-emerald-400">Protected</div>
                  </div>
                  <div className="bg-soc-darker border border-soc-border p-4 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <HardDrive size={12} /> OS Type
                    </div>
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      {hostData?.os === 'windows' ? (
                        <>
                          <span className="text-blue-400">💻</span>
                          <span className="text-blue-400">Windows</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400">🖥️</span>
                          <span className="text-gray-400">Windows Node</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logs Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Clock size={16} className="text-soc-primary" />
                      Recent Security Logs
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Last 10 Events</span>
                  </div>

                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Activity className="animate-spin mb-2" />
                        <p className="text-xs">Fetching log history...</p>
                      </div>
                    ) : logs.length > 0 ? (
                      logs.map((log, idx) => (
                        <div 
                          key={idx}
                          className="bg-soc-darker/50 border border-soc-border/50 p-3 rounded-lg hover:border-soc-primary/30 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <SeverityBadge severity={log.severity} />
                                {log.event_id && (
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                    [4625, 4672, '4625', '4672'].includes(log.event_id)
                                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  }`}>
                                    ID: {log.event_id}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss.SSS') : 'N/A'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 line-clamp-1 group-hover:line-clamp-none transition-all">
                                {log.event || log.message || 'Unknown Security Event'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-gray-500 uppercase font-bold">{log.log_type || 'SYS'}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-soc-darker/30 rounded-xl border border-dashed border-soc-border">
                        <AlertTriangle className="mx-auto text-gray-600 mb-2" size={24} />
                        <p className="text-xs text-gray-500">No logs found for this host.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-soc-border bg-soc-darker/50 flex justify-between items-center">
                <button
                  onClick={handleFullInvestigation}
                  className="px-4 py-2 bg-soc-primary/10 border border-soc-primary/30 text-soc-primary rounded-lg text-sm font-medium hover:bg-soc-primary/20 transition-colors flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Full Investigation
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-soc-border hover:bg-soc-border/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
