import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Track } from '../types';
import { CornerUpLeft, Play, Music, Film } from 'lucide-react';
import SwipeableMessage from './SwipeableMessage';

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
  const progress = message.uploadProgress || 0;
  const isMediaOnly = (message.type === 'image' || message.type === 'image-grid' || message.type === 'video' || message.type === 'music') && !isUnsent;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onOpenMenu || isSending) return;
    longPressTimer.current = setTimeout(() => onOpenMenu(e, message), 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const getMediaItems = (): {url: string, type: 'image' | 'video'}[] => {
    const rawItems = message.attachments && message.attachments.length > 0 ? message.attachments : [message.content];
    return rawItems.map(url => ({
      url,
      type: url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image'
    }));
  };

  // Helper to render the small preview inside a reply block
  const renderReplyPreviewContent = (reply: any) => {
    if (!reply) return null;

    switch (reply.type) {
      case 'image':
      case 'image-grid':
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0">
              <img src={reply.content} alt="" className="w-full h-full object-cover opacity-60" />
            </div>
            <span className="text-white/30 italic text-[10px]">Photo</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-black/40 shrink-0 relative">
              <video src={reply.content} className="w-full h-full object-cover opacity-60" />
              <Film size={10} className="absolute inset-0 m-auto text-white/50" />
            </div>
            <span className="text-white/30 italic text-[10px]">Video</span>
          </div>
        );
      case 'music':
        try {
          const track = JSON.parse(reply.content) as Track;
          return (
            <div className="flex items-center gap-2 bg-white/5 p-1 pr-2 rounded-xl border border-white/5 max-w-[180px]">
              <img src={track.albumArt} className="w-8 h-8 rounded-lg object-cover" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-bold text-white truncate">{track.title}</span>
                <span className="text-[8px] text-white/40 uppercase tracking-tighter truncate">{track.artist}</span>
              </div>
            </div>
          );
        } catch {
          return <span className="text-white/30 italic text-[10px]">Shared Music</span>;
        }
      default:
        return <span className="text-white/30 line-clamp-1 italic text-[10px]">{reply.content}</span>;
    }
  };

  const renderContent = () => {
    if (isUnsent) return <p className="text-[13px] leading-relaxed text-white/40 italic font-medium">{message.content}</p>;
    const mediaItems = getMediaItems();

    switch (message.type) {
      case 'music':
        try {
          const trackData = JSON.parse(message.content) as Track;
          return (
            <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => onSelectTrack?.(trackData)} className="flex items-center gap-4 p-3 glass-high rounded-[28px] border border-white/10 cursor-pointer shadow-xl min-w-[240px] max-w-[300px] overflow-hidden group bg-cyan-500/5">
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
          <div className={`grid ${gridClass} gap-1.5 mt-0.5 mb-0.5 max-w-[260px] sm:max-w-[320px] relative`}>
            {mediaItems.map((item, idx) => (
              <motion.div key={idx} whileHover={!isSending ? { scale: 1.01 } : {}} onClick={() => !isSending && onMediaClick?.(item.url, mediaItems)} className={`relative overflow-hidden rounded-[28px] bg-[#0a0a0a] border border-white/10 shadow-2xl ${!isSending ? 'cursor-pointer group' : 'cursor-default'} ${mediaItems.length === 3 && idx === 2 ? 'col-span-2' : ''}`}>
                <div className={`w-full h-full ${isSending ? 'blur-2xl opacity-50' : 'blur-0'}`}>
                  {item.type === 'video' ? (
                    <div className="relative aspect-square bg-black flex items-center justify-center">
                      <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 px-2 py-1 glass-high rounded-lg border border-white/10 flex items-center gap-1.5 pointer-events-none">
                        <Film size={10} className="text-blue-400" />
                        <span className="text-[8px] font-black uppercase text-white/80">Video</span>
                      </div>
                      {!isSending && <Play size={24} fill="white" className="absolute text-white ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  ) : (
                    <img src={item.url} alt="Shared" className="w-full h-full object-cover min-h-[140px]" />
                  )}
                </div>
                {isSending && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                        <motion.circle cx="24" cy="24" r="20" fill="transparent" stroke="#3B82F6" strokeWidth="3" strokeDasharray="126" animate={{ strokeDashoffset: 126 - (126 * progress) / 100 }} strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[220px] p-2 glass rounded-[20px] border border-white/5">
             <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20"><Music size={20} className="text-blue-400" /></div>
             <audio src={message.content} controls className="w-full h-8 opacity-60 scale-90 origin-left" />
          </div>
        );
      default:
        return <p className="text-[15px] leading-relaxed text-white/90">{message.content}</p>;
    }
  };

  return (
    <SwipeableMessage isMe={isMe} onReply={() => !isSending && !isUnsent && onReply?.(message)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(e, message); }}
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd} 
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} select-none w-full px-3 py-0.5`}
      >
        <div className={`flex gap-2.5 max-w-[88%] sm:max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          
          {!isMe && (
            <div className="w-9 shrink-0 flex items-end mb-1">
              {showAvatar ? (
                <div className="w-9 h-9 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                  <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-9" />
              )}
            </div>
          )}
          
          <div className="relative group flex flex-col min-w-0">
            {showAvatar && !isMe && (
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 ml-1">
                {message.senderName}
              </p>
            )}
            
            {message.replyTo && !isUnsent && (
              <div className={`mb-1.5 px-3 py-2 bg-white/[0.03] rounded-2xl border-l-2 border-blue-500/50 flex flex-col text-[11px] ${isMe ? 'self-end mr-1' : 'ml-1'} min-w-[120px]`}>
                 <div className="flex items-center gap-1.5 text-blue-400/80 font-black mb-1">
                   <CornerUpLeft size={10} />
                   <span className="uppercase tracking-tight truncate">{message.replyTo.senderName}</span>
                 </div>
                 {/* Visual Reply Preview for Images, Videos, and Music */}
                 {renderReplyPreviewContent(message.replyTo)}
              </div>
            )}
            
            <motion.div 
              className={`relative overflow-hidden transition-all duration-300 
                ${isMediaOnly ? 'bg-transparent p-0 shadow-none' : 'glass px-4 py-3 shadow-xl'} 
                ${!isMediaOnly && !isUnsent ? (isMe ? 'bg-blue-600/10 rounded-[24px] rounded-tr-[4px] border-blue-500/10' : 'bg-white/[0.05] rounded-[24px] rounded-tl-[4px] border-white/5') : ''} 
                ${isUnsent ? 'bg-white/[0.02] border border-white/[0.05] p-3 rounded-[20px] italic text-white/40' : ''}`}
            >
              {renderContent()}
              
              <div className={`flex items-center gap-2 ${isMediaOnly ? 'mt-1.5 px-2' : 'mt-2'} ${isMe ? 'justify-end' : 'justify-start'}`}>
                {message.isEdited && !isUnsent && <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Edited</span>}
                <span className="text-[9px] text-white/25 font-bold tabular-nums">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isSending && <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />}
              </div>
            </motion.div>

            {message.reactions && message.reactions.length > 0 && !isUnsent && (
              <motion.div 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                className={`absolute -bottom-2 ${isMe ? 'right-2' : 'left-2'} glass-high px-2 h-6 rounded-full flex items-center justify-center text-[12px] shadow-2xl border border-white/10 gap-0.5 z-10`}
              >
                {message.reactions.map((r, i) => <span key={i} className="drop-shadow-sm">{r}</span>)}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </SwipeableMessage>
  );
};

export default MessageBubble;
