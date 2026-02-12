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

  // 1. Drag Limits: Adjusted to feel more natural for chat
  const dragConstraints = isMe ? { left: -100, right: 0 } : { left: 0, right: 100 };

  // 2. Icon Transformations
  const opacity = useTransform(x, isMe ? [0, -60] : [0, 60], [0, 1]);
  const scale = useTransform(x, isMe ? [0, -60] : [0, 60], [0.5, 1.1]);
  
  // Icon follows the drag slightly but stops at a fixed point
  const iconX = useTransform(x, isMe ? [0, -100] : [0, 100], isMe ? [15, 0] : [-15, 0]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const threshold = 60;

    const shouldReply = isMe ? offset < -threshold : offset > threshold;

    if (shouldReply) {
      onReply();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }

    await controls.start({ 
      x: 0, 
      transition: { type: 'spring', stiffness: 500, damping: 40 } 
    });
  };

  return (
    // Added px-1 to ensure messages don't touch screen edges during swipe
    <div className="relative w-full flex items-center px-1 overflow-visible">
      
      {/* --- BACKGROUND REPLY ICON --- */}
      {/* Absolute positioning fixed to stay consistent regardless of bubble size */}
      <div 
        className={`absolute inset-y-0 flex items-center pointer-events-none ${
          isMe ? 'right-6' : 'left-6'
        }`}
      >
        <motion.div 
          style={{ opacity, scale, x: iconX }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-xl ${
            isMe ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'
          } border border-white/10`}
        >
          <Reply size={20} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* --- DRAGGABLE CONTENT --- */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.12} // Increased resistance for a "premium" feel
        onDragEnd={handleDragEnd}
        animate={controls}
        whileDrag={{ cursor: 'grabbing' }}
        style={{ x, touchAction: 'pan-y' }}
        // Important: w-full and flex ensures children (the bubbles) maintain their isMe alignment
        className="z-10 relative w-full flex flex-col"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
