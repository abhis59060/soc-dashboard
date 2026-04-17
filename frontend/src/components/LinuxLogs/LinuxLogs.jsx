import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Filter, Download, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { LogTable } from '../../common/LogTable';
import { SeverityBadge } from '../../common/SeverityBadge';
import { format } from 'date-fns';
import { getLogs } from '../../api';

export const LinuxLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getLogs({ os_type: 'linux', limit: 100 });
        if (response && response.logs) {
          const formattedLogs = response.logs.map(log => ({
            id: log._id,
            timestamp: log.timestamp,
            type: log.log_type || 'auth',
            service: log.service || 'sshd',
            message: log.raw_log || log.event,
            host: log.host || 'Unknown',
            user: log.user || 'root',
            source_ip: log.source_ip || '',
            port: log.port,
            target_user: log.target_user,
            command: log.command,
            severity: log.severity
          }));
          setLogs(formattedLogs);
          setError(null);
        }
      } catch (error) {
        console.error("Failed to fetch Linux logs:", error);
        setError("API connection failed. Could not retrieve system logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading && logs.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-purple-400">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Retrieving Linux System Logs...</h2>
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
      title: 'Type',
      key: 'type',
      render: (log) => (
        <span className={`
          text-xs px-2 py-1 rounded-full font-mono uppercase
          ${log.type === 'auth' ? 'bg-purple-500/20 text-purple-400' :
            log.type === 'sudo' ? 'bg-red-500/20 text-red-400' :
            'bg-blue-500/20 text-blue-400'}
        `}>
          {log.type}
        </span>
      )
    },
    {
      title: 'Service',
      key: 'service',
      render: (log) => (
        <span className="text-sm font-mono text-gray-300">{log.service}</span>
      )
    },
    {
      title: 'Host',
      key: 'host',
      render: (log) => (
        <span className="text-xs font-mono text-soc-primary">{log.host}</span>
      )
    },
    {
      title: 'User',
      key: 'user',
      render: (log) => (
        <span className="text-sm text-white">{log.user}</span>
      )
    },
    {
      title: 'Source IP',
      key: 'source_ip',
      render: (log) => (
        <span className="text-xs font-mono text-gray-400">
          {log.source_ip || '-'}
        </span>
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
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <span className="text-gray-500">Port:</span>
          <span className="ml-2 text-soc-primary font-mono">{log.port || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Target User:</span>
          <span className="ml-2 text-gray-300">{log.target_user || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Timestamp:</span>
          <span className="ml-2 text-gray-300">{log.timestamp}</span>
        </div>
      </div>
      <div>
        <span className="text-gray-500">Raw Log:</span>
        <p className="mt-1 text-gray-300 bg-soc-dark p-3 rounded border border-soc-border font-mono text-xs">
          {log.message}
        </p>
      </div>
      {log.command && (
        <div className="mt-2">
          <span className="text-gray-500">Command:</span>
          <code className="ml-2 text-amber-400 font-mono text-xs bg-amber-400/10 px-2 py-1 rounded">
            {log.command}
          </code>
        </div>
      )}
    </div>
  );
  
  return (
    <div className="space-y-6">
      {/* Loading & Error Indicators */}
      {(loading || error) && (
        <div className="flex gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-soc-primary text-xs font-medium animate-pulse">
              <Terminal size={14} /> Syncing Linux logs...
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
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <Terminal size={24} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Linux System Logs</h1>
            <p className="text-gray-400 text-sm">Auth, syslog, and audit logs</p>
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
      
      {/* Log Sources */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          { file: '/var/log/auth.log', desc: 'Authentication logs', icon: '🔐' },
          { file: '/var/log/syslog', desc: 'System activity', icon: '⚙️' },
          { file: '/var/log/audit.log', desc: 'Audit trails', icon: '📋' }
        ].map((source, idx) => (
          <motion.div
            key={source.file}
            whileHover={{ scale: 1.02 }}
            className="bg-soc-panel border border-soc-border rounded-lg p-4 hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{source.icon}</span>
              <div>
                <div className="font-mono text-sm text-purple-400 mb-1">{source.file}</div>
                <div className="text-xs text-gray-400">{source.desc}</div>
              </div>
            </div>
          </motion.div>
        ))}
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
            <Shield size={18} className="text-purple-400" />
            Authentication & Authorization Events
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