import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  Shield, 
  Server, 
  Clock,
  FileWarning,
  Loader2,
  Wifi,
  WifiOff,
  Skull,
  X,
  Trash2
} from 'lucide-react';
import { StatCard } from './StatCard';
import { AlertChart } from './AlertChart';
import { LogTimeline } from './LogTimeline';
import { ThreatMap } from '../../common/ThreatMap';
import { HostModal } from '../../common/HostModal';
import { getStats, getLogs, getAgents, getNetworkHealth, getNodes, getTimeline, purgeData } from '../../api';

import { useAlerts } from '../../context/AlertContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { refreshAllData } = useAlerts();
  const [stats, setStats] = useState({
    totalLogs: 0,
    highAlerts: 0,
    mediumAlerts: 0,
    lowAlerts: 0,
    windowsEvents: 0,
    last24h: 0
  });
  const [chartData, setChartData] = useState({
    alertsByHour: [],
    osDistribution: [],
    topThreatIPs: []
  });
  const [agents, setAgents] = useState([]);
  const [onlineNodes, setOnlineNodes] = useState(0);
  const [totalNodes, setTotalNodes] = useState(0);
  const [networkHealth, setNetworkHealth] = useState({ status: 'secure', cpu: 0, memory: 0 });
  const [timeline, setTimeline] = useState([]);
  const [globalAlert, setGlobalAlert] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPurging, setIsPurging] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);
  const [hostLogs, setHostLogs] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Audio Feedback
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (err) {
      console.error("Audio playback failed:", err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Individual try-catches to ensure one failure doesn't break the whole dashboard
      try {
        const statsData = await getStats();
        if (statsData) {
          setStats({
            totalLogs: statsData.total_logs,
            highAlerts: statsData.severity_breakdown?.high || 0,
            mediumAlerts: statsData.severity_breakdown?.medium || 0,
            lowAlerts: statsData.severity_breakdown?.low || 0,
            windowsEvents: statsData.os_breakdown?.windows || 0,
            last24h: statsData.total_logs
          });

          if (statsData.top_threat_actors) {
            setChartData(prev => ({
              ...prev,
              topThreatIPs: statsData.top_threat_actors.map(actor => ({
                ip: actor.host,
                count: actor.count,
                os: actor.os,
                country: actor.host,
                threat: 'Security Events',
                is_malicious: actor.is_malicious
              }))
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }

      try {
        const nodesData = await getNodes();
        if (nodesData && nodesData.hosts) {
          // Filter out dummy nodes
          const realHosts = nodesData.hosts.filter(h => 
            h.hostname && 
            !["SYSTEM-ANALYST", "SYSTEM", "ANALYST"].includes(h.hostname.toUpperCase()) &&
            !h.hostname.toUpperCase().includes("SYSTEM") &&
            !h.hostname.toUpperCase().includes("ANALYST") &&
            (h.os === 'windows')
          );
          
          setAgents(realHosts);
          setOnlineNodes(realHosts.filter(h => h.status === 'online').length);
          setTotalNodes(realHosts.length);
        } else {
          setAgents([]);
          setOnlineNodes(0);
          setTotalNodes(0);
        }
      } catch (err) {
        console.error("CRITICAL: Failed to fetch node stats:", err.message);
      }

      try {
        const healthData = await getNetworkHealth();
        if (healthData) {
          setNetworkHealth(healthData);
          setGlobalAlert(healthData.global_alert);
          
          // Trigger audio if new high alerts detected
          if (healthData.high_alerts_5m > 0) {
            playAlertSound();
          }
        }
      } catch (err) {
        console.error("Failed to fetch network health:", err);
      }

      try {
        const timelineData = await getTimeline();
        if (timelineData && timelineData.timeline) {
          setTimeline(timelineData.timeline);
        }
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
      }

      setError(null);
    } catch (error) {
      console.error("Dashboard fetch loop error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async () => {
    if (window.confirm("CRITICAL: This will delete all logs, alerts, and reset all system statistics. Are you sure?")) {
      setIsPurging(true);
      try {
        await purgeData();
        
        // Reset local state immediately
        setStats({
          totalLogs: 0,
          highAlerts: 0,
          mediumAlerts: 0,
          lowAlerts: 0,
          windowsEvents: 0,
          last24h: 0
        });
        setAgents([]);
        setOnlineNodes(0);
        setTotalNodes(0);
        setTimeline([]);
        setChartData({
          alertsByHour: [],
          osDistribution: [],
          topThreatIPs: []
        });

        // Fetch fresh data from backend
        await fetchDashboardData();
        
      } catch (err) {
        console.error("Purge failed:", err);
        alert("Failed to purge system data.");
      } finally {
        setIsPurging(false);
      }
    }
  };

  const handleHostClick = async (hostInfo) => {
    setSelectedHost(hostInfo);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const response = await getLogs({ host: hostInfo.ip || hostInfo.hostname, limit: 10 });
      setHostLogs(response.logs || []);
    } catch (err) {
      console.error("Failed to fetch host logs:", err);
      setHostLogs([]);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); 
    return () => clearInterval(interval);
  }, []);
  
  if (loading && stats.totalLogs === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-soc-primary">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Initializing SOC Dashboard...</h2>
        <p className="text-gray-400 text-sm mt-2">Connecting to secure API endpoints</p>
      </div>
    );
  }

  // Health Score calculation
  const healthScore = Math.max(0, 100 - (agents.length - onlineNodes) * 20 - (stats.highAlerts > 0 ? 10 : 0));
  const healthColor = networkHealth.status === 'danger' ? 'red' : networkHealth.status === 'warning' ? 'amber' : 'emerald';

  return (
    <div className="space-y-6">
      {/* Global Network Alert Modal */}
      <AnimatePresence>
        {globalAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-red-950/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-lg w-full bg-red-600 rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] border-2 border-white/20"
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Skull size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Global Network Threat</h2>
              <p className="text-red-100 mb-8 font-medium">Multiple hosts are reporting critical security events. Potential lateral movement or coordinated attack detected.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/alerts')}
                  className="w-full py-4 bg-white text-red-600 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors shadow-lg"
                >
                  Initiate Lock Down
                </button>
                <button
                  onClick={() => setGlobalAlert(false)}
                  className="w-full py-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  Dismiss Warning (Acknowledge Risk)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Details Modal */}
      <HostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        hostData={selectedHost}
        logs={hostLogs}
        loading={modalLoading}
      />

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Security Operations Center</h1>
          <p className="text-gray-400 text-sm">Monitoring {agents.length} Node Cluster • Real-time Threat Response</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 bg-${healthColor}-500/10 border border-${healthColor}-500/20 rounded-lg flex items-center gap-2`}>
            <span className={`w-2 h-2 rounded-full bg-${healthColor}-500 ${networkHealth.status !== 'secure' ? 'animate-ping' : 'animate-pulse'}`} />
            <span className={`text-xs font-bold text-${healthColor}-500 uppercase tracking-widest`}>
              {networkHealth.status === 'secure' ? 'Network Secure' : networkHealth.status === 'warning' ? 'Alert Active' : 'Breach Warning'}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePurge}
            disabled={isPurging}
            className="px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-500 rounded-lg text-sm font-bold hover:bg-red-600/30 transition-colors flex items-center gap-2"
          >
            {isPurging ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Purge Data
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-soc-primary/10 border border-soc-primary/30 text-soc-primary rounded-lg text-sm font-medium hover:bg-soc-primary/20 transition-colors flex items-center gap-2"
          >
            <FileWarning size={16} />
            Export Audit
          </motion.button>
        </div>
      </motion.div>
      
      {/* Network Nodes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent Summary List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-soc-panel border border-soc-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Server size={16} className="text-soc-primary" />
                Network Nodes
              </h3>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-mono">
                {onlineNodes}/{totalNodes || agents.length} Online
              </span>
            </div>
            
            <div className="space-y-2">
              {agents.map((agent) => (
                <div 
                  key={agent.hostname}
                  onClick={() => handleHostClick(agent)}
                  className={`
                    p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all group
                    ${agent.status === 'online' 
                      ? 'bg-soc-darker border-soc-border hover:border-soc-primary/50' 
                      : 'bg-red-500/5 border-red-500/20 opacity-70 hover:opacity-100'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                      ${agent.status === 'online' ? 'bg-soc-primary/10 text-soc-primary' : 'bg-red-500/10 text-red-400'}
                    `}>
                      {agent.os === 'windows' ? 'W' : 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono">{agent.hostname}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        {agent.status === 'online' ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-red-500" />}
                        {agent.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold font-mono ${agent.alert_count > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {agent.alert_count || 0}
                    </div>
                    <div className="text-[8px] uppercase font-black text-gray-600">Alerts</div>
                  </div>
                </div>
              ))}
              {agents.length === 0 && (
                <div className="py-8 text-center border border-dashed border-soc-border rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase font-bold text-center w-full">No active agents</p>
                </div>
              )}
            </div>
          </div>

          <div className={`bg-gradient-to-br from-${healthColor}-500/20 to-soc-darker border border-${healthColor}-500/30 rounded-xl p-4 transition-colors duration-500`}>
            <h3 className={`text-xs font-black text-${healthColor}-500 uppercase tracking-widest mb-3`}>Cluster Health</h3>
            <div className="flex items-end gap-2 mb-1">
              <div className="text-3xl font-black text-white font-mono">{healthScore}%</div>
              <div className={`text-[10px] text-${healthColor}-500 font-bold mb-1 uppercase`}>
                {networkHealth.status === 'secure' ? 'Stable' : networkHealth.status === 'warning' ? 'Degraded' : 'Critical'}
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                className={`h-full bg-${healthColor}-500`}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Stats and Charts */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Logs"
              value={stats.totalLogs}
              icon={Server}
              color="blue"
              trend="+12.5%"
              trendUp={true}
              delay={0}
              onClick={() => navigate('/windows')}
            />
            <StatCard
              title="High Severity Alerts"
              value={stats.highAlerts}
              icon={AlertTriangle}
              color="red"
              trend="+5"
              trendUp={false}
              delay={0.1}
              onClick={() => navigate('/windows')}
            />
            <StatCard
              title="Medium Alerts"
              value={stats.mediumAlerts}
              icon={Shield}
              color="amber"
              trend="-3"
              trendUp={true}
              delay={0.2}
              onClick={() => navigate('/windows')}
            />
            <StatCard
              title="Last 24h Events"
              value={stats.last24h}
              icon={Clock}
              color="purple"
              trend="+8.2%"
              trendUp={true}
              delay={0.3}
              onClick={() => navigate('/windows')}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AlertChart 
                timeline={timeline} 
                severityStats={{
                  high: stats.highAlerts,
                  medium: stats.mediumAlerts,
                  low: stats.lowAlerts
                }}
              />
            </div>
            <div className="lg:col-span-1">
              <LogTimeline />
            </div>
          </div>
        </div>
      </div>
      
      {/* Threat Map & OS Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-soc-panel border border-soc-border rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Global Threat Map</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live Tracking
            </div>
          </div>
          <ThreatMap threats={chartData.topThreatIPs} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-soc-panel border border-soc-border rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Top Threat Actors</h3>
          <div className="space-y-3">
            {chartData.topThreatIPs.map((threat, index) => (
              <motion.div
                key={threat.ip}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 group relative overflow-hidden ${
                  threat.is_malicious 
                    ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                    : 'bg-soc-darker border-soc-border hover:border-red-500/30'
                }`}
              >
                {threat.is_malicious && (
                  <motion.div 
                    className="absolute inset-0 bg-red-500/5"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                    threat.is_malicious ? 'bg-red-600 text-white animate-pulse' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleHostClick(threat)}
                        className={`text-sm font-bold font-mono transition-colors text-left ${
                          threat.is_malicious ? 'text-red-400' : 'text-white hover:text-soc-primary'
                        }`}
                      >
                        {threat.ip}
                      </button>
                      {threat.is_malicious && (
                        <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter animate-bounce">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{threat.country} • {threat.threat}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-400 font-mono">{threat.count}</div>
                  <div className="text-xs text-gray-500">attempts</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
