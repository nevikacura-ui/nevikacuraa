import React from 'react';
import { motion } from 'framer-motion';

// Page transition wrapper with smooth animation
const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{
        type: 'tween',
        ease: 'easeInOut',
        duration: 0.3
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

// Fade In animation for sections
export const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Scale In for cards and buttons
export const ScaleIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger children animation
export const StaggerContainer = ({ children, staggerDelay = 0.08, className = '' }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className = '' }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 15 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export { AnimatedPage };
export default AnimatedPage;
