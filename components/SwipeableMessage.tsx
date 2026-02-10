// components/SwipeableMessage.tsx
import React, { memo } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Reply } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onReply: () => void;
  isMe: boolean;
}

const SWIPE_LIMIT = 90;
const TRIGGER_DISTANCE = 60;

const SwipeableMessage: React.FC<Props> = ({ children, onReply, isMe }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);

  const dragConstraints = isMe
    ? { left: -SWIPE_LIMIT, right: 0 }
    : { left: 0, right: SWIPE_LIMIT };

  const opacity = useTransform(
    x,
    isMe ? [-TRIGGER_DISTANCE, -20] : [20, TRIGGER_DISTANCE],
    [1, 0]
  );

  const scale = useTransform(
    x,
    isMe ? [-TRIGGER_DISTANCE, -20] : [20, TRIGGER_DISTANCE],
    [1.1, 0.6]
  );

  const rotate = useTransform(
    x,
    isMe ? [-TRIGGER_DISTANCE, -20] : [20, TRIGGER_DISTANCE],
    isMe ? [-180, 0] : [0, 180]
  );

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const offsetX = info.offset.x;
    const shouldReply = isMe
      ? offsetX < -TRIGGER_DISTANCE
      : offsetX > TRIGGER_DISTANCE;

    if (shouldReply) {
      onReply();
      navigator?.vibrate?.(40);
    }

    await controls.start({
      x: 0,
      transition: { type: 'spring', stiffness: 420, damping: 32 },
    });
  };

  return (
    <div className={`relative w-full flex ${isMe ? 'justify-end' : 'justify-start'} px-2`}>
      {/* Reply Icon */}
      <div className={`absolute inset-y-0 flex items-center pointer-events-none ${isMe ? 'right-3' : 'left-3'}`}>
        <motion.div
          style={{ opacity, scale, rotate }}
          className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
        >
          <Reply size={16} />
        </motion.div>
      </div>

      {/* Message Bubble */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.04}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y', willChange: 'transform' }}
        className="relative z-10 max-w-[85%]"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default memo(SwipeableMessage);
