import React, { useRef } from 'react';
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  useAnimation, 
  PanInfo 
} from 'framer-motion';
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

  // CONFIGURATION
  const DRAG_THRESHOLD = 50; // How far to drag to trigger reply
  
  // ANIMATION TRANSFORMS
  // isMe = true (Right side) -> Drag Left (Negative X)
  // isMe = false (Left side) -> Drag Right (Positive X)
  
  const inputLeft = [0, DRAG_THRESHOLD];
  const inputRight = [-DRAG_THRESHOLD, 0];
  const inputValue = isMe ? inputRight : inputLeft;

  // Icon Animations
  const opacity = useTransform(x, inputValue, [0, 1]);
  const scale = useTransform(x, inputValue, [0.5, 1.1]);
  
  // Drag Handler
  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Check if dragged far enough or flicked fast enough
    const isSwiped = isMe 
      ? offset < -DRAG_THRESHOLD || velocity < -500 
      : offset > DRAG_THRESHOLD || velocity > 500;

    if (isSwiped) {
      // Trigger Haptic Feedback
      if (navigator.vibrate) navigator.vibrate(15);
      
      // Trigger Action
      onReply();
    }

    // Always snap back to origin
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} py-0.5 group`}
    >
      {/* --- BACKGROUND ICON LAYER --- */}
      <div 
        className={`absolute top-0 bottom-0 flex items-center justify-center pointer-events-none z-0 ${
          isMe ? 'right-2' : 'left-2'
        }`}
      >
        <motion.div 
          style={{ opacity, scale, x: isMe ? 10 : -10 }}
          className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg"
        >
          <Reply size={16} className={isMe ? "" : "-scale-x-100"} />
        </motion.div>
      </div>

      {/* --- FOREGROUND MESSAGE LAYER --- */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }} // Constraints are 0 to force spring back, but dragElastic allows movement
        dragElastic={{ 
          left: isMe ? 0.3 : 0.05, // Allow drag mainly in the correct direction
          right: isMe ? 0.05 : 0.3 
        }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }} // pan-y ensures vertical scrolling still works
        className="relative z-10 max-w-full"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
