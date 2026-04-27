import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { SeverityBadge } from '../../common/SeverityBadge';
import { Shield, MapPin, Server, Clock, AlertCircle } from 'lucide-react';

export const AlertCard = ({ alert, index, onDismiss, onInvestigate }) => {
  const isCriticalThreat = alert.event_id === 666 || alert.event_id === '666';
  const isFailedLogin = alert.event_id === 4625 || alert.event_id === '4625';
  
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { delay: index * 0.05 }
    },
    exit: { 
      opacity: 0, 
      x: 100,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      whileHover={{ scale: 1.01 }}
      className={`
        bg-soc-panel border rounded-xl p-5 transition-all group relative overflow-hidden
        ${isCriticalThreat 
          ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-500/5' 
          : 'border-soc-border hover:border-soc-primary/30'}
      `}
    >
      {/* Flashing Badge for Critical Threats */}
      {isCriticalThreat && (
        <motion.div 
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute top-0 right-0 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl z-10 flex items-center gap-1.5"
        >
          <AlertCircle size={12} />
          Critical Threat
        </motion.div>
      )}

      {/* Warning Badge for Failed Logins */}
      {!isCriticalThreat && isFailedLogin && (
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-500/20 text-amber-500 border-l border-b border-amber-500/30 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl z-10">
          Security Warning
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className={`
            p-3 rounded-xl border
            ${isCriticalThreat ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
          `}>
            <Shield size={24} className={isCriticalThreat ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-lg group-hover:text-soc-primary transition-colors leading-tight">
                {alert.title}
              </h3>
              <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-gray-500 border border-white/5">
                ID: {alert.event_id || 'SEC'}
              </span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2 font-medium leading-relaxed">
              {alert.description}
            </p>
          </div>
        </div>
        <div className="pt-1">
          <SeverityBadge severity={alert.severity} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs bg-black/20 p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-2.5 text-gray-400">
          <div className="w-6 h-6 rounded bg-soc-primary/10 flex items-center justify-center">
            <MapPin size={14} className="text-soc-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600 tracking-tighter">Source IP</div>
            <span className="font-mono text-white font-bold">{alert.source_ip}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-gray-400">
          <div className="w-6 h-6 rounded bg-soc-primary/10 flex items-center justify-center">
            <Server size={14} className="text-soc-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600 tracking-tighter">Target Host</div>
            <span className="font-bold text-white uppercase">{alert.target}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-gray-400">
          <div className="w-6 h-6 rounded bg-soc-primary/10 flex items-center justify-center">
            <Clock size={14} className="text-soc-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600 tracking-tighter">Detected At</div>
            <span className="text-gray-300 font-medium">{format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-soc-primary/10 flex items-center justify-center">
            <AlertCircle size={14} className="text-soc-primary" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-600 tracking-tighter">Activity</div>
            <span className={alert.count > 5 ? 'text-red-400 font-bold' : 'text-gray-300 font-medium'}>
              {alert.count || 1} Occurrences
            </span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-soc-border flex gap-3">
        <motion.button
          onClick={() => onInvestigate(alert)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-2.5 bg-soc-primary/10 border border-soc-primary/30 text-soc-primary rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-soc-primary/20 transition-all"
        >
          Investigate
        </motion.button>
        <motion.button
          onClick={onDismiss}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-2.5 bg-soc-darker border border-soc-border text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
        >
          Dismiss
        </motion.button>
      </div>
    </motion.div>
  );
};