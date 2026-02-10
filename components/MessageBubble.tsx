import React, { useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Track } from '../types';
import { CornerUpLeft, Play, Music, Film, Check, CheckCheck } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: {url: string, type: 'image' | 'video'}[]) => void;
  onSelectTrack?: (track: Track) => void;
}

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const progress = message.uploadProgress || 0;
  const isMediaOnly = (message.type === 'image' || message.type === 'image-grid' || message.type === 'video') && !isUnsent;

  // --- Handlers Optimized for Mobile Performance ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      onOpenMenu(e, message);
    }, 500);
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
              className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl border border-white/10 cursor-pointer min-w-[240px]"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                <img src={trackData.albumArt} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Play size={16} fill="white" className="text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate uppercase tracking-tight">{trackData.title}</h4>
                <p className="text-[10px] text-white/50 truncate uppercase tracking-widest">{trackData.artist}</p>
              </div>
            </motion.div>
          );
        } catch { return <p className="text-xs text-red-400">Error loading track</p>; }

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
                className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 bg-white/5"
              >
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" alt="" />
                )}
                {isSending && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                     <span className="text-[10px] font-bold text-blue-400">{progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-[15px] leading-relaxed font-medium tracking-tight text-white/95">{message.content}</p>;
    }
  };

  return (
    <div 
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 w-full px-2`}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar logic - Only show on first message of a stack */}
        {!isMe && showAvatar ? (
          <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 self-end mb-1">
            <img src={message.senderAvatar} className="w-full h-full rounded-full object-cover" alt="" />
          </div>
        ) : !isMe && <div className="w-8" />}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          {/* Reply Preview */}
          {message.replyTo && (
            <div className="mb-[-12px] pb-4 px-3 py-2 bg-white/5 rounded-t-2xl border-l-2 border-blue-500/40 text-[11px] opacity-60 scale-95 origin-bottom">
              <p className="font-bold text-blue-400 truncate">{message.replyTo.senderName}</p>
              <p className="truncate text-white/80 italic">{message.replyTo.content}</p>
            </div>
          )}

          {/* MAIN BUBBLE DESIGN */}
          <div className={`
            relative px-4 py-2.5 transition-all duration-200
            ${isMediaOnly ? 'p-0 bg-transparent' : 'backdrop-blur-2xl border'}
            ${isMe 
              ? 'bg-blue-600/20 border-blue-500/20 rounded-[22px] rounded-tr-[4px] shadow-[0_4px_15px_rgba(37,99,235,0.1)]' 
              : 'bg-white/[0.07] border-white/10 rounded-[22px] rounded-tl-[4px] shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
            }
          `}>
            {renderContent()}
            
            {/* Metadata (Time & Status) */}
            <div className="flex items-center gap-1.5 mt-1 justify-end opacity-40">
              <span className="text-[9px] font-medium tabular-nums uppercase">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMe && (
                <div className="flex items-center">
                  {isSending ? (
                    <div className="w-2 h-2 rounded-full border border-t-transparent border-white/40 animate-spin" />
                  ) : (
                    <CheckCheck size={10} className="text-blue-400" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reactions Overlay */}
          <AnimatePresence>
            {message.reactions && message.reactions.length > 0 && (
              <motion.div 
                initial={{ scale: 0, y: 5 }} 
                animate={{ scale: 1, y: 0 }}
                className={`flex gap-0.5 bg-[#1a1a1a] border border-white/10 px-1.5 py-0.5 rounded-full -mt-2.5 z-10 shadow-xl ${isMe ? 'mr-2' : 'ml-2'}`}
              >
                {message.reactions.map((emoji, i) => (
                  <span key={i} className="text-[10px] leading-none">{emoji}</span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// React.memo with custom comparison for maximum performance
export default memo(MessageBubble, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.reactions?.length === next.message.reactions?.length &&
    prev.message.status === next.message.status &&
    prev.message.uploadProgress === next.message.uploadProgress &&
    prev.showAvatar === next.showAvatar
  );
});
