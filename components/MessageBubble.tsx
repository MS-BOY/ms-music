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

const messageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { 
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 500, mass: 0.5 }
  }
};

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSending = message.status === 'sending';
  const isText = message.type === 'text' || message.isUnsent;

  // Extract First Name only
  const firstName = message.senderName ? message.senderName.split(' ')[0] : 'User';

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

  const renderContent = () => {
    if (message.isUnsent) return <p className="text-[13px] text-white/30 italic">Message removed</p>;

    switch (message.type) {
      case 'music':
        try {
          const track = JSON.parse(message.content) as Track;
          return (
            <div onClick={() => onSelectTrack?.(track)} className="flex items-center gap-3 p-2 bg-white/[0.05] border border-white/5 rounded-2xl cursor-pointer min-w-[220px] active:scale-95 transition-transform">
              <img src={track.albumArt} className="w-12 h-12 rounded-xl object-cover shadow-lg" loading="lazy" />
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-white truncate">{track.title}</h4>
                <p className="text-[10px] text-white/40 truncate uppercase tracking-widest">{track.artist}</p>
              </div>
            </div>
          );
        } catch { return null; }

      case 'image':
      case 'video':
        return (
          <div onClick={() => onMediaClick?.(message.content, [])} className="relative aspect-square w-[260px] rounded-[24px] overflow-hidden bg-white/[0.02] shadow-2xl will-change-transform">
            {message.type === 'video' ? (
              <video src={message.content} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={message.content} className="w-full h-full object-cover" loading="lazy" />
            )}
            {isSending && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-pulse" />}
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
      style={{ willChange: 'transform, opacity' }}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 w-full px-3 group`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
    >
      {/* Display First Name for others */}
      {!isMe && showAvatar && (
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] mb-1 ml-10">
          {firstName}
        </span>
      )}

      <div className={`flex gap-2 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && showAvatar ? (
          <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 self-end mb-1 overflow-hidden shadow-md">
            <img src={message.senderAvatar} className="w-full h-full object-cover" alt="" />
          </div>
        ) : !isMe && <div className="w-8" />}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          <div className={`
            relative transition-all duration-300
            ${isText 
              ? `px-4 py-2.5 backdrop-blur-3xl border shadow-xl
                 ${isMe 
                   ? 'bg-blue-600/15 border-blue-500/20 rounded-[22px] rounded-tr-[4px]' 
                   : 'bg-white/[0.08] border-white/10 rounded-[22px] rounded-tl-[4px]'}`
              : 'p-0 bg-transparent border-none'
            }
          `}>
            {renderContent()}
          </div>

          {/* HIDDEN TIME: Shows on Group Hover/Tap */}
          <div className={`
            flex items-center gap-1.5 mt-1 transition-all duration-300 ease-out
            opacity-0 translate-y-[-5px] group-hover:opacity-40 group-hover:translate-y-0
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
    </motion.div>
  );
};

export default memo(MessageBubble, (p, n) => {
  return p.message.id === n.message.id && p.message.status === n.message.status && p.showAvatar === n.showAvatar;
});
