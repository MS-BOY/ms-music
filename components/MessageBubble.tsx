import React, { useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Track } from '../types';
import { Play, CheckCheck } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: {url: string, type: 'image' | 'video'}[]) => void;
  onSelectTrack?: (track: Track) => void;
}

// GPU-Accelerated Variants for 120Hz Smoothness
const bubbleVariants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { 
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 500, mass: 0.6 }
  }
};

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const isText = message.type === 'text' || isUnsent;

  // Logic: Extract only the first name for clarity
  const firstName = message.senderName?.split(' ')[0] || "User";

  // Vibration & Long Press Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
      onOpenMenu(e, message);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const renderContent = () => {
    if (isUnsent) return <p className="text-[13px] text-white/30 italic">Message removed</p>;

    switch (message.type) {
      case 'music':
        try {
          const track = JSON.parse(message.content) as Track;
          return (
            <div 
              onClick={() => onSelectTrack?.(track)}
              className="flex items-center gap-3 p-2.5 bg-white/[0.04] border border-white/5 rounded-2xl cursor-pointer min-w-[230px] active:scale-95 transition-all"
            >
              <img src={track.albumArt} className="w-12 h-12 rounded-xl object-cover shadow-lg" loading="lazy" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-white truncate">{track.title}</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{track.artist}</p>
              </div>
            </div>
          );
        } catch { return null; }

      case 'image':
      case 'video':
        return (
          <div 
            onClick={() => onMediaClick?.(message.content, [])}
            className="relative aspect-square w-[260px] rounded-[24px] overflow-hidden bg-white/[0.02] shadow-2xl will-change-transform"
          >
            {message.type === 'video' ? (
              <video src={message.content} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={message.content} className="w-full h-full object-cover" loading="lazy" />
            )}
            {isSending && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-[15px] leading-relaxed font-medium text-white/95">{message.content}</p>;
    }
  };

  return (
    <motion.div 
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      style={{ willChange: 'transform, opacity' }} // Offload to GPU
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 w-full px-3 group`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
    >
      {/* 1. TOP DISPLAY FIRST NAME (Others only) */}
      {!isMe && showAvatar && (
        <span className="text-[10px] font-bold text-white/15 uppercase tracking-[0.2em] mb-1 ml-10">
          {firstName}
        </span>
      )}

      <div className={`flex gap-2 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && showAvatar ? (
          <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 self-end mb-1 overflow-hidden shadow-md">
            <img src={message.senderAvatar} className="w-full h-full object-cover" />
          </div>
        ) : !isMe && <div className="w-8" />}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          <div className={`
            relative transition-all duration-300 ease-out
            ${isText 
              ? `px-4 py-2.5 backdrop-blur-3xl border shadow-xl
                 ${isMe 
                   ? 'bg-blue-600/15 border-blue-500/20 rounded-[22px] rounded-tr-[4px]' 
                   : 'bg-white/[0.08] border-white/10 rounded-[22px] rounded-tl-[4px]'}`
              : 'p-0 bg-transparent border-none' // Naked Media
            }
          `}>
            {renderContent()}
          </div>

          {/* 2. HIDDEN TIME: Hover/Tap Reveal */}
          <div className={`
            flex items-center gap-1.5 mt-1 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            opacity-0 translate-y-[-4px] group-hover:opacity-40 group-hover:translate-y-0
            ${isMe ? 'justify-end' : 'justify-start'} ${!isText ? 'px-1' : ''}
          `}>
            <span className="text-[9px] font-bold tabular-nums">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && !isSending && (
              <CheckCheck size={10} className={isText ? "text-blue-400" : "text-white/60"} />
            )}
          </div>
        </div>
      </div>

      {/* Reactions logic remains unchanged, kept minimal for RAM */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex gap-1 bg-[#121212] border border-white/10 px-2 py-0.5 rounded-full -mt-2.5 z-10 shadow-xl ${isMe ? 'mr-2' : 'ml-2'}`}>
          {message.reactions.map((emoji, i) => <span key={i} className="text-[10px]">{emoji}</span>)}
        </div>
      )}
    </motion.div>
  );
};

// 3. MEMOIZATION: Critical for 2GB RAM stability
export default memo(MessageBubble, (p, n) => {
  return (
    p.message.id === n.message.id &&
    p.message.status === n.message.status &&
    p.message.content === n.message.content &&
    p.showAvatar === n.showAvatar &&
    p.message.reactions?.length === n.message.reactions?.length
  );
});
