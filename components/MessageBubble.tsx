import React, { useRef, memo } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Message, Track } from '../types';
import { CheckCheck, Reply } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: { url: string; type: 'image' | 'video' }[]) => void;
  onSelectTrack?: (track: Track) => void;
  onReply?: (message: Message) => void;
}

const messageVariants = {
  initial: { opacity: 0, y: 5, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 500, mass: 0.5 } },
};

// --- Swipeable wrapper for reply gesture ---
const SwipeableWrapper: React.FC<{ children: React.ReactNode; isMe: boolean; onReply?: () => void; }> = ({ children, isMe, onReply }) => {
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
      if (navigator.vibrate) navigator.vibrate(40);
    }
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 35 } });
  };

  return (
    <div className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} py-0.5`}>
      {/* Reply icon */}
      <div className={`absolute flex items-center justify-center pointer-events-none ${isMe ? 'right-3' : 'left-3'}`}>
        <motion.div
          style={{ opacity, scale, rotate }}
          className="w-8 h-8 rounded-full bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400 border border-blue-500/20"
        >
          <Reply size={16} strokeWidth={2.5} />
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className="z-10 relative max-w-[88%] will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};

const MessageBubble: React.FC<Props> = ({ message, isMe, showAvatar, onOpenMenu, onMediaClick, onSelectTrack, onReply }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSending = message.status === 'sending';
  const isText = message.type === 'text' || message.isUnsent;
  const firstName = message.senderName ? message.senderName.split(' ')[0] : 'User';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      navigator.vibrate?.(40);
      onOpenMenu(e, message);
    }, 450);
  };

  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const renderContent = () => {
    if (message.isUnsent) return <p className="text-[13px] text-white/30 italic">Message removed</p>;

    if (message.type === 'text' || message.isUnsent) {
      return (
        <p className="text-[14px] leading-snug font-medium text-white/95">
          {message.content}
        </p>
      );
    }

    if (message.type === 'music') {
      try {
        const track = JSON.parse(message.content) as Track;
        return (
          <div
            onClick={() => onSelectTrack?.(track)}
            className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 rounded-xl cursor-pointer min-w-[200px] active:scale-95 transition-transform"
          >
            <img src={track.albumArt} className="w-10 h-10 rounded-lg object-cover shadow-lg" loading="lazy" />
            <div className="flex-1 min-w-0">
              <h4 className="text-[13px] font-bold text-white truncate">{track.title}</h4>
              <p className="text-[10px] text-white/40 truncate uppercase tracking-widest">{track.artist}</p>
            </div>
          </div>
        );
      } catch { return null; }
    }

    if (message.type === 'image' || message.type === 'video') {
      return (
        <div
          onClick={() => onMediaClick?.(message.content, [])}
          className="relative aspect-square w-[200px] rounded-xl overflow-hidden bg-white/[0.02] shadow-2xl"
        >
          {message.type === 'video' ? (
            <video src={message.content} className="w-full h-full object-cover" muted playsInline />
          ) : (
            <img src={message.content} className="w-full h-full object-cover" loading="lazy" />
          )}
          {isSending && <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-pulse" />}
        </div>
      );
    }

    return null;
  };

  return (
    <SwipeableWrapper isMe={isMe} onReply={() => onReply?.(message)}>
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        style={{ willChange: 'transform, opacity' }}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
      >
        {!isMe && showAvatar && (
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.15em] mb-0.5 ml-1">{firstName}</span>
        )}

        <div className={`flex gap-1 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMe && showAvatar ? (
            <div className="w-6 h-6 rounded-full border border-white/10 shrink-0 overflow-hidden shadow-md">
              <img src={message.senderAvatar} className="w-full h-full object-cover" alt="" />
            </div>
          ) : !isMe ? <div className="w-1" /> : null}

          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <div
              className={`
                relative px-3 py-2 rounded-2xl
                ${isText
                  ? isMe
                    ? 'bg-gradient-to-br from-blue-500/80 to-blue-600/90 text-white shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
                    : 'bg-gradient-to-br from-gray-700/70 to-gray-800/80 text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                  : 'p-0 bg-transparent'}
              `}
            >
              {renderContent()}
            </div>

            {isMe && !isSending && (
              <div className="flex items-center gap-0.5 mt-0.5 justify-end text-[8px] text-white/50">
                <span className="tabular-nums">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <CheckCheck size={10} className="text-blue-400" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </SwipeableWrapper>
  );
};

export default memo(MessageBubble, (prev, next) =>
  prev.message.id === next.message.id &&
  prev.message.status === next.message.status &&
  prev.showAvatar === next.showAvatar
);
