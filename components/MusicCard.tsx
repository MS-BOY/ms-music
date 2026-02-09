import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Track } from '../types';
import { Play } from 'lucide-react';

interface Props {
  track: Track;
  index: number;
  onClick: () => void;
}

const MusicCard: React.FC<Props> = ({ track, index, onClick }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Heavier, smoother springs for a premium weighted feel
  const springConfig = { stiffness: 250, damping: 25 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  // More subtle tilt for elegance
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-12, 12]);
  
  // Cinematic sheen transitions
  const sheenX = useTransform(mouseX, [-0.5, 0.5], ["-100%", "100%"]);
  const sheenY = useTransform(mouseY, [-0.5, 0.5], ["-100%", "100%"]);

  // Springs for depth scaling
  const translateZ = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);
  
  const metadataZ = useTransform(translateZ, [0, 40], [0, 20]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = event.clientX - rect.left;
    const mouseYPos = event.clientY - rect.top;
    
    const xPct = mouseXPos / width - 0.5;
    const yPct = mouseYPos / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
    translateZ.set(30);
    scale.set(1.02);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    translateZ.set(0);
    scale.set(1);
  }

  return (
    <motion.div
      layout // Enable shared layout animation
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1]
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        scale,
        transformStyle: "preserve-3d",
      }}
      className="relative w-44 sm:w-52 shrink-0 group cursor-pointer perspective-1200 will-change-transform"
    >
      <div className="relative glass p-4 rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden transform-style-3d bg-white/[0.02] backdrop-blur-2xl transition-colors duration-500 group-hover:bg-white/[0.04] group-hover:border-white/20">
        
        {/* Dynamic Inner Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-colors duration-500 pointer-events-none" />
        
        {/* Cinematic Sheen Effect */}
        <motion.div 
          style={{ 
            translateX: sheenX,
            translateY: sheenY
          }}
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.07] to-transparent pointer-events-none skew-x-12"
        />

        {/* 3D Album Art Frame */}
        <motion.div 
          style={{ translateZ: translateZ }}
          className="relative aspect-square w-full rounded-[24px] overflow-hidden shadow-2xl transition-all duration-300 group-hover:shadow-blue-500/30"
        >
          <img 
            src={track.albumArt} 
            alt={track.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform" 
          />
          
          {/* Overlay Play State */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-lg"
            >
              <Play fill="white" size={24} className="text-white ml-1" />
            </motion.div>
          </div>
        </motion.div>
        
        {/* Metadata with Layered Depth */}
        <motion.div 
          style={{ translateZ: metadataZ }}
          className="mt-5 px-1 space-y-1"
        >
          <h4 className="font-bold text-sm truncate text-white drop-shadow-md font-outfit tracking-wide">{track.title}</h4>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate group-hover:text-blue-400 transition-colors">
            {track.artist}
          </p>
        </motion.div>

        {/* Floating Shadow for Depth */}
        <div className="absolute -bottom-8 left-4 right-4 h-4 bg-black/40 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </motion.div>
  );
};

export default MusicCard;