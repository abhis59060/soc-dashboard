import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

export const StatCard = ({ title, value, icon: Icon, color, trend, trendUp, delay = 0, ...props }) => {
  const animatedValue = useAnimatedNumber(value);
  
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      {...props}
      className={`
        relative overflow-hidden rounded-xl border bg-gradient-to-br p-6
        ${colorClasses[color] || colorClasses.blue}
        ${props.onClick ? 'cursor-pointer' : ''}
        ${props.className || ''}
      `}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <Icon size={24} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {trend}
            </div>
          )}
        </div>
        
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-white font-mono">
          {animatedValue.toLocaleString()}
        </div>
      </div>
    </motion.div>
  );
};