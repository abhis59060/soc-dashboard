import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { SeverityBadge } from '../../common/SeverityBadge';
import { Shield, MapPin, Server, Clock } from 'lucide-react';

export const AlertCard = ({ alert, index, onDismiss }) => {
  const osColors = {
    windows: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-soc-panel border ${alert.is_priority ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-soc-border'} rounded-xl p-5 hover:border-red-500/30 transition-all group relative overflow-hidden`}
    >
      {alert.is_priority && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg animate-pulse z-10">
          Priority
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg border
            ${osColors.windows}
          `}>
            <Shield size={20} />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1 group-hover:text-soc-primary transition-colors">
              {alert.title}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-2">{alert.description}</p>
          </div>
        </div>
        <SeverityBadge severity={alert.severity} />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <MapPin size={14} className="text-soc-primary" />
          <span className="font-mono text-white">{alert.source_ip}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Server size={14} className="text-soc-primary" />
          <span>{alert.target}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={14} className="text-soc-primary" />
          <span>{format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400">
            Windows
          </span>
          {alert.count && (
            <span className="text-red-400 font-mono font-bold">
              {alert.count} attempts
            </span>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-soc-border flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
        >
          Investigate
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 py-2 bg-soc-darker border border-soc-border text-gray-400 rounded-lg text-xs font-medium hover:text-white hover:border-soc-primary transition-colors"
        >
          Whitelist IP
        </motion.button>
        <motion.button
          onClick={onDismiss}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 py-2 bg-soc-darker border border-soc-border text-gray-400 rounded-lg text-xs font-medium hover:text-white hover:border-soc-primary transition-colors"
        >
          Dismiss
        </motion.button>
      </div>
    </motion.div>
  );
};