import React from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Reply } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onReply: () => void;
  isMe: boolean;
}

const SwipeableMessage: React.FC<Props> = ({ children, onReply, isMe }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);

  // 1. Drag Limits: How far the bubble can actually move
  const dragConstraints = isMe ? { left: -120, right: 0 } : { left: 0, right: 120 };

  // 2. Icon Transformations
  // Icon becomes visible and scales up as we pull
  const opacity = useTransform(x, isMe ? [0, -60] : [0, 60], [0, 1]);
  const scale = useTransform(x, isMe ? [0, -60] : [0, 60], [0.5, 1.2]);
  
  // Icon moves slightly with the drag for a "pulling" effect
  const iconX = useTransform(x, isMe ? [0, -100] : [0, 100], isMe ? [20, 0] : [-20, 0]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const threshold = 60; // Point where reply is triggered

    const shouldReply = isMe ? offset < -threshold : offset > threshold;

    if (shouldReply) {
      onReply();
      // Physical haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }

    // Snap back with a high-quality spring
    await controls.start({ 
      x: 0, 
      transition: { type: 'spring', stiffness: 600, damping: 35 } 
    });
  };

  return (
    <div className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
      {/* --- BACKGROUND REPLY ICON --- */}
      <div 
        className={`absolute top-0 bottom-0 flex items-center ${
          isMe ? 'right-0 pr-8' : 'left-0 pl-8'
        }`}
      >
        <motion.div 
          style={{ opacity, scale, x: iconX }}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg backdrop-blur-xl ${
            isMe ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'
          } border border-white/10`}
        >
          <Reply size={18} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* --- DRAGGABLE CONTENT --- */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.15} // Resistance feel
        onDragEnd={handleDragEnd}
        animate={controls}
        whileDrag={{ cursor: 'grabbing' }}
        style={{ x, touchAction: 'pan-y' }}
        className="z-10 relative w-full flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
