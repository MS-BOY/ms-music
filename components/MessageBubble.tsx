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
  initial: { opacity: 0, y: 2, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 400 } },
};

// --- Swipeable reply gesture ---
const SwipeableWrapper: React.FC<{
  children: React.ReactNode;
  isMe: boolean;
  onReply?: () => void;
}> = ({ children, isMe, onReply }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const isDragging = useRef(false);

  const dragThreshold = 50;
  const dragConstraints = isMe ? { left: -80, right: 0 } : { left: 0, right: 80 };
  const inputMap = isMe ? [-dragThreshold, -10] : [10, dragThreshold];
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
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 350, damping: 30 } });
  };

  return (
    <div className={`relative w-full flex items-center ${isMe ? 'justify-end' : 'justify-start'} py-[2px]`}>
      <div className={`absolute flex items-center justify-center pointer-events-none ${isMe ? 'right-2' : 'left-2'}`}>
        <motion.div
          style={{ opacity, scale, rotate }}
          className="w-7 h-7 rounded-full bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400 border border-blue-500/20"
        >
          <Reply size={14} strokeWidth={2.2} />
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
        className="z-10 relative max-w-[90%] will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};

const MessageBubble: React.FC<Props> = ({
  message,
  isMe,
  showAvatar,
  onOpenMenu,
  onMediaClick,
  onSelectTrack,
  onReply,
}) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSending = message.status === 'sending';
  const isText = message.type === 'text' || message.isUnsent';
  const firstName = message.senderName?.split(' ')[0] || 'User';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40);
      onOpenMenu(e, message);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const renderContent = () => {
    if (message.isUnsent) return <p className="text-[12px] italic text-white/30">Message removed</p>;

    return (
      <div className="flex flex-col gap-[2px]">
        {message.replyTo && (
          <div className="px-2 py-1 bg-white/10 border-l-2 border-blue-400 rounded-xl mb-0.5">
            <p className="text-[10px] text-white/50 truncate">Replying to {message.replyTo.senderName}</p>
            <p className="text-[11px] text-white/70 truncate">{message.replyTo.content}</p>
          </div>
        )}

        {isText ? (
          <p className={`text-[14px] leading-snug font-medium ${isMe ? 'text-white' : 'text-white/95'}`}>
            {message.content}
          </p>
        ) : message.type === 'music' ? (
          (() => {
            try {
              const track = JSON.parse(message.content) as Track;
              return (
                <div
                  onClick={() => onSelectTrack?.(track)}
                  className="flex items-center gap-2 p-1.5 bg-white/[0.05] border border-white/5 rounded-xl cursor-pointer min-w-[200px] active:scale-95 transition-transform"
                >
                  <img src={track.albumArt} className="w-10 h-10 rounded-lg object-cover shadow-lg" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-white truncate">{track.title}</h4>
                    <p className="text-[10px] text-white/40 truncate uppercase tracking-widest">{track.artist}</p>
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()
        ) : message.type === 'image' || message.type === 'video' ? (
          <div
            onClick={() => onMediaClick?.(message.content, [])}
            className="relative aspect-square w-[200px] rounded-lg overflow-hidden bg-white/[0.02] shadow-2xl"
          >
            {message.type === 'video' ? (
              <video src={message.content} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={message.content} className="w-full h-full object-cover" />
            )}
            {isSending && <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-pulse" />}
          </div>
        ) : null}
      </div>
    );
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
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em] mb-[1px] ml-1">{firstName}</span>
        )}

        <div className={`flex gap-[2px] max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMe && showAvatar ? (
            <div className="w-5 h-5 rounded-full border border-white/10 shrink-0 overflow-hidden shadow-md">
              <img src={message.senderAvatar} className="w-full h-full object-cover" />
            </div>
          ) : !isMe ? <div className="w-[1px]" /> : null}

          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <div
              className={`
                relative px-2 py-1 rounded-2xl
                ${isText
                  ? isMe
                    ? 'bg-blue-600/90 rounded-tr-[6px]'
                    : 'bg-white/10 rounded-tl-[6px]'
                  : 'p-0 bg-transparent'}
              `}
            >
              {renderContent()}
            </div>

            {isMe && !isSending && (
              <div className="flex items-center gap-0.5 mt-[1px] justify-end text-[8px] text-white/50">
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

export default memo(MessageBubble, (prev, next) => {
  return prev.message.id === next.message.id &&
         prev.message.status === next.message.status &&
         prev.showAvatar === next.showAvatar;
});
