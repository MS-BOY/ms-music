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

  // ড্র্যাগের সীমা — একটু বেশি দূরত্ব দিলে ভালো ফিল আসে
  const maxDrag = 120;
  const dragConstraints = isMe 
    ? { left: -maxDrag, right: 0 } 
    : { left: 0, right: maxDrag };

  // ভিজ্যুয়াল ফিডব্যাকের রেঞ্জ — আগে থেকে আইকন দেখা যাবে
  const inputRange = isMe ? [-100, -35] : [35, 100];

  const opacity = useTransform(x, inputRange, [1, 0.15]); // একদম 0 না করে হালকা থাকুক
  const scale   = useTransform(x, inputRange, [1.2, 0.7]);
  // ঘূর্ণন — টেলিগ্রাম স্টাইলে মিরর করা (আঙুলের দিকে তাক করা ভাব)
  const rotate  = useTransform(x, inputRange, isMe ? [-100, 0] : [0, 100]);

  const threshold = 70; // reply ট্রিগারের জন্য দরকারি দূরত্ব

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const shouldReply = isMe ? offset < -threshold : offset > threshold;

    if (shouldReply) {
      onReply();
      // ভাইব্রেশন — ছোট প্যাটার্ন বেশি প্রিমিয়াম লাগে
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 20, 40]);
      }
    }

    // সুন্দর করে ফিরে আসবে (spring physics)
    await controls.start({
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        mass: 1.2
      }
    });
  };

  return (
    <div 
      className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {/* Reply আইকন — পেছনে */}
      <div 
        className={`absolute inset-y-0 flex items-center justify-center pointer-events-none ${
          isMe ? 'right-5' : 'left-5'
        }`}
      >
        <motion.div
          style={{ opacity, scale, rotate }}
          className={`
            w-10 h-10 rounded-full 
            bg-gradient-to-br from-white/15 to-white/5 
            backdrop-blur-lg 
            flex items-center justify-center 
            text-white/90 shadow-lg
            ring-1 ring-white/10
          `}
        >
          <Reply size={20} strokeWidth={2.4} />
        </motion.div>
      </div>

      {/* মেসেজ বাবল — ড্র্যাগ করা যাবে */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.2}          // ← এখানে মূল পরিবর্তন (0.05 → 0.2)
        dragMomentum={true}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className={`
          z-10 relative 
          max-w-[82%] md:max-w-[70%]
          select-none
        `}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
