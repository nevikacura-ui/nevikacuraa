import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -10,
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25
};

export const PageTransition = ({ children }) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
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

// Slide In from left
export const SlideInLeft = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Slide In from right
export const SlideInRight = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.35, delay, ease: 'easeOut' }}
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

export default PageTransition;
