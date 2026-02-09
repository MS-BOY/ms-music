
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  useEffect(() => {
    // Reduced splash time to a minimal feel as per user request to remove 'one-hour' (perceived long) timer
    const timer = setTimeout(onFinish, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#050505] perspective-[1000px]">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotateX: 20 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          rotateX: 0,
          y: [0, -20, 0]
        }}
        transition={{ 
          scale: { duration: 0.8, ease: "easeOut" },
          opacity: { duration: 0.6 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="flex flex-col items-center relative"
      >
        <div className="relative group">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 blur-[50px] bg-blue-600 rounded-full" 
          />
          <motion.div 
            animate={{ rotateY: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="relative glass-high w-32 h-32 rounded-[32px] flex items-center justify-center border border-white/20 shadow-[0_0_50px_rgba(59,130,246,0.3)] backdrop-blur-3xl transform-style-3d"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[32px] pointer-events-none" />
             <Music size={64} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
          </motion.div>
        </div>
        
        <motion.h1 
          initial={{ opacity: 0, letterSpacing: '10px' }}
          animate={{ opacity: 1, letterSpacing: '0px' }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="mt-12 text-6xl font-black font-outfit text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-purple-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]"
        >
          MS
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-2 text-sm tracking-[0.5em] uppercase font-bold text-blue-200"
        >
          Music Reimagined
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
