import React, { useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Track } from '../types';
import { CornerUpLeft, Play, Music, Film, CheckCheck } from 'lucide-react';

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
  
  // Logic: Only "text" gets the bubble background. 
  // Music, Image, and Video are treated as "Pure Media"
  const isText = message.type === 'text' || isUnsent;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
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
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTrack?.(trackData)}
              className="flex items-center gap-3 p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-2xl cursor-pointer min-w-[240px] transition-colors"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 relative shadow-lg">
                <img src={trackData.albumArt} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play size={18} fill="white" className="text-white ml-0.5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white/90 truncate tracking-tight">{trackData.title}</h4>
                <p className="text-[11px] text-white/40 truncate uppercase tracking-widest mt-0.5">{trackData.artist}</p>
              </div>
            </motion.div>
          );
        } catch { return <p className="text-xs text-red-400">Invalid Music Data</p>; }

      case 'image':
      case 'video':
      case 'image-grid':
        const mediaItems = getMediaItems();
        return (
          <div className={`grid ${mediaItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 max-w-[280px]`}>
            {mediaItems.map((item, i) => (
              <div 
                key={i} 
                onClick={() => onMediaClick?.(item.url, mediaItems)}
                className="relative aspect-square rounded-[20px] overflow-hidden bg-white/[0.02] shadow-2xl"
              >
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" alt="" />
                )}
                {isSending && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                     <span className="text-[11px] font-black text-blue-400">{progress}%</span>
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
    <div 
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 w-full px-2`}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`flex gap-2 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && showAvatar ? (
          <div className="w-8 h-8 rounded-full border border-white/10 shrink-0 self-end mb-1 overflow-hidden shadow-lg">
            <img src={message.senderAvatar} className="w-full h-full object-cover" alt="" />
          </div>
        ) : !isMe && <div className="w-8" />}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
          
          {/* Reply Preview stays slightly separated for clarity */}
          {message.replyTo && (
            <div className={`mb-1 px-3 py-1.5 bg-white/5 rounded-xl border-l-2 border-blue-500/30 text-[11px] opacity-60 scale-95 origin-bottom ${isMe ? 'mr-1' : 'ml-1'}`}>
              <p className="font-bold text-blue-400 truncate">{message.replyTo.senderName}</p>
              <p className="truncate text-white/80 text-[10px] italic">{message.replyTo.content}</p>
            </div>
          )}

          {/* MAIN BUBBLE: Styled conditionally based on type */}
          <div className={`
            relative transition-all duration-300
            ${isText 
              ? `px-4 py-2.5 backdrop-blur-3xl border shadow-xl
                 ${isMe 
                   ? 'bg-blue-600/15 border-blue-500/20 rounded-[22px] rounded-tr-[4px]' 
                   : 'bg-white/[0.08] border-white/10 rounded-[22px] rounded-tl-[4px]'}`
              : 'p-0 bg-transparent border-none' // Remove background for media/music
            }
          `}>
            {renderContent()}
            
            {/* Metadata (Time & Status) */}
            <div className={`flex items-center gap-1.5 mt-1.5 opacity-40 ${isMe ? 'justify-end' : 'justify-start'} ${!isText ? 'px-1' : ''}`}>
              <span className="text-[9px] font-bold tabular-nums">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMe && (
                <div className="flex items-center">
                  {isSending ? (
                    <div className="w-2 h-2 rounded-full border border-t-transparent border-white/40 animate-spin" />
                  ) : (
                    <CheckCheck size={10} className={isText ? "text-blue-400" : "text-white/60"} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reactions */}
          <AnimatePresence>
            {message.reactions && message.reactions.length > 0 && (
              <motion.div 
                initial={{ scale: 0, y: 5 }} animate={{ scale: 1, y: 0 }}
                className={`flex gap-1 bg-[#151515] border border-white/10 px-2 py-0.5 rounded-full -mt-2 z-10 shadow-2xl ${isMe ? 'mr-2' : 'ml-2'}`}
              >
                {message.reactions.map((emoji, i) => (
                  <span key={i} className="text-[10px]">{emoji}</span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

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
