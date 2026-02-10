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

// 1. GPU-ACCELERATED ANIMATION VARIANTS
// Using scale and y-axis movement for the "pop-up" effect
const messageVariants = {
  initial: { 
    opacity: 0, 
    y: 15, 
    scale: 0.92,
    filter: 'blur(4px)' 
  },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      damping: 25,    // Smoothness
      stiffness: 400, // Speed
      mass: 0.8,
      velocity: 2
    }
  }
};

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const progress = message.uploadProgress || 0;
  const isText = message.type === 'text' || isUnsent;

  // Touch handlers for context menu
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
      onOpenMenu(e, message);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const getMediaItems = (): {url: string, type: 'image' | 'video'}[] => {
    const rawItems = message.attachments && message.attachments.length > 0 ? message.attachments : [message.content];
    return rawItems.map(url => ({
      url,
      type: url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image'
    }));
  };

  const renderContent = () => {
    if (isUnsent) return <p className="text-[13px] text-white/30 italic">Message removed</p>;

    switch (message.type) {
      case 'music':
        try {
          const trackData = JSON.parse(message.content) as Track;
          return (
            <motion.div 
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectTrack?.(trackData)}
              className="flex items-center gap-3 p-2.5 bg-white/[0.04] border border-white/5 rounded-2xl cursor-pointer min-w-[240px]"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative shadow-lg">
                <img src={trackData.albumArt} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Play size={16} fill="white" className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-white truncate">{trackData.title}</h4>
                <p className="text-[10px] text-white/40 truncate uppercase tracking-widest mt-0.5">{trackData.artist}</p>
              </div>
            </motion.div>
          );
        } catch { return null; }

      case 'image':
      case 'video':
      case 'image-grid':
        const mediaItems = getMediaItems();
        return (
          <div className={`grid ${mediaItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 max-w-[280px]`}>
            {mediaItems.map((item, i) => (
              <div 
                key={i} 
                onClick={() => onMediaClick?.(item.url, mediaItems)}
                className="relative aspect-square rounded-[22px] overflow-hidden bg-white/[0.03] shadow-2xl will-change-transform"
              >
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                )}
                {isSending && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
                     <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-[15px] leading-relaxed font-medium text-white/95">{message.content}</p>;
    }
  };

  return (
    <motion.div 
      variants={messageVariants}
      initial="initial"
      animate="animate"
      layout // Enables smooth position shifting when messages above are added/deleted
      style={{ willChange: 'transform, opacity' }}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 w-full px-3`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
    >
      <div className={`flex gap-2 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && showAvatar ? (
          <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 self-end mb-1 overflow-hidden shadow-md">
            <img src={message.senderAvatar} className="w-full h-full object-cover" alt="" />
          </div>
        ) : !isMe && <div className="w-8" />}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Main Bubble Container */}
          <div className={`
            relative transition-all duration-500 ease-out
            ${isText 
              ? `px-4 py-2.5 backdrop-blur-2xl border shadow-xl
                 ${isMe 
                   ? 'bg-blue-600/15 border-blue-500/20 rounded-[22px] rounded-tr-[4px]' 
                   : 'bg-white/[0.08] border-white/10 rounded-[22px] rounded-tl-[4px]'}`
              : 'p-0 bg-transparent border-none'
            }
          `}>
            {renderContent()}
            
            {/* Metadata (Time & Status) */}
            <div className={`flex items-center gap-1.5 mt-1 opacity-30 ${isMe ? 'justify-end' : 'justify-start'} ${!isText ? 'px-1' : ''}`}>
              <span className="text-[9px] font-bold tabular-nums">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMe && !isSending && (
                <CheckCheck size={10} className={isText ? "text-blue-400" : "text-white/60"} />
              )}
            </div>
          </div>

          {/* Reactions */}
          <AnimatePresence>
            {message.reactions && message.reactions.length > 0 && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className={`flex gap-1 bg-[#121212] border border-white/10 px-2 py-0.5 rounded-full -mt-2 z-10 shadow-xl ${isMe ? 'mr-2' : 'ml-2'}`}
              >
                {message.reactions.map((emoji, i) => <span key={i} className="text-[10px]">{emoji}</span>)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// 2. RAM OPTIMIZATION: Memo prevents unecessary re-renders of old messages
export default memo(MessageBubble, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.message.content === next.message.content &&
    prev.message.reactions?.length === next.message.reactions?.length &&
    prev.showAvatar === next.showAvatar
  );
});
