import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Message, Track } from '../types';
import { CornerUpLeft, Play, Music, Film, Reply, Check, CheckCheck } from 'lucide-react';

// --- INTEGRATED SWIPE WRAPPER ---
interface SwipeProps {
  children: React.ReactNode;
  onReply: () => void;
  isMe: boolean;
  disabled?: boolean;
}

const SwipeableWrapper: React.FC<SwipeProps> = ({ children, onReply, isMe, disabled }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const dragConstraints = isMe ? { left: -120, right: 0 } : { left: 0, right: 120 };
  
  // Icon animation values
  const opacity = useTransform(x, isMe ? [0, -70] : [0, 70], [0, 1]);
  const scale = useTransform(x, isMe ? [0, -70] : [0, 70], [0.4, 1.2]);
  const rotate = useTransform(x, isMe ? [0, -70] : [0, 70], isMe ? [90, 0] : [-90, 0]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (disabled) return;
    const threshold = 70;
    const shouldReply = isMe ? info.offset.x < -threshold : info.offset.x > threshold;

    if (shouldReply) {
      onReply();
      if (navigator.vibrate) navigator.vibrate(40);
    }
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
  };

  return (
    <div className="relative w-full overflow-visible">
      {/* Background Reply Icon */}
      <div className={`absolute inset-y-0 flex items-center ${isMe ? 'right-0 pr-10' : 'left-0 pl-10'}`}>
        <motion.div style={{ opacity, scale, rotate }} className="w-9 h-9 rounded-full glass-high flex items-center justify-center text-blue-400 border border-white/10 shadow-xl">
          <Reply size={18} />
        </motion.div>
      </div>
      
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={dragConstraints}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className="z-10 relative"
      >
        {children}
      </motion.div>
    </div>
  );
};

// --- MESSAGE BUBBLE COMPONENT ---
interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: {url: string, type: 'image' | 'video'}[]) => void;
  onSelectTrack?: (track: Track) => void;
  onReply?: (message: Message) => void;
}

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack, onReply }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const isMediaOnly = (message.type === 'image' || message.type === 'image-grid' || message.type === 'video' || message.type === 'music') && !isUnsent;

  // Messenger Style: Sharp corners on the sender's side
  const bubbleRadius = isMe 
    ? "rounded-[24px] rounded-tr-[4px]" 
    : "rounded-[24px] rounded-tl-[4px]";

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

  const renderMedia = () => {
    const rawItems = message.attachments && message.attachments.length > 0 ? message.attachments : [message.content];
    const mediaItems = rawItems.map(url => ({
      url,
      type: url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image'
    }));

    const gridClass = mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

    return (
      <div className={`grid ${gridClass} gap-1 mt-1 max-w-[280px] sm:max-w-[320px]`}>
        {mediaItems.map((item, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ scale: 0.98 }}
            onClick={() => !isSending && onMediaClick?.(item.url, mediaItems as any)}
            className={`relative aspect-square rounded-[20px] overflow-hidden bg-white/5 border border-white/10 ${mediaItems.length === 3 && idx === 2 ? 'col-span-2' : ''}`}
          >
            {item.type === 'video' ? (
              <video src={item.url} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={item.url} className="w-full h-full object-cover" alt="attachment" />
            )}
            {isSending && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                 <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <SwipeableWrapper onReply={() => onReply?.(message)} isMe={isMe} disabled={isSending}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-1 w-full px-4 group`}
        onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`flex gap-2.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar Area */}
          <div className="w-8 shrink-0 flex items-end mb-1">
            {!isMe && showAvatar && (
              <img src={message.senderAvatar} className="w-8 h-8 rounded-full border border-white/10 shadow-md" />
            )}
          </div>

          <div className="flex flex-col">
            {/* Sender Name (Only on first message of group) */}
            {showAvatar && !isMe && (
              <span className="text-[10px] font-bold text-white/30 ml-2 mb-1 uppercase tracking-widest">
                {message.senderName}
              </span>
            )}

            {/* Reply Thread Header */}
            {message.replyTo && (
              <div className={`flex flex-col mb-[-12px] pb-3 opacity-60 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="glass px-3 py-2 rounded-t-[18px] border border-white/5 text-[11px] flex items-center gap-2 max-w-[200px]">
                  <CornerUpLeft size={10} className="text-blue-400" />
                  <span className="truncate">{message.replyTo.content}</span>
                </div>
              </div>
            )}

            {/* Main Bubble */}
            <div className={`relative ${isMediaOnly ? '' : 'glass px-4 py-2.5'} ${bubbleRadius} 
              ${isMe && !isMediaOnly ? 'bg-blue-600/20 border-blue-500/20' : 'bg-white/5 border-white/10'} 
              shadow-lg transition-all duration-200 active:scale-[0.98] cursor-default`}
            >
              {message.type === 'text' && (
                <p className="text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">{message.content}</p>
              )}
              
              {(message.type === 'image' || message.type === 'video' || message.type === 'image-grid') && renderMedia()}

              {message.type === 'music' && (
                 <div onClick={() => onSelectTrack?.(JSON.parse(message.content))} className="flex items-center gap-3 p-2 glass rounded-2xl cursor-pointer">
                    <Music size={20} className="text-cyan-400" />
                    <div className="flex flex-col"><span className="text-xs font-bold text-white">Music Track</span></div>
                 </div>
              )}

              {/* Reaction Badge */}
              {message.reactions && message.reactions.length > 0 && (
                <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} glass-high px-1.5 py-0.5 rounded-full border border-white/20 text-[11px] shadow-xl flex gap-0.5`}
                >
                  {message.reactions.map((r, i) => <span key={i}>{r}</span>)}
                </motion.div>
              )}
            </div>

            {/* Timestamp & Status Icon */}
            <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
               <span className="text-[9px] text-white/20 font-bold">
                 {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
               {isMe && (
                 <div className="text-blue-500/40">
                    {isSending ? <div className="w-2 h-2 rounded-full border border-current animate-pulse" /> : <CheckCheck size={10} />}
                 </div>
               )}
            </div>
          </div>
        </div>
      </motion.div>
    </SwipeableWrapper>
  );
};

export default MessageBubble;
