import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Play, Pause, Sparkles } from 'lucide-react';
import { Track } from '../types';

interface Props {
  track: Track;
  isPlaying: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onNext: () => void;
  onPrev: () => void;
  progress: number;
}

const MiniPlayer: React.FC<Props> = ({ track, isPlaying, onToggle, onExpand, onNext, onPrev, progress }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // 3D Stack Shift Transformations
  const rotateY = useTransform(x, [-150, 0, 150], [-25, 0, 25]);
  const translateX = useTransform(x, [-150, 0, 150], [-40, 0, 40]);
  const cardScale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95]);

  // Flip Transformations
  const rotateX = useTransform(y, [0, 150], [0, 45]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Horizontal Stack Shift (Next/Prev)
    if (info.offset.x < -80) {
      onNext();
    } else if (info.offset.x > 80) {
      onPrev();
    }

    // Vertical Flip Expand (Pull down)
    if (info.offset.y > 80) {
      setIsFlipping(true);
      setTimeout(() => {
        onExpand();
        setIsFlipping(false);
      }, 200);
    }
  };

  return (
    <div className="fixed top-2 inset-x-4 z-[100] perspective-1200 h-16 pointer-events-none max-w-3xl mx-auto">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 30 }}
        style={{ x, y, rotateY, rotateX, scale: cardScale, transformStyle: 'preserve-3d' }}
        initial={{ y: -120, opacity: 0, scale: 0.8 }}
        animate={{ 
          y: 0, 
          opacity: 1, 
          scale: 1,
          rotateY: isFlipping ? 0 : rotateY.get(),
          rotateX: isFlipping ? 180 : rotateX.get()
        }}
        exit={{ y: -120, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="pointer-events-auto w-full h-full glass-high rounded-[20px] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center px-3 sm:px-4 cursor-grab active:cursor-grabbing overflow-hidden backdrop-blur-[40px] transform-style-3d relative"
        onClick={onExpand}
      >
        {/* Neon Edge Glow pulsing with "Beat" */}
        <motion.div 
          animate={isPlaying ? { 
            opacity: [0.3, 0.6, 0.3],
            boxShadow: [
              'inset 0 0 10px rgba(59,130,246,0.2)',
              'inset 0 0 20px rgba(168,85,247,0.4)',
              'inset 0 0 10px rgba(59,130,246,0.2)'
            ]
          } : { opacity: 0.1 }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-[20px] pointer-events-none border border-white/10"
        />

        {/* Cinematic Album Art (The Rotating Vinyl) */}
        <motion.div 
          layoutId={`art-${track.id}`}
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={isPlaying ? { duration: 10, repeat: Infinity, ease: 'linear' } : { duration: 1 }}
          className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-2xl border-2 border-white/20 z-10 bg-black"
          style={{ transform: 'translateZ(20px)' }}
        >
          <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
        </motion.div>

        {/* Info */}
        <div className="ml-3 flex-1 overflow-hidden z-10 flex flex-col justify-center" style={{ transform: 'translateZ(10px)' }}>
          <div className="flex items-center gap-1.5">
             <motion.h4 
              layoutId={`title-${track.id}`}
              className="font-black text-xs sm:text-[13px] truncate tracking-tight text-white font-outfit leading-tight"
            >
              {track.title}
            </motion.h4>
            <Sparkles size={10} className="text-blue-400 opacity-60 shrink-0" />
          </div>
          <motion.p 
            layoutId={`artist-${track.id}`}
            className="text-[9px] sm:text-[10px] text-white/50 font-black uppercase tracking-[0.1em] truncate leading-tight"
          >
            {track.artist}
          </motion.p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 z-10 ml-2" onClick={(e) => e.stopPropagation()}>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, translateZ: -10 }}
            onClick={onToggle}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 shadow-lg transform-style-3d active:bg-white/20"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </motion.button>
        </div>
        
        {/* Floating progress marker */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
          <motion.div 
            initial={false}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
          />
        </div>

        {/* Depth Overlay (Shadow Cast Downward) */}
        <div className="absolute -bottom-8 left-4 right-4 h-6 bg-black/60 blur-xl opacity-40 pointer-events-none rounded-full" />
      </motion.div>

      {/* Stack Hint (Background Cards) */}
      <div className="absolute top-1 left-2 right-2 -z-10 h-full glass-high rounded-[20px] border border-white/5 opacity-20 scale-[0.98] transform -translate-z-10" />
      <div className="absolute top-2 left-4 right-4 -z-20 h-full glass rounded-[20px] opacity-10 scale-[0.95] transform -translate-z-20" />
    </div>
  );
};

export default MiniPlayer;