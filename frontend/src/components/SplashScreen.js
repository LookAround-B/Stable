import React, { useEffect, useState } from 'react';
import { ShaderAnimation } from './ShaderAnimation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SplashScreen — Full-screen intro with shader background + loading bar.
 * Shows for 4 seconds on first visit, then fades out and calls onFinish.
 */
export default function SplashScreen({ onFinish }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 1000); // Wait for fade-out animation
    }, 4000); // Show for 4 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Shader Animation Background */}
          <div className="absolute inset-0 z-0">
            <ShaderAnimation />
          </div>

          {/* Logo / Text Overlay */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="relative z-10 text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-foreground uppercase mb-2 drop-shadow-lg">
              EFM
            </h1>
            <div className="h-[2px] w-24 bg-primary mx-auto mb-4 blur-[1px]" />
            <p className="text-xs md:text-sm tracking-[0.5em] text-muted-foreground uppercase opacity-80 font-mono">
              Systems Initializing...
            </p>
          </motion.div>

          {/* Loading Indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 w-48">
            <div className="h-[1px] w-full bg-white/10 relative overflow-hidden">
              <motion.div
                initial={{ left: '-100%' }}
                animate={{ left: '100%' }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
