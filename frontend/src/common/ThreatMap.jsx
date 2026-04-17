import { motion } from 'framer-motion';
import { MapPin, Activity } from 'lucide-react';

export const ThreatMap = ({ threats }) => {
  return (
    <div className="relative h-64 bg-soc-darker rounded-lg overflow-hidden border border-soc-border">
      {/* World Map Background - Simplified Grid */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      
      {/* Animated Radar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-soc-primary/20"
              animate={{
                scale: [1, 2, 2],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut"
              }}
            />
          ))}
          <div className="absolute inset-0 rounded-full border-2 border-soc-primary/30" />
          <motion.div
            className="absolute inset-0 rounded-full border-t-2 border-soc-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
      
      {/* Threat Points */}
      {threats?.slice(0, 5).map((threat, index) => (
        <motion.div
          key={index}
          className="absolute"
          style={{
            left: `${20 + (index * 15)}%`,
            top: `${30 + (index % 2) * 30}%`
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.2, type: "spring" }}
        >
          <div className="relative">
            <motion.div
              className="w-3 h-3 rounded-full bg-red-500"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(239, 68, 68, 0.4)',
                  '0 0 0 20px rgba(239, 68, 68, 0)',
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="bg-soc-panel border border-soc-border rounded px-2 py-1 text-xs">
                <div className="flex items-center gap-1 text-red-400">
                  <MapPin size={10} />
                  {threat.ip}
                </div>
                <div className="text-gray-400 text-[10px]">{threat.threat}</div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Stats Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-soc-primary animate-pulse" />
          <span className="text-gray-400">Active Threats:</span>
          <span className="text-white font-mono">{threats?.length || 0}</span>
        </div>
        <div className="text-gray-500">Live Tracking</div>
      </div>
    </div>
  );
};