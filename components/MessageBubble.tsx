import React, { useRef, memo } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { Message, Track } from '../types';
import { CheckCheck, Reply } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (
    url: string,
    allMedia: { url: string; type: 'image' | 'video' }[]
  ) => void;
  onSelectTrack?: (track: Track) => void;
  onReply?: (message: Message) => void;
}

const messageVariants = {
  initial: { opacity: 0, y: 4, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 350 },
  },
};

/* ================= Swipe Wrapper ================= */

const SwipeableWrapper: React.FC<{
  children: React.ReactNode;
  isMe: boolean;
  onReply?: () => void;
}> = ({ children, isMe, onReply }) => {
  const controls = useAnimation();
  const x = useMotionValue(0);

  const dragThreshold = 55;
  const dragConstraints = isMe ? { left: -80, right: 0 } : { left: 0, right: 80 };

  const opacity = useTransform(x, [-dragThreshold, 0, dragThreshold], [1, 0, 1]);
  const scale = useTransform(x, [-dragThreshold, 0, dragThreshold], [1.2, 0.7, 1.2]);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offset = info.offset.x;

    if ((!isMe && offset > dragThreshold) || (isMe && offset < -dragThreshold)) {
      onReply?.();
      if (navigator.vibrate) navigator.vibrate(40);
    }

    await controls.start({
      x: 0,
      transition: { type: 'spring', stiffness: 350, damping: 30 },
    });
  };

  return (
    <div className={`relative w-full flex ${isMe ? 'justify-end' : 'justify-start'} py-[1px]`}>
      <div className={`absolute ${isMe ? 'right-2' : 'left-2'} pointer-events-none`}>
        <motion.div
          style={{ opacity, scale }}
          className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"
        >
          <Reply size={14} />
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="max-w-[92%]"
      >
        {children}
      </motion.div>
    </div>
  );
};

/* ================= Message Bubble ================= */

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

  /* ================= Reply Preview ================= */

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;

    const reply = message.replyTo;

    return (
      <div className="px-2 py-1 bg-white/10 border-l-2 border-blue-400 rounded-xl mb-1 max-w-[220px] overflow-hidden">
        <p className="text-[10px] text-white/50 truncate mb-1">
          Replying to {reply.senderName || 'User'}
        </p>

        {/* IMAGE */}
        {reply.type === 'image' && (
          <img
            src={reply.content}
            className="w-20 h-20 rounded-md object-cover"
            loading="lazy"
          />
        )}

        {/* VIDEO */}
        {reply.type === 'video' && (
          <div className="w-20 h-20 rounded-md bg-black/40 flex items-center justify-center text-xs text-white/60">
            🎥 Video
          </div>
        )}

        {/* MUSIC */}
        {reply.type === 'music' && (() => {
          try {
            const track = JSON.parse(reply.content) as Track;
            return (
              <div className="flex items-center gap-2">
                <img
                  src={track.albumArt}
                  className="w-10 h-10 rounded-md object-cover"
                />
                <div className="min-w-0">
                  <p className="text-[11px] text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-[9px] text-white/50 truncate">
                    {track.artist}
                  </p>
                </div>
              </div>
            );
          } catch {
            return <p className="text-xs text-white/50">🎵 Music</p>;
          }
        })()}

        {/* TEXT */}
        {(!reply.type || reply.type === 'text') && (
          <p className="text-[11px] text-white/70 truncate">
            {reply.content}
          </p>
        )}
      </div>
    );
  };

  /* ================= Main Content ================= */

  const renderContent = () => {
    if (message.isUnsent)
      return <p className="text-[12px] italic text-white/30">Message removed</p>;

    if (isText) {
      return (
        <p className="text-[14px] leading-snug font-medium text-white">
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
            className="flex items-center gap-2 p-2 bg-white/5 rounded-xl cursor-pointer active:scale-95 transition"
          >
            <img
              src={track.albumArt}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{track.title}</p>
              <p className="text-xs text-white/50 truncate">
                {track.artist}
              </p>
            </div>
          </div>
        );
      } catch {
        return null;
      }
    }

    if (message.type === 'image' || message.type === 'video') {
      return (
        <div
          onClick={() =>
            onMediaClick?.(message.content, [
              { url: message.content, type: message.type },
            ])
          }
          className="relative w-[230px] rounded-xl overflow-hidden cursor-pointer active:scale-95 transition"
        >
          {message.type === 'video' ? (
            <video
              src={message.content}
              className="w-full object-cover"
              muted
              playsInline
            />
          ) : (
            <img
              src={message.content}
              className="w-full object-cover"
              loading="lazy"
              draggable={false}
            />
          )}

          {isSending && (
            <div className="absolute inset-0 bg-black/50 animate-pulse" />
          )}
        </div>
      );
    }

    return null;
  };

  /* ================= UI ================= */

  return (
    <SwipeableWrapper isMe={isMe} onReply={() => onReply?.(message)}>
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenMenu?.(e, message);
        }}
      >
        <div className="flex gap-[3px] max-w-[92%]">
          <div
            className={`relative px-3 py-2 rounded-2xl transition-all duration-300
              ${isText
                ? isMe
                  ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white'
                  : 'bg-white/10 text-white'
                : 'p-0 bg-transparent'
              }
            `}
          >
            {renderReplyPreview()}
            {renderContent()}

            {/* Hover time */}
            {isMe && !isSending && (
              <span className="absolute -bottom-4 right-2 text-[9px] text-white/40 opacity-0 group-hover:opacity-100 transition">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </SwipeableWrapper>
  );
};

export default memo(MessageBubble, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.status === next.message.status &&
    prev.showAvatar === next.showAvatar
  );
});
