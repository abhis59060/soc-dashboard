import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Filter, Download, Globe, Ban, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { LogTable } from '../../common/LogTable';
import { SeverityBadge } from '../../common/SeverityBadge';
import { format } from 'date-fns';
import { getLogs } from '../../api';

export const FirewallLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getLogs({ log_type: 'firewall', limit: 100 });
        if (response && response.logs) {
          const formattedLogs = response.logs.map(log => ({
            id: log._id,
            timestamp: log.timestamp,
            action: log.action || 'BLOCK',
            protocol: log.protocol || 'TCP',
            source_ip: log.source_ip || '0.0.0.0',
            source_port: log.source_port || 0,
            dest_ip: log.dest_ip || '0.0.0.0',
            dest_port: log.dest_port || 0,
            interface: log.interface || 'eth0',
            rule: log.rule || 'Default',
            severity: log.severity,
            message: log.raw_log || log.event
          }));
          setLogs(formattedLogs);
          setError(null);
        }
      } catch (error) {
        console.error("Failed to fetch Firewall logs:", error);
        setError("Network traffic sync failed. Could not retrieve security policy logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading && logs.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-emerald-400">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Retrieving Firewall Security Logs...</h2>
      </div>
    );
  }
  
  const columns = [
    {
      title: 'Time',
      key: 'timestamp',
      render: (log) => (
        <span className="text-xs font-mono text-gray-400">
          {format(new Date(log.timestamp), 'HH:mm:ss')}
        </span>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (log) => (
        <span className={`
          inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold
          ${log.action === 'BLOCK' 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}
        `}>
          {log.action === 'BLOCK' ? <Ban size={12} /> : <CheckCircle size={12} />}
          {log.action}
        </span>
      )
    },
    {
      title: 'Protocol',
      key: 'protocol',
      render: (log) => (
        <span className="font-mono text-sm text-soc-primary">{log.protocol}</span>
      )
    },
    {
      title: 'Source',
      key: 'source_ip',
      render: (log) => (
        <div className="text-xs">
          <div className="font-mono text-white">{log.source_ip}</div>
          <div className="text-gray-500">:{log.source_port}</div>
        </div>
      )
    },
    {
      title: 'Destination',
      key: 'dest_ip',
      render: (log) => (
        <div className="text-xs">
          <div className="font-mono text-white">{log.dest_ip}</div>
          <div className="text-gray-500">:{log.dest_port}</div>
        </div>
      )
    },
    {
      title: 'Interface',
      key: 'interface',
      render: (log) => (
        <span className="text-xs font-mono text-gray-400">{log.interface}</span>
      )
    },
    {
      title: 'Severity',
      key: 'severity',
      render: (log) => <SeverityBadge severity={log.severity} />
    }
  ];
  
  const expandedRowRender = (log) => (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-gray-500">Rule:</span>
          <span className="ml-2 text-amber-400 font-mono text-xs">{log.rule}</span>
        </div>
        <div>
          <span className="text-gray-500">Timestamp:</span>
          <span className="ml-2 text-gray-300">{log.timestamp}</span>
        </div>
      </div>
      <div>
        <span className="text-gray-500">Raw Message:</span>
        <p className="mt-1 text-gray-300 bg-soc-dark p-3 rounded border border-soc-border font-mono text-xs break-all">
          {log.message}
        </p>
      </div>
    </div>
  );
  
  const blockedCount = logs.filter(l => l.action === 'BLOCK').length;
  const allowedCount = logs.filter(l => l.action === 'ALLOW').length;
  
  return (
    <div className="space-y-6">
      {/* Loading & Error Indicators */}
      {(loading || error) && (
        <div className="flex gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-soc-primary text-xs font-medium animate-pulse">
              <Shield size={14} /> Syncing network events...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <Shield size={24} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Firewall Logs</h1>
            <p className="text-gray-400 text-sm">UFW, iptables, and network security events</p>
          </div>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-soc-darker border border-soc-border rounded-lg text-sm text-gray-300 hover:text-white hover:border-soc-primary transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            Filter
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-soc-primary/10 border border-soc-primary/30 text-soc-primary rounded-lg text-sm font-medium hover:bg-soc-primary/20 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </motion.button>
        </div>
      </motion.div>
      
      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-soc-panel border border-soc-border rounded-lg p-4 border-l-4 border-l-red-500"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Blocked</span>
            <Ban size={16} className="text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{blockedCount}</div>
          <div className="text-xs text-red-400 mt-1">Potential threats</div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-soc-panel border border-soc-border rounded-lg p-4 border-l-4 border-l-emerald-500"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Allowed</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{allowedCount}</div>
          <div className="text-xs text-emerald-400 mt-1">Legitimate traffic</div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-soc-panel border border-soc-border rounded-lg p-4 border-l-4 border-l-blue-500"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Top Port</span>
            <Globe size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">22</div>
          <div className="text-xs text-blue-400 mt-1">SSH attempts</div>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-soc-panel border border-soc-border rounded-lg p-4 border-l-4 border-l-amber-500"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Unique IPs</span>
            <Shield size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">12</div>
          <div className="text-xs text-amber-400 mt-1">Last hour</div>
        </motion.div>
      </motion.div>
      
      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-soc-panel border border-soc-border rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-soc-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe size={18} className="text-emerald-400" />
            Network Traffic Log
          </h3>
          <span className="text-xs text-gray-500">Showing {logs.length} entries</span>
        </div>
        <LogTable 
          logs={logs} 
          columns={columns}
          expandedRowRender={expandedRowRender}
        />
      </motion.div>
    </div>
  );
};