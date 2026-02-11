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
  initial: { opacity: 0, y: 4, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 500 }
  },
};

// ================= Swipe Wrapper =================
const SwipeableWrapper: React.FC<{
  children: React.ReactNode;
  isMe: boolean;
  onReply?: () => void;
}> = ({ children, isMe, onReply }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const dragThreshold = 50;

  const dragConstraints = isMe ? { left: -80, right: 0 } : { left: 0, right: 80 };
  const inputMap = isMe ? [-dragThreshold, -10] : [10, dragThreshold];

  const opacity = useTransform(x, inputMap, [1, 0]);
  const scale = useTransform(x, inputMap, [1.2, 0.7]);
  const rotate = useTransform(x, inputMap, isMe ? [-180, 0] : [0, 180]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;

    if ((!isMe && offset > dragThreshold) || (isMe && offset < -dragThreshold)) {
      onReply?.();
      if (navigator.vibrate) navigator.vibrate(40);
    }

    await controls.start({
      x: 0,
      transition: { type: 'spring', stiffness: 350, damping: 30 }
    });
  };

  return (
    <div className={`relative w-full flex items-end ${isMe ? 'justify-end' : 'justify-start'} py-0`}>
      <div className={`absolute ${isMe ? 'right-2' : 'left-2'} pointer-events-none`}>
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
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }}
        className="z-10 relative max-w-[90%]"
      >
        {children}
      </motion.div>
    </div>
  );
};

// ================= Message Bubble =================
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
  const isText = message.type === 'text' || message.isUnsent;
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

  // ================= Content Renderer =================
  const renderContent = () => {
    if (message.isUnsent)
      return <p className="text-[12px] italic text-white/30">Message removed</p>;

    return (
      <div className="flex flex-col gap-[2px]">

        {/* ===== Reply Preview (FIXED) ===== */}
        {message.replyTo && (
          <div className="px-2 py-1 bg-white/10 border-l-2 border-blue-400 rounded-xl mb-1 max-w-[200px] overflow-hidden">
            <p className="text-[10px] text-white/50 truncate mb-1">
              Replying to {message.replyTo.senderName}
            </p>

            {message.replyTo.type === 'image' ? (
              <img
                src={message.replyTo.content}
                className="w-16 h-16 object-cover rounded-md"
              />
            ) : message.replyTo.type === 'video' ? (
              <div className="w-16 h-16 bg-black/40 rounded-md flex items-center justify-center text-[10px] text-white/60">
                🎥 Video
              </div>
            ) : message.replyTo.type === 'music' ? (
              <div className="text-[11px] text-white/70 truncate">
                🎵 Music
              </div>
            ) : (
              <p className="text-[11px] text-white/70 truncate">
                {message.replyTo.content}
              </p>
            )}
          </div>
        )}

        {/* ===== Main Content ===== */}
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
                  className="flex items-center gap-2 p-2 bg-white/10 rounded-xl cursor-pointer active:scale-95 transition-transform"
                >
                  <img src={track.albumArt} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-white truncate">{track.title}</h4>
                    <p className="text-[10px] text-white/40 truncate uppercase tracking-widest">
                      {track.artist}
                    </p>
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()
        ) : message.type === 'image' || message.type === 'video' ? (
          <div
            onClick={() =>
              onMediaClick?.(
                message.content,
                [{ url: message.content, type: message.type }]
              )
            }
            className="relative aspect-square w-[220px] rounded-xl overflow-hidden bg-black/30 shadow-2xl cursor-pointer active:scale-95 transition-transform duration-200"
          >
            {message.type === 'video' ? (
              <video src={message.content} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={message.content} className="w-full h-full object-cover" draggable={false} />
            )}

            {isSending && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-pulse" />
            )}
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
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
      >
        {!isMe && showAvatar && (
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em] mb-[1px] ml-1">
            {firstName}
          </span>
        )}

        <div className={`flex gap-0 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isMe && showAvatar ? (
            <div className="w-5 h-5 rounded-full border border-white/10 overflow-hidden">
              <img src={message.senderAvatar} className="w-full h-full object-cover" />
            </div>
          ) : !isMe ? <div className="w-[1px]" /> : null}

          <div className="relative group">
            <div
              className={`
                relative px-3 py-1.5 rounded-2xl backdrop-blur-xl
                transition-all duration-300
                ${isText
                  ? isMe
                    ? 'bg-gradient-to-br from-blue-500/90 to-blue-700/80 rounded-tr-[6px] shadow-lg'
                    : 'bg-white/10 rounded-tl-[6px] shadow-lg'
                  : 'p-0 bg-transparent'}
              `}
            >
              {renderContent()}

              {isMe && !isSending && (
                <div className="absolute -bottom-4 right-2 flex items-center gap-1 text-[9px] text-white/50 opacity-0 group-hover:opacity-100 transition">
                  <span>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <CheckCheck size={10} className="text-blue-400" />
                </div>
              )}
            </div>
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
