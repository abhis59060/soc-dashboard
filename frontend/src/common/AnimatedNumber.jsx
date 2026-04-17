import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { motion } from 'framer-motion';

export const AnimatedNumber = ({ value, prefix = '', suffix = '', className = '' }) => {
  const animatedValue = useAnimatedNumber(value);
  
  return (
    <motion.span 
      className={`font-mono ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{animatedValue.toLocaleString()}{suffix}
    </motion.span>
  );
};