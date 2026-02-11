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
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Drag constraints based on container width for responsiveness ---
  const maxDrag = 100; // pixels to trigger reply
  const dragConstraints = { left: isMe ? -maxDrag : 0, right: isMe ? 0 : maxDrag };

  // --- Icon animations based on drag distance ---
  const inputRange = isMe ? [-maxDrag, -maxDrag / 2] : [maxDrag / 2, maxDrag];
  const opacity = useTransform(x, inputRange, [1, 0]);
  const scale = useTransform(x, inputRange, [1.2, 0.7]);
  const rotate = useTransform(x, inputRange, isMe ? [-180, 0] : [0, 180]);

  // --- Handle drag end ---
  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const threshold = 60; // pixels to trigger reply

    const shouldReply = isMe ? offset < -threshold : offset > threshold;

    if (shouldReply) {
      onReply();

      // Haptic feedback on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    // Snap back smoothly
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } });
  };

  return (
    <div ref={containerRef} className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
      {/* --- Reply Icon behind the message --- */}
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

      {/* --- Draggable message bubble --- */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.2} // slightly higher elasticity for smoother feel
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className="z-10 relative max-w-[85%]"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
