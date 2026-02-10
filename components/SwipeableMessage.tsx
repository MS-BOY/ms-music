import React, { useRef } from 'react';
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
  const isDragging = useRef(false);

  // Drag limits: Mobile users usually prefer shorter swipe distances
  const dragThreshold = 60;
  const dragConstraints = isMe ? { left: -80, right: 0 } : { left: 0, right: 80 };

  // Icon visual transformations (Opactiy, Scale, and Rotation)
  const inputMap = isMe ? [-60, -20] : [20, 60];
  const opacity = useTransform(x, inputMap, [1, 0]);
  const scale = useTransform(x, inputMap, [1.2, 0.5]);
  const rotate = useTransform(x, inputMap, isMe ? [-180, 0] : [0, 180]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    isDragging.current = false;
    const offset = info.offset.x;

    if ((!isMe && offset > dragThreshold) || (isMe && offset < -dragThreshold)) {
      onReply();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40); // Subtle haptic feedback
      }
    }
    await controls.start({ x: 0 });
  };

  return (
    <div className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} py-1 group`}>
      {/* --- ICON LAYER --- */}
      <div className={`absolute flex items-center justify-center pointer-events-none ${isMe ? 'right-6' : 'left-6'}`}>
        <motion.div 
          style={{ opacity, scale, rotate }}
          className="w-9 h-9 rounded-full bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400 border border-blue-500/20"
        >
          <Reply size={18} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* --- MESSAGE BUBBLE --- */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }} // Critical for smooth vertical scrolling
        className="z-10 relative max-w-[88%] will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default React.memo(SwipeableMessage);
