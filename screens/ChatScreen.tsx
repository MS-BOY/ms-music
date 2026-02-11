import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Message, Track } from '../types';
import { CornerUpLeft, Play, Music, Film, Reply } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: { url: string; type: 'image' | 'video' }[]) => void;
  onSelectTrack?: (track: Track) => void;
  onReply?: () => void;
}

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack, onReply }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const progress = message.uploadProgress || 0;
  const isMediaOnly =
    (message.type === 'image' || message.type === 'image-grid' || message.type === 'video' || message.type === 'music') &&
    !isUnsent;

  // --- Long Press Menu ---
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

  // --- Media items ---
  const getMediaItems = (): { url: string; type: 'image' | 'video' }[] => {
    const rawItems = message.attachments && message.attachments.length > 0 ? message.attachments : [message.content];
    return rawItems.map((url) => ({
      url,
      type: url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image',
    }));
  };

  // --- Render content ---
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
        } catch (e) {
          return <p className="text-sm text-white/60 italic">Invalid track metadata</p>;
        }
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
                className={`relative overflow-hidden rounded-[28px] bg-[#0a0a0a] border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] ${
                  !isSending ? 'cursor-pointer group' : 'cursor-default'
                } ${mediaItems.length === 3 && idx === 2 ? 'col-span-2' : ''}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {item.type === 'video' ? (
                  <div className="relative aspect-[4/5] sm:aspect-square flex items-center justify-center bg-black">
                    <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                    <div className="absolute top-3 left-3 px-2 py-1 glass-high rounded-lg border border-white/10 flex items-center gap-1.5 pointer-events-none">
                      <Film size={10} className="text-blue-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/80 leading-none">Video</span>
                    </div>
                    {!isSending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-14 h-14 rounded-full glass-high flex items-center justify-center border border-white/20 shadow-2xl">
                          <Play size={24} fill="white" className="text-white ml-1" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative aspect-square">
                    <img src={item.url} alt="Shared" className="w-full h-full object-cover min-h-[140px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[220px] p-2 glass rounded-[20px] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Music size={20} className="text-blue-400" />
            </div>
            <audio src={message.content} controls className="w-full h-8 opacity-60 scale-90 origin-left" />
          </div>
        );
      default:
        return <p className="text-[15px] leading-relaxed text-white/90">{message.content}</p>;
    }
  };

  // --- Swipe-to-Reply Logic ---
  const controls = useAnimation();
  const x = useMotionValue(0);
  const isDragging = useRef(false);
  const dragThreshold = 60;
  const dragConstraints = isMe ? { left: -80, right: 0 } : { left: 0, right: 80 };
  const inputMap = isMe ? [-dragThreshold, -20] : [20, dragThreshold];
  const opacity = useTransform(x, inputMap, [1, 0]);
  const scale = useTransform(x, inputMap, [1.2, 0.7]);
  const rotate = useTransform(x, inputMap, isMe ? [-180, 0] : [0, 180]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    isDragging.current = false;
    const offset = info.offset.x;

    if ((!isMe && offset > dragThreshold) || (isMe && offset < -dragThreshold)) {
      onReply?.();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
    }

    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 35 } });
  };

  return (
    <div className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} py-1 group`}>
      {/* Reply Icon */}
      <div className={`absolute flex items-center justify-center pointer-events-none ${isMe ? 'right-6' : 'left-6'}`}>
        <motion.div style={{ opacity, scale, rotate }} className="w-9 h-9 rounded-full bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400 border border-blue-500/20">
          <Reply size={18} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* Message Bubble */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragStart={() => {
          isDragging.current = true;
        }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`z-10 relative max-w-[88%] will-change-transform`}
      >
        {renderContent()}
        <div className={`flex items-center gap-2 ${isMediaOnly ? 'mt-1.5 px-2' : 'mt-2'} ${isMe ? 'justify-end' : 'justify-start'}`}>
          {message.isEdited && !isUnsent && <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Edited</span>}
          <span className="text-[9px] text-white/25 font-bold tabular-nums">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isSending && <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />}
        </div>

        {message.reactions && message.reactions.length > 0 && !isUnsent && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} glass-high px-2 h-6 rounded-full flex items-center justify-center text-[12px] shadow-2xl border border-white/10 gap-0.5 z-10`}>
            {message.reactions.map((r, i) => (
              <span key={i} className="drop-shadow-sm">
                {r}
              </span>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default MessageBubble;
