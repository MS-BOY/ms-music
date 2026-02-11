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

  // CONSTRAINTS & ANIMATIONS
  // If it's my message (right side), we drag left (negative x).
  // If it's their message (left side), we drag right (positive x).
  
  // 1. Drag Limits
  const dragConstraints = isMe ? { left: -100, right: 0 } : { left: 0, right: 100 };

  // 2. Icon Transformations based on drag distance (x)
  // We map the drag distance to opacity, scale, and rotation of the reply icon.
  const inputRange = isMe ? [-50, -20] : [20, 50];
  const opacity = useTransform(x, inputRange, [1, 0]);
  const scale = useTransform(x, inputRange, [1.1, 0.6]);
  const rotate = useTransform(x, inputRange, isMe ? [-180, 0] : [0, 180]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const threshold = 60; // Distance required to trigger reply

    // Check if dragged far enough
    const shouldReply = isMe ? offset < -threshold : offset > threshold;

    if (shouldReply) {
      onReply();
      // Haptic feedback for mobile feel
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    // Always snap back to original position
    await controls.start({ x: 0 });
  };

  return (
    <div className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} group`}>
      {/* --- THE REPLY ICON LAYER (Behind the message) --- */}
      <div 
        className={`absolute top-0 bottom-0 flex items-center justify-center pointer-events-none ${
          isMe ? 'right-4' : 'left-4'
        }`}
      >
        <motion.div 
          style={{ opacity, scale, rotate }}
          className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-sm"
        >
          <Reply size={16} />
        </motion.div>
      </div>

      {/* --- THE DRAGGABLE MESSAGE BUBBLE --- */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.05} // High resistance for that "premium" weighted feel
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }} // Important: allows vertical scrolling while touching this
        className="z-10 relative max-w-[85%]"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
