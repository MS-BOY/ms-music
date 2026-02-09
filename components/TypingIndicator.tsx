
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingUser {
  id: string;
  name: string;
  avatar: string;
}

interface Props {
  users: TypingUser[];
}

const TypingIndicator: React.FC<Props> = ({ users }) => {
  if (users.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 5 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 px-4 py-2.5 glass-high rounded-full border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.4)] transform-style-3d relative mb-3 pointer-events-none"
      style={{ transform: "translateZ(30px)" }}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-md" />

      {/* Avatars Stack */}
      <div className="flex -space-x-2 mr-1">
        {users.slice(0, 3).map((user, idx) => (
          <motion.div
            key={user.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 rounded-full border border-[#050505] overflow-hidden shadow-lg relative z-[10]"
            style={{ zIndex: 10 - idx }}
          >
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-none mb-1">
          {users.length === 1 ? `${users[0].name} is typing` : `${users.length} people typing`}
        </span>
        
        {/* Animated Dots */}
        <div className="flex gap-1.5 h-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
                z: [0, 5, 0]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            />
          ))}
        </div>
      </div>

      {/* Depth Shadow */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 blur-xl rounded-full -z-10" />
    </motion.div>
  );
};

export default TypingIndicator;
