import React, { useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Track } from '../types';
import { Play, CheckCheck } from 'lucide-react';

interface Props {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  onOpenMenu?: (e: React.MouseEvent | React.TouchEvent, message: Message) => void;
  onMediaClick?: (url: string, allMedia: {url: string, type: 'image' | 'video'}[]) => void;
  onSelectTrack?: (track: Track) => void;
}

const messageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.92, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', damping: 25, stiffness: 400, mass: 0.8 }
  }
};

const MessageBubble: React.FC<Props> = ({
  message,
  isMe,
  showAvatar,
  onOpenMenu,
  onMediaClick,
  onSelectTrack
}) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUnsent = message.isUnsent;
  const isSending = message.status === 'sending';
  const isText = message.type === 'text' || isUnsent;

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

  const getMediaItems = () =>
    (message.attachments?.length ? message.attachments : [message.content]).map(url => ({
      url,
      type: url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image'
    }));

  const renderContent = () => {
    if (isUnsent) return <p className="text-[13px] text-white/30 italic">Message removed</p>;

    switch (message.type) {
      case 'music':
        try {
          const track = JSON.parse(message.content) as Track;
          return (
            <motion.div
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectTrack?.(track)}
              className="flex items-center gap-3 p-2.5 bg-white/[0.04] border border-white/5 rounded-2xl cursor-pointer min-w-[240px]"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden relative">
                <img src={track.albumArt} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play size={16} fill="white" />
                </div>
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-bold truncate">{track.title}</h4>
                <p className="text-[10px] text-white/40 uppercase truncate">{track.artist}</p>
              </div>
            </motion.div>
          );
        } catch {
          return null;
        }

      case 'image':
      case 'video':
      case 'image-grid':
        const media = getMediaItems();
        return (
          <div className={`grid ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 max-w-[280px]`}>
            {media.map((m, i) => (
              <div
                key={i}
                onClick={() => onMediaClick?.(m.url, media)}
                className="relative aspect-square rounded-[22px] overflow-hidden bg-white/[0.03]"
              >
                {m.type === 'video' ? (
                  <video src={m.url} muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={m.url} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-[15px] leading-relaxed text-white/95">{message.content}</p>;
    }
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      layout
      className={`flex flex-col w-full px-3 mb-1 ${isMe ? 'items-end' : 'items-start'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
    >
      <div className={`flex gap-2 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
        
        {/* Avatar */}
        {!isMe && showAvatar ? (
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 self-end">
            <img src={message.senderAvatar} className="w-full h-full object-cover" />
          </div>
        ) : !isMe && <div className="w-8" />}

        <div className="flex flex-col">
          
          {/* ✅ USER NAME (ONLY OTHER USER) */}
          {!isMe && showAvatar && (
            <span className="text-[11px] text-white/40 font-semibold mb-0.5 ml-1">
              {message.senderName?.split(' ')[0]}
            </span>
          )}

          {/* Bubble */}
          <div
            className={`
              relative transition-all
              ${isText
                ? `px-4 py-2.5 backdrop-blur-2xl border shadow-xl
                   ${isMe
                     ? 'bg-blue-600/15 border-blue-500/20 rounded-[22px] rounded-tr-[4px]'
                     : 'bg-white/[0.08] border-white/10 rounded-[22px] rounded-tl-[4px]'}`
                : 'p-0'
              }
            `}
          >
            {renderContent()}

            {/* ✅ TIME — HIDDEN, SHOW ON HOVER */}
            <div
              className={`
                absolute -bottom-4 ${isMe ? 'right-2' : 'left-2'}
                text-[9px] font-bold opacity-0 group-hover:opacity-40
                transition-opacity duration-300 pointer-events-none
              `}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            {isMe && !isSending && (
              <CheckCheck
                size={10}
                className="absolute -bottom-4 right-0 opacity-0 group-hover:opacity-60 transition-opacity"
              />
            )}
          </div>

          {/* Reactions */}
          <AnimatePresence>
            {message.reactions?.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex gap-1 bg-[#121212] border border-white/10 px-2 py-0.5 rounded-full -mt-2 ml-2"
              >
                {message.reactions.map((r, i) => (
                  <span key={i} className="text-[10px]">{r}</span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
};

export default memo(MessageBubble);
