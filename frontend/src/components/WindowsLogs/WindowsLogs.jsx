import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Trash2, AlertTriangle, Loader2, X, Server, Info, ChevronDown, CheckCircle2, Search } from 'lucide-react';
import { LogTable } from '../../common/LogTable';
import { SeverityBadge } from '../../common/SeverityBadge';
import { format } from 'date-fns';
import { getLogs, purgeLogs, getNodes, deleteLog } from '../../api';
import toast from 'react-hot-toast';

export const WindowsLogs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialHost = queryParams.get('host');

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterEventId, setFilterEventId] = useState(null);
  const [searchEventId, setSearchEventId] = useState('');
  const [filterHost, setFilterHost] = useState(initialHost);
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [isClearing, setIsClearing] = useState(false);
  const [lastLogTimestamp, setLastLogTimestamp] = useState(Date.now());
  const [isIdle, setIsIdle] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [investigatingLog, setInvestigatingLog] = useState(null);
  const [onlineNodes, setOnlineNodes] = useState([]);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const data = await getNodes();
        if (data && data.hosts) {
          // Keep all hosts but identify online/offline status correctly
          setOnlineNodes(data.hosts);
        }
      } catch (error) {
        console.error("Failed to fetch nodes for filter:", error);
      }
    };
    fetchNodes();
    const nodeInterval = setInterval(fetchNodes, 5000);
    return () => clearInterval(nodeInterval);
  }, []);

  useEffect(() => {
    // Update URL when filterHost changes
    const params = new URLSearchParams(location.search);
    if (filterHost) {
      params.set('host', filterHost);
    } else {
      params.delete('host');
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [filterHost]);

  useEffect(() => {
    const fetchLogs = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        
        // Raw Autonomous Fetch: Fetch latest 100 logs with active filters
        const params = { 
          os_type: 'windows', 
          limit: 100,
          severity: filterSeverity !== 'All' ? filterSeverity : undefined,
          host: filterHost || undefined,
          search: searchEventId || undefined,
          event_id: filterEventId || undefined
        };
        
        const response = await getLogs(params);
        if (response && response.logs) {
          const now = Date.now();
          const incoming = response.logs.map(log => ({
            id: log._id,
            timestamp: log.timestamp,
            event_id: log.event_id || 'N/A',
            level: log.severity === 'critical' ? 'Critical' : log.severity === 'high' ? 'Error' : log.severity === 'medium' ? 'Warning' : 'Information',
            source: log.log_type || 'Security',
            message: log.raw_log || log.event,
            computer: log.host || 'Unknown',
            user: log.user || 'SYSTEM',
            ip: log.source_ip || 'N/A',
            severity: log.severity,
            is_custom: log.is_custom_rule,
            isNew: (now - new Date(log.timestamp).getTime()) < 30000,
            isAcknowledged: false
          }));

          setLogs(prevLogs => {
            // If host or severity changed, we might want to start fresh or just merge
            // For host/severity change, initial fetch is usually called
            if (isInitial) return incoming;

            const existingIds = new Set(prevLogs.map(l => l.id));
            const newLogs = incoming.filter(l => !existingIds.has(l.id));
            
            if (newLogs.length > 0) {
              setLastLogTimestamp(Date.now());
              
              // Trigger specific notifications for custom rules matching the requested Event ID
              newLogs.forEach(log => {
                if (log.is_custom) {
                  toast.error(`CUSTOM RULE MATCH: Event ${log.event_id} detected on ${log.computer}`, {
                    duration: 5000,
                    style: {
                      background: '#1a1a2e',
                      color: '#ff4d4d',
                      border: '1px solid #ff4d4d33',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    },
                    icon: '🚨'
                  });
                }
              });
            }

            return [...newLogs, ...prevLogs].slice(0, 100);
          });
          setError(null);
        }
      } catch (error) {
        console.error("Fetch Engine Error:", error);
        setError("Failed to sync with security engine.");
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchLogs(true);
    const engineId = setInterval(() => fetchLogs(false), 5000);
    return () => clearInterval(engineId);
  }, [filterHost, filterSeverity, searchEventId, filterEventId]);

  // Status and Idle Logic
  useEffect(() => {
    const statusInterval = setInterval(() => {
      const timeSinceLastLog = Date.now() - lastLogTimestamp;
      setIsLive(timeSinceLastLog < 30000);
      setIsIdle(timeSinceLastLog >= 30000);
    }, 1000);
    return () => clearInterval(statusInterval);
  }, [lastLogTimestamp]);

  const handleStatClick = (eventId) => {
    setSearchEventId('');
    setFilterEventId(prev => prev === eventId ? null : eventId);
  };

  const handleClearAll = async () => {
    if (!window.confirm("Purge all logs?")) return;
    try {
      setIsClearing(true);
      await purgeLogs();
      setLogs([]);
    } catch (err) {
      alert("Purge failed.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleAcknowledge = (logId) => {
    setLogs(prev => prev.map(log => 
      log.id === logId ? { ...log, isAcknowledged: !log.isAcknowledged } : log
    ));
  };

  const handleCloseLog = async (logId) => {
    try {
      await deleteLog(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Time', 'Event ID', 'Level', 'Severity', 'Source', 'Computer', 'User', 'IP', 'Message'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        log.event_id,
        log.level,
        log.severity,
        `"${log.source}"`,
        log.computer,
        log.user,
        log.ip,
        `"${log.message.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `windows_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
  };

  // INDEPENDENT FILTERING LOGIC
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Severity Filter
      const severityMatch = filterSeverity === 'All' || log.severity.toLowerCase() === filterSeverity.toLowerCase();
      
      // 2. Search Term (Event ID or User)
      const search = (searchEventId || '').toLowerCase().trim();
      const eventIdMatch = !search || log.event_id.toString().includes(search);
      const userMatch = !search || log.user.toLowerCase().includes(search);
      
      // 3. Stat Card Filter
      const statMatch = !filterEventId || log.event_id.toString() === filterEventId.toString();
      
      return severityMatch && (eventIdMatch || userMatch) && statMatch;
    });
  }, [logs, filterSeverity, searchEventId, filterEventId]);

  const groupedLogs = useMemo(() => {
    const grouped = [];
    if (filteredLogs.length === 0) return grouped;
    let currentGroup = { ...filteredLogs[0], count: 1 };
    for (let i = 1; i < filteredLogs.length; i++) {
      const log = filteredLogs[i];
      const isMatch = log.event_id === currentGroup.event_id && log.computer === currentGroup.computer && log.user === currentGroup.user && log.isAcknowledged === currentGroup.isAcknowledged;
      if (isMatch) {
        currentGroup.count += 1;
      } else {
        grouped.push(currentGroup);
        currentGroup = { ...log, count: 1 };
      }
    }
    grouped.push(currentGroup);
    return grouped;
  }, [filteredLogs]);

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
      title: 'Event ID',
      key: 'event_id',
      render: (log) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-soc-primary font-bold">{log.event_id}</span>
          {log.count > 1 && <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded border border-white/5 font-bold">x{log.count}</span>}
        </div>
      )
    },
    {
      title: 'Level',
      key: 'level',
      render: (log) => (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${log.level === 'Critical' ? 'bg-red-600 text-white' : log.level === 'Error' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : log.level === 'Warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
          {log.level}
        </span>
      )
    },
    {
      title: 'Computer',
      key: 'computer',
      render: (log) => <span className="text-xs font-mono text-gray-400">{log.computer}</span>
    },
    {
      title: 'User',
      key: 'user',
      render: (log) => <span className="text-sm text-white">{log.user}</span>
    },
    {
      title: 'Severity',
      key: 'severity',
      render: (log) => <SeverityBadge severity={log.severity} />
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (log) => (
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.1 }} 
            whileTap={{ scale: 0.9 }} 
            onClick={(e) => { 
              e.stopPropagation(); 
              setInvestigatingLog(log);
              handleAcknowledge(log.id);
            }} 
            className="p-1.5 bg-soc-primary/10 text-soc-primary rounded-md hover:bg-soc-primary/20 transition-colors"
            title="Investigate"
          >
            <Info size={14} />
          </motion.button>
        </div>
      )
    }
  ];

  const getInvestigationTip = (eventId) => {
    const id = String(eventId);
    switch (id) {
      case '4624': return { label: 'Successful Login', explanation: 'Someone successfully logged into this computer.', recommendation: 'Check if this user normally logs in at this time.' };
      case '4625': return { label: 'Failed Login', explanation: 'Someone tried to log in but failed (wrong password).', recommendation: 'If you see many of these, it could be a Brute Force attack.' };
      case '4672': return { label: 'Admin Privileges', explanation: 'A user logged in with Administrator rights.', recommendation: 'Ensure this user is actually an administrator.' };
      case '4688': return { label: 'New Process Created', explanation: 'A new program or application was started.', recommendation: 'Watch for unrecognized software starting automatically.' };
      case '1102': return { label: 'Log Cleared', explanation: 'The security logs were wiped clean.', recommendation: 'DANGER: Attackers do this to hide. Investigate immediately.' };
      case '666': return { label: 'Malicious Activity', explanation: 'The system detected a confirmed threat or virus.', recommendation: 'CRITICAL: Isolate this computer from the internet right now.' };
      default: return { label: 'System Event', explanation: `Windows recorded an activity with ID ${id}.`, recommendation: 'Review the message details to see if this is normal.' };
    }
  };

  const expandedRowRender = (log) => (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div><span className="text-gray-500">Source IP:</span><span className="ml-2 text-soc-primary font-mono">{log.ip}</span></div>
        <div><span className="text-gray-500">Timestamp:</span><span className="ml-2 text-gray-300">{log.timestamp}</span></div>
      </div>
      <div>
        <span className="text-gray-500">Message:</span>
        <p className="mt-1 text-gray-300 bg-soc-dark p-3 rounded border border-soc-border font-mono text-xs">{log.message}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {investigatingLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInvestigatingLog(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-soc-panel border border-soc-border max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-soc-primary/10 rounded-lg text-soc-primary border border-soc-primary/20"><Info size={24} /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Event Investigation</h3>
                    <p className="text-gray-400 text-xs font-mono uppercase tracking-widest">Windows Event ID: {investigatingLog.event_id}</p>
                  </div>
                </div>
                <button onClick={() => setInvestigatingLog(null)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/5"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-[#0a0a14] p-4 rounded-xl border border-soc-border/50">
                  <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest">Analysis Result</div>
                  <div className="text-soc-primary font-bold mb-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-soc-primary animate-pulse" />{getInvestigationTip(investigatingLog.event_id).label}</div>
                  <p className="text-sm text-gray-300 leading-relaxed italic">"{getInvestigationTip(investigatingLog.event_id).explanation}"</p>
                </div>
                <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                  <div className="text-[10px] uppercase font-bold text-emerald-500/70 mb-2 tracking-widest">Security Recommendation</div>
                  <div className="flex gap-2 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-emerald-200/80 font-medium">{getInvestigationTip(investigatingLog.event_id).recommendation}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setInvestigatingLog(null)} className="w-full mt-6 py-3 bg-soc-primary/10 hover:bg-soc-primary/20 text-soc-primary rounded-xl font-bold transition-all border border-soc-primary/20">Acknowledge & Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(loading || error || isClearing) && (
        <div className="flex gap-4">
          {(loading || isClearing) && <div className="flex items-center gap-2 text-soc-primary text-xs font-medium animate-pulse"><Monitor size={14} /> {isClearing ? 'Purging logs...' : 'Syncing events...'}</div>}
          {error && <div className="flex items-center gap-2 text-red-400 text-xs font-medium"><AlertTriangle size={14} /> {error}</div>}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30"><Monitor size={24} className="text-blue-400" /></div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">Windows Security Logs</h1>
                {filterHost && (
                  <div className={`flex items-center gap-2 px-2 py-1 rounded-md border ${
                    onlineNodes.some(n => n.hostname === filterHost && n.status === 'online')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <Monitor size={14} />
                    <span className="text-xs font-bold font-mono uppercase tracking-tighter">
                      {onlineNodes.some(n => n.hostname === filterHost && n.status === 'online') ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm">Real-time event analysis for <span className="text-blue-400 font-bold">{filterHost || 'All Connected Nodes'}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-soc-panel/50 p-1 rounded-xl border border-soc-border">
            <div className="pl-3 pr-1 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-r border-soc-border mr-2">Select Node</div>
            <div className="relative group">
              <select className="appearance-none bg-soc-dark border border-soc-border text-white text-sm rounded-lg pl-4 pr-10 py-2.5 cursor-pointer font-mono min-w-[180px]" value={filterHost || ''} onChange={(e) => setFilterHost(e.target.value || null)}>
                <option value="">All Online Hosts</option>
                {onlineNodes.map(node => <option key={node.hostname} value={node.hostname}>{node.hostname}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-4 bg-soc-panel/30 border border-soc-border rounded-xl backdrop-blur-sm">
          <div className="flex gap-4 items-center flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Severity</span>
              <select className="bg-soc-dark border border-soc-border text-gray-300 text-xs rounded-lg p-1.5 min-w-[120px]" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                <option value="All">All Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search Event ID or User..." className="w-full bg-soc-dark border border-soc-border text-white text-xs rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-soc-primary" value={searchEventId} onChange={(e) => setSearchEventId(e.target.value)} />
            </div>
            <AnimatePresence>
              {(filterHost || filterEventId || searchEventId) && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex gap-2">
                  <div className="h-6 w-[1px] bg-soc-border mx-2" />
                  {filterHost && <button onClick={() => setFilterHost(null)} className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-400 font-bold hover:bg-blue-500/20 transition-all flex items-center gap-1.5">HOST: {filterHost} <X size={12} /></button>}
                  {(filterEventId || searchEventId) && <button onClick={() => { setFilterEventId(null); setSearchEventId(''); }} className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center gap-1.5">FILTER: {searchEventId || filterEventId} <X size={12} /></button>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleExportCSV} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-2"><Server size={14} />EXPORT CSV</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleClearAll} disabled={isClearing} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Trash2 size={14} />PURGE LOGS</motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 4625, desc: 'Failed Login', color: 'red' },
          { id: 4624, desc: 'Successful Login', color: 'emerald' },
          { id: 4672, desc: 'Admin Privileges', color: 'amber' },
          { id: 4688, desc: 'Process Creation', color: 'blue' }
        ].map((event) => (
          <motion.div key={event.id} onClick={() => handleStatClick(event.id)} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} className={`bg-soc-panel border rounded-lg p-4 transition-all cursor-pointer ${filterEventId === event.id ? `border-${event.color}-500 bg-${event.color}-500/10 shadow-lg` : 'border-soc-border hover:border-gray-500'}`}>
            <div className="flex justify-between items-start">
              <div className="text-2xl font-bold font-mono text-white mb-1">{event.id}</div>
              {filterEventId === event.id && <motion.div layoutId="activeDot" className={`w-2 h-2 rounded-full bg-${event.color}-500 animate-pulse`} />}
            </div>
            <div className={`text-sm ${filterEventId === event.id ? 'text-white' : `text-${event.color}-400`}`}>{event.desc}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-soc-panel border border-soc-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-soc-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              {isIdle && !loading ? (
                <span className="text-red-400 animate-pulse flex items-center gap-2">
                  <X size={16} /> No new logs received
                </span>
              ) : (
                filterEventId || searchEventId ? `Event ID ${filterEventId || searchEventId} Logs` : filterHost ? `Logs for ${filterHost}` : 'Recent Security Events'
              )}
              {filterHost && (
                <span className="text-[10px] text-gray-500 font-mono ml-2 border-l border-white/10 pl-3">
                  Last Seen: {(() => {
                    const node = onlineNodes.find(n => n.hostname === filterHost);
                    return node?.last_seen ? format(new Date(node.last_seen), 'HH:mm:ss') : 'Never';
                  })()}
                </span>
              )}
            </h3>
            {(() => {
              const node = onlineNodes.find(n => n.hostname === filterHost);
              // True Disconnect: Force red if node is offline or globally disconnected
              const isOfflineByNode = filterHost ? node?.status === 'offline' : (onlineNodes.length > 0 && onlineNodes.every(n => n.status === 'offline'));
              const timeSinceLastLog = Date.now() - lastLogTimestamp;
              const isDisconnected = isOfflineByNode || (filterHost && timeSinceLastLog > 60000);
              const isIdleActive = !isDisconnected && (timeSinceLastLog > 30000);
              
              return (
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors duration-500 ${
                  isDisconnected ? 'bg-red-500/10 border border-red-500/20' :
                  isIdleActive ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-emerald-500/10 border border-emerald-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                    isDisconnected ? 'bg-red-500' :
                    isIdleActive ? 'bg-amber-500 animate-pulse' :
                    'bg-emerald-500 animate-pulse'
                  }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 ${
                    isDisconnected ? 'text-red-400' :
                    isIdleActive ? 'text-amber-500' :
                    'text-emerald-500'
                  }`}>
                    {isDisconnected ? 'Disconnected' : isIdleActive ? 'Idle' : 'Live'}
                  </span>
                </div>
              );
            })()}
          </div>
          <span className="text-xs text-gray-500">Showing {groupedLogs.length} groups</span>
        </div>
        {groupedLogs.length > 0 ? (
          <LogTable logs={groupedLogs} columns={columns} expandedRowRender={expandedRowRender} rowClassName={(log) => {
            const classes = [];
            if (log.event_id === 666 || log.event_id === '666') classes.push('bg-red-600/20 shadow-inner border-red-500/50');
            else if (log.severity === 'critical' && log.isNew) classes.push('animate-pulse');
            if (log.isAcknowledged) classes.push('opacity-50 grayscale-[0.5] bg-gray-500/5');
            return classes.join(' ');
          }} />
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-4">
              <Search size={32} className="text-gray-500" />
            </div>
            <h4 className="text-white font-bold text-lg mb-1">No matching logs found</h4>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
            {(filterSeverity !== 'All' || searchEventId || filterEventId) && (
              <button 
                onClick={() => {
                  setFilterSeverity('All');
                  setSearchEventId('');
                  setFilterEventId(null);
                }}
                className="mt-6 px-4 py-2 bg-soc-primary/10 text-soc-primary rounded-lg text-sm font-bold border border-soc-primary/20 hover:bg-soc-primary/20 transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
