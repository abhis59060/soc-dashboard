import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Info, AlertCircle } from 'lucide-react';

const severityConfig = {
  critical: {
    color: 'text-white',
    bg: 'bg-red-600',
    border: 'border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]',
    icon: AlertCircle,
  },
  high: {
    color: 'text-orange-100',
    bg: 'bg-orange-600/80',
    border: 'border-orange-500/50',
    icon: AlertTriangle,
  },
  medium: {
    color: 'text-amber-100',
    bg: 'bg-amber-500/40',
    border: 'border-amber-400/30',
    icon: Shield,
  },
  low: {
    color: 'text-emerald-100',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    icon: Info,
  },
  info: {
    color: 'text-blue-100',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    icon: Info,
  }
};

export const SeverityBadge = ({ severity, showIcon = true, animate = true }) => {
  const sev = severity?.toLowerCase() || 'info';
  const config = severityConfig[sev] || severityConfig.info;
  const Icon = config.icon;

  const content = (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase
      ${config.bg} ${config.color} ${config.border} border
    `}>
      {showIcon && <Icon size={12} className={sev === 'critical' || sev === 'high' ? 'animate-pulse' : ''} />}
      {severity?.toUpperCase() || 'INFO'}
    </span>
  );
  
  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {content}
      </motion.div>
    );
  }
  
  return content;
};