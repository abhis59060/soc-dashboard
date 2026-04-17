import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { getTimeline } from '../../api';

const COLORS = ['#00d4ff', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];

export const AlertChart = ({ timeline = [], severityStats = { high: 0, medium: 0, low: 0 } }) => {
  const [activeChart, setActiveChart] = useState('timeline');
  const [distribution, setDistribution] = useState([
    { name: 'High', value: 0, color: '#ef4444' },
    { name: 'Medium', value: 0, color: '#f59e0b' },
    { name: 'Low/Info', value: 0, color: '#00d4ff' }
  ]);

  useEffect(() => {
    setDistribution([
      { name: 'High', value: severityStats.high || 0, color: '#ef4444' },
      { name: 'Medium', value: severityStats.medium || 0, color: '#f59e0b' },
      { name: 'Low/Info', value: severityStats.low || 0, color: '#00d4ff' }
    ]);
  }, [severityStats]);

  // Transform timeline for display
  const chartData = timeline.map(t => ({
    hour: t.time,
    total: t.total,
    high: t.high,
    normal: Math.max(0, t.total - t.high)
  }));
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-soc-panel border border-soc-border rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-white capitalize">{entry.name}:</span>
              <span className="font-mono font-bold" style={{ color: entry.color }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-soc-panel border border-soc-border rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Alert Analytics (Windows Security)</h3>
        <div className="flex gap-2">
          {['timeline', 'distribution'].map((type) => (
            <button
              key={type}
              onClick={() => setActiveChart(type)}
              className={`
                px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${activeChart === type 
                  ? 'bg-soc-primary/20 text-soc-primary border border-soc-primary/30' 
                  : 'bg-soc-darker text-gray-400 border border-soc-border hover:text-white'}
              `}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === 'timeline' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
              <XAxis 
                dataKey="hour" 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="high" 
                stroke="#ef4444" 
                fill="url(#colorHigh)" 
                name="High Severity"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="normal" 
                stroke="#00d4ff" 
                fill="url(#colorNormal)" 
                name="Normal Activity"
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {activeChart === 'distribution' && (
        <div className="flex justify-center gap-4 mt-4">
          {distribution.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-400">{item.name}</span>
              <span className="text-xs font-mono text-white">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};