import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Message, Track } from '../types';
import { CornerUpLeft, Play, Music, Film, Reply } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: {url: string, type: 'image' | 'video'}[]) => void;
  onSelectTrack?: (track: Track) => void;
  onReply?: (message: Message) => void; // Added for Swipe-to-Reply
}

const MessageBubble: React.FC<Props> = ({ 
  message, 
  isMe, 
  showAvatar, 
  onOpenMenu, 
  onMediaClick, 
  onSelectTrack,
  onReply 
}) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controls = useAnimation();
  const x = useMotionValue(0);

  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const progress = message.uploadProgress || 0;
  const isMediaOnly = (message.type === 'image' || message.type === 'image-grid' || message.type === 'video' || message.type === 'music') && !isUnsent;

  // --- Swipe Reply Logic ---
  // If isMe, swipe left to reply. If not isMe, swipe right to reply.
  const dragConstraints = isMe ? { left: -100, right: 0 } : { left: 0, right: 100 };
  const opacity = useTransform(x, isMe ? [0, -60] : [0, 60], [0, 1]);
  const scale = useTransform(x, isMe ? [0, -60] : [0, 60], [0.5, 1.2]);
  const iconX = useTransform(x, isMe ? [0, -100] : [0, 100], isMe ? [20, 0] : [-20, 0]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (isUnsent || isSending) return;
    
    const offset = info.offset.x;
    const threshold = 60;
    const shouldReply = isMe ? offset < -threshold : offset > threshold;

    if (shouldReply && onReply) {
      onReply(message);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }

    await controls.start({ 
      x: 0, 
      transition: { type: 'spring', stiffness: 600, damping: 35 } 
    });
  };

  // --- Existing Logic ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => onOpenMenu(e, message), 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isSending) return;
    e.preventDefault();
    if (onOpenMenu) onOpenMenu(e, message);
  };

  const getMediaItems = (): {url: string, type: 'image' | 'video'}[] => {
    const rawItems = message.attachments && message.attachments.length > 0 ? message.attachments : [message.content];
    return rawItems.map(url => ({
      url,
      type: url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image'
    }));
  };

  const renderContent = () => {
    if (isUnsent) {
      return <p className="text-[13px] leading-relaxed text-white/40 italic font-medium">{message.content}</p>;
    }
    const mediaItems = getMediaItems();
    switch (message.type) {
      case 'music':
        try {
          const trackData = JSON.parse(message.content) as Track;
          return (
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTrack?.(trackData)}
              className="flex items-center gap-4 p-3 glass-high rounded-[28px] border border-white/10 cursor-pointer shadow-xl min-w-[240px] max-w-[300px] overflow-hidden group bg-cyan-500/5"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shrink-0 border border-white/10 relative">
                <img src={trackData.albumArt} alt={trackData.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={20} fill="white" className="text-white ml-1" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Music size={10} className="text-cyan-400" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Shared Music</span>
                </div>
                <h4 className="font-black text-sm text-white uppercase truncate tracking-tight mb-0.5">{trackData.title}</h4>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{trackData.artist}</p>
              </div>
            </motion.div>
          );
        } catch (e) { return <p className="text-sm text-white/60 italic">Invalid track</p>; }
      case 'image':
      case 'video':
      case 'image-grid':
        const gridClass = mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
        return (
          <div className={`grid ${gridClass} gap-1.5 mt-0.5 mb-0.5 max-w-[260px] sm:max-w-[320px] relative transform-style-3d`}>
            {mediaItems.map((item, idx) => (
              <motion.div 
                key={`${message.id}-media-${idx}`}
                whileHover={!isSending ? { scale: 1.01 } : {}}
                onClick={() => !isSending && onMediaClick?.(item.url, mediaItems)}
                className={`relative overflow-hidden rounded-[28px] bg-[#0a0a0a] border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] ${!isSending ? 'cursor-pointer group' : 'cursor-default'} ${mediaItems.length === 3 && idx === 2 ? 'col-span-2' : ''}`}
              >
                <div className={`w-full h-full transition-all duration-[1s] ${isSending ? 'blur-2xl saturate-150 brightness-50' : 'blur-0'}`}>
                  {item.type === 'video' ? (
                    <div className="relative aspect-[4/5] sm:aspect-square flex items-center justify-center bg-black">
                      <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute top-3 left-3 px-2 py-1 glass-high rounded-lg border border-white/10 flex items-center gap-1.5">
                        <Film size={10} className="text-blue-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/80">Video</span>
                      </div>
                      {!isSending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <div className="w-14 h-14 rounded-full glass-high flex items-center justify-center border border-white/20">
                            <Play size={24} fill="white" className="text-white ml-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative aspect-square">
                       <img src={item.url} alt="Shared" className="w-full h-full object-cover min-h-[140px]" />
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {isSending && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                          <motion.circle cx="32" cy="32" r="28" fill="transparent" stroke="#3B82F6" strokeWidth="3" strokeDasharray="176" animate={{ strokeDashoffset: 176 - (176 * progress) / 100 }} strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[220px] p-2 glass rounded-[20px] border border-white/5">
             <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
               <Music size={20} className="text-blue-400" />
             </div>
             <audio src={message.content} controls className="w-full h-8 opacity-60 scale-90" />
          </div>
        );
      default:
        return <p className="text-[15px] leading-relaxed text-white/90">{message.content}</p>;
    }
  };

  return (
    <div className={`relative w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1`}>
      
      {/* --- SWIPE REPLY BACKGROUND ICON --- */}
      {!isUnsent && !isSending && (
        <div className={`absolute top-0 bottom-0 flex items-center ${isMe ? 'right-0 pr-12' : 'left-0 pl-12'}`}>
          <motion.div 
            style={{ opacity, scale, x: iconX }}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg backdrop-blur-xl ${
              isMe ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'
            } border border-white/10`}
          >
            <Reply size={18} strokeWidth={2.5} />
          </motion.div>
        </div>
      )}

      {/* --- DRAGGABLE WRAPPER --- */}
      <motion.div 
        drag={!isUnsent && !isSending ? "x" : false}
        dragConstraints={dragConstraints}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className={`flex gap-3 max-w-[92%] ${isMe ? 'flex-row-reverse' : 'flex-row'} z-10`}
      >
        {!isMe && showAvatar && (
          <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg mt-auto mb-1">
            <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full object-cover" />
          </div>
        )}
        {!isMe && !showAvatar && <div className="w-9" />}
        
        <div className="relative group flex flex-col" onContextMenu={handleContextMenu} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {showAvatar && !isMe && <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1.5 ml-1.5">{message.senderName}</p>}
          
          {message.replyTo && !isUnsent && (
            <div className={`mb-1.5 px-3 py-2 bg-white/[0.03] rounded-2xl border-l-2 border-blue-500/50 flex flex-col text-[11px] ${isMe ? 'self-end mr-1' : 'ml-1'}`}>
               <div className="flex items-center gap-1.5 text-blue-400/80 font-black mb-0.5">
                 <CornerUpLeft size={10} />
                 <span className="uppercase tracking-tight">{message.replyTo.senderName}</span>
               </div>
               <span className="text-white/30 line-clamp-1 italic text-[10px]">{message.replyTo.content}</span>
            </div>
          )}
          
          <div className={`relative overflow-hidden transition-all duration-300 ${isMediaOnly ? 'bg-transparent p-0 shadow-none' : 'glass px-4.5 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.4)]'} ${!isMediaOnly && !isUnsent ? (isMe ? 'bg-blue-600/10 rounded-[28px] rounded-tr-[4px] border-blue-500/10' : 'bg-white/[0.05] rounded-[28px] rounded-tl-[4px] border-white/5') : ''} ${isUnsent ? 'bg-white/[0.02] border border-white/[0.05] p-3 rounded-[24px] italic text-white/40' : ''}`}>
            {renderContent()}
            <div className={`flex items-center gap-2 ${isMediaOnly ? 'mt-1.5 px-2' : 'mt-2'} ${isMe ? 'justify-end' : 'justify-start'}`}>
              {message.isEdited && !isUnsent && <span className="text-[9px] text-white/20 font-black uppercase">Edited</span>}
              <span className="text-[9px] text-white/25 font-bold tabular-nums">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {isSending && <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />}
            </div>
          </div>

          {message.reactions && message.reactions.length > 0 && !isUnsent && (
            <div className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} glass-high px-2 h-6 rounded-full flex items-center justify-center text-[12px] shadow-2xl border border-white/10 gap-0.5 z-10`}>
              {message.reactions.map((r, i) => <span key={i}>{r}</span>)}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MessageBubble;
