import React, { useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Track } from '../types';
import { Play, CheckCheck } from 'lucide-react';
import SwipeableMessage from './SwipeableMessage';

/* ----------------------------------------
   DEVICE PERFORMANCE DETECTION
----------------------------------------- */
const isLowEnd =
  typeof navigator !== 'undefined' &&
  ((navigator as any).deviceMemory <= 2 ||
    navigator.hardwareConcurrency <= 4);

/* ----------------------------------------
   GPU-ONLY ANIMATION VARIANTS
----------------------------------------- */
const messageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 30,
      mass: 0.7
    }
  }
};

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onReply?: (message: Message) => void;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, all: { url: string; type: 'image' | 'video' }[]) => void;
  onSelectTrack?: (track: Track) => void;
}

const MessageBubble: React.FC<Props> = ({
  message,
  isMe,
  showAvatar,
  onReply,
  onOpenMenu,
  onMediaClick,
  onSelectTrack
}) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSending = message.status === 'sending';
  const isText = message.type === 'text';

  /* ----------------------------------------
     MEDIA PARSER
  ----------------------------------------- */
  const mediaItems = useMemo(() => {
    if (!message.attachments?.length)
      return [{ url: message.content, type: 'image' as const }];

    return message.attachments.map(url => ({
      url,
      type: /\.(mp4|webm|mov|ogg)$/i.test(url) ? 'video' : 'image'
    }));
  }, [message.attachments, message.content]);

  /* ----------------------------------------
     LONG PRESS MENU
  ----------------------------------------- */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => {
      navigator.vibrate?.(40);
      onOpenMenu(e, message);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  /* ----------------------------------------
     MESSAGE CONTENT
  ----------------------------------------- */
  const renderContent = () => {
    switch (message.type) {
      case 'music': {
        try {
          const track = JSON.parse(message.content) as Track;
          return (
            <motion.div
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectTrack?.(track)}
              className="flex gap-3 p-2.5 bg-white/[0.04] border border-white/5 rounded-2xl cursor-pointer min-w-[220px]"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0">
                <img src={track.albumArt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play size={16} fill="white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold truncate">{track.title}</p>
                <p className="text-[10px] text-white/40 truncate uppercase tracking-widest">
                  {track.artist}
                </p>
              </div>
            </motion.div>
          );
        } catch {
          return null;
        }
      }

      case 'image':
      case 'video':
      case 'image-grid':
        return (
          <div className={`grid ${mediaItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1`}>
            {mediaItems.map((item, i) => (
              <div
                key={i}
                onClick={() => onMediaClick?.(item.url, mediaItems)}
                className="relative aspect-square rounded-[22px] overflow-hidden bg-white/[0.03]"
              >
                {item.type === 'video' ? (
                  <video src={item.url} muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <p className="text-[15px] leading-relaxed font-medium text-white/95">
            {message.content}
          </p>
        );
    }
  };

  /* ----------------------------------------
     RENDER
  ----------------------------------------- */
  return (
    <SwipeableMessage
      isMe={isMe}
      onReply={() => onReply?.(message)}
    >
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        layout={!isLowEnd}
        style={{ willChange: 'transform, opacity' }}
        className={`flex flex-col w-full px-3 ${isMe ? 'items-end' : 'items-start'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={e => {
          e.preventDefault();
          onOpenMenu?.(e, message);
        }}
      >
        <div className={`flex gap-2 max-w-[88%] ${isMe ? 'flex-row-reverse' : ''}`}>
          {!isMe && showAvatar ? (
            <img
              src={message.senderAvatar}
              className="w-8 h-8 rounded-full border border-white/10 self-end"
            />
          ) : !isMe ? (
            <div className="w-8" />
          ) : null}

          <div className="flex flex-col">
            {!isMe && showAvatar && (
              <span className="text-[10px] font-bold text-white/40 mb-1 ml-2">
                {message.senderName}
              </span>
            )}

            <div
              className={`group relative
                ${isText
                  ? isMe
                    ? 'bg-blue-600/15 border-blue-500/20 rounded-[22px] rounded-tr-[4px]'
                    : 'bg-white/[0.08] border-white/10 rounded-[22px] rounded-tl-[4px]'
                  : ''}
                border px-4 py-2.5 backdrop-blur-xl`}
            >
              {renderContent()}

              <div className="absolute -bottom-4 right-1 opacity-0 group-hover:opacity-40 transition-opacity">
                <span className="text-[9px] tabular-nums">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {isMe && !isSending && <CheckCheck size={10} className="inline ml-1" />}
              </div>
            </div>

            <AnimatePresence>
              {!!message.reactions?.length && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex gap-1 bg-[#121212] border border-white/10 px-2 py-0.5 rounded-full mt-1 shadow-xl"
                >
                  {message.reactions.map((r, i) => (
                    <span key={i} className="text-[10px]">
                      {r}
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </SwipeableMessage>
  );
};

/* ----------------------------------------
   MEMO OPTIMIZATION
----------------------------------------- */
export default memo(MessageBubble, (p, n) => {
  return (
    p.message.id === n.message.id &&
    p.message.content === n.message.content &&
    p.message.status === n.message.status &&
    p.message.reactions?.length === n.message.reactions?.length &&
    p.showAvatar === n.showAvatar
  );
});
