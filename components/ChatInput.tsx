import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, Search, CornerUpLeft, Edit2, Check } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Message, Track } from '../types';

interface Props {
  onSend: (text: string) => void;
  onSendMedia: (files: File[], type: 'image' | 'video' | 'audio') => void;
  onSendTrack?: (track: Track) => void;
  libraryTracks?: Track[];
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
}

const GROUP_ID = 'group-1';
const EMOJI_LIST = ['❤️', '😂', '🔥', '🙌', '😮', '😢', '💯', '✨', '🎵', '🎹', '🎸', '🎧', '⚡️', '🚀', '💎', '👑'];

// "Apple-style" snappy spring physics
const SPRING_UI = { type: "spring", stiffness: 400, damping: 32, mass: 0.8 };
const SPRING_SHEET = { type: "spring", stiffness: 300, damping: 30, mass: 1 };

const ChatInput: React.FC<Props> = ({ 
  onSend, onSendMedia, onSendTrack, libraryTracks = [], 
  replyingTo, onCancelReply, editingMessage, onCancelEdit 
}) => {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- Optimized Typing Status ---
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDocRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (isTyping) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setDoc(typingDocRef, {
          name: user.displayName || 'Someone',
          avatar: user.photoURL || 'https://picsum.photos/200',
          timestamp: Date.now()
        }, { merge: true });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 3000);
    } else {
      isTypingRef.current = false;
      deleteDoc(typingDocRef);
    }
  }, []);

  useEffect(() => {
    updateTypingStatus(text.length > 0);
  }, [text, updateTypingStatus]);

  const handleSendInternal = () => {
    if (selectedMedia.length > 0) {
      const hasVideo = selectedMedia.some(f => f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo ? 'video' : 'image');
      mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
      setSelectedMedia([]);
      setMediaPreviews([]);
    }
    
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      if (inputRef.current) inputRef.current.style.height = '44px';
    }
    updateTypingStatus(false);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image'
    }));
    
    setSelectedMedia(prev => [...prev, ...files]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    setIsExpanded(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-safe-area relative z-[100] transform-gpu">
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

      {/* 1. PREVIEWS & REPLIES */}
      <div className="flex flex-col gap-2 mb-2">
        <AnimatePresence mode="popLayout">
          {mediaPreviews.length > 0 && (
            <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {mediaPreviews.map((m, i) => (
                <div key={m.url} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shrink-0 shadow-2xl">
                  {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} className="w-full h-full object-cover" alt="" />}
                  <button onClick={() => setMediaPreviews(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-black/60 backdrop-blur-md rounded-full text-white"><X size={12}/></button>
                </div>
              ))}
            </motion.div>
          )}

          {(replyingTo || editingMessage) && (
            <motion.div layout initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white/[0.05] backdrop-blur-3xl border border-white/10 p-3 rounded-[24px] flex items-center justify-between shadow-xl overflow-hidden relative group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-1 h-8 rounded-full ${editingMessage ? 'bg-amber-400' : 'bg-blue-500'}`} />
                <div className="flex flex-col truncate">
                  <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${editingMessage ? 'text-amber-400' : 'text-blue-500'}`}>
                    {editingMessage ? <Edit2 size={10}/> : <CornerUpLeft size={10}/>}
                    {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}
                  </span>
                  <span className="text-xs text-white/60 truncate italic pr-4">{editingMessage ? editingMessage.content : replyingTo?.content}</span>
                </div>
              </div>
              <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={16} className="text-white/40" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. MAIN INPUT PILL */}
      <motion.div layout transition={SPRING_UI} className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-1.5 rounded-[32px] flex items-end gap-2 shadow-2xl relative transform-gpu">
        
        {/* Expanded Actions */}
        <div className="relative flex items-center">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-white text-black rotate-45' : 'bg-white/5 text-white/50'}`}
          >
            <Plus size={24} />
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, x: -20, scale: 0.8 }} 
                animate={{ opacity: 1, x: 0, scale: 1 }} 
                exit={{ opacity: 0, x: -20, scale: 0.8 }} 
                className="absolute left-14 flex gap-2 bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-3xl"
              >
                <ActionIcon icon={<Camera size={18}/>} onClick={() => cameraInputRef.current?.click()} color="text-blue-400" delay={0} />
                <ActionIcon icon={<Image size={18}/>} onClick={() => galleryInputRef.current?.click()} color="text-purple-400" delay={0.05} />
                <ActionIcon icon={<MusicIcon size={18}/>} onClick={() => setShowMusicSelector(true)} color="text-emerald-400" delay={0.1} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text Input */}
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onFocus={() => { setIsExpanded(false); setShowEmojiPicker(false); }}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = '44px';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
          }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-[16px] py-3 text-white placeholder:text-white/20 resize-none no-scrollbar min-h-[44px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendInternal();
            }
          }}
        />

        {/* Right Side Buttons */}
        <div className="flex items-center gap-1.5 pr-1">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showEmojiPicker ? 'text-blue-400 bg-blue-400/10' : 'text-white/30 hover:text-white/50'}`}
          >
            <Smile size={22} />
          </button>

          <motion.button 
            whileTap={{ scale: 0.9, y: -2 }}
            onClick={handleSendInternal}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${text.trim() || selectedMedia.length > 0 ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/5 text-white/10'}`}
          >
            <AnimatePresence mode="wait">
              {text.trim() || selectedMedia.length > 0 ? (
                <motion.div key="send" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={SPRING_UI}>
                  <Send size={18} className="ml-0.5" />
                </motion.div>
              ) : (
                <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_UI}>
                  <Mic size={22} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Emoji Picker Popover */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 10, scale: 0.9 }} 
              className="absolute bottom-full mb-4 right-0 p-3 bg-[#121212]/95 backdrop-blur-2xl rounded-[28px] border border-white/10 shadow-2xl grid grid-cols-4 gap-2 z-[110]"
            >
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => setText(p => p + e)} className="w-10 h-10 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl active:scale-75 transition-all">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Music Selector Bottom Sheet */}
      <AnimatePresence>
        {showMusicSelector && (
          <MusicSelector 
            tracks={libraryTracks} 
            onClose={() => setShowMusicSelector(false)} 
            onSelect={(t: Track) => {
              onSendTrack?.(t);
              setShowMusicSelector(false);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ActionIcon = memo(({ icon, onClick, color, delay }: any) => (
  <motion.button 
    initial={{ scale: 0, y: 10 }}
    animate={{ scale: 1, y: 0 }}
    transition={{ ...SPRING_UI, delay }}
    onClick={onClick} 
    className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 ${color} transition-all active:scale-75`}
  >
    {icon}
  </motion.button>
));

const MusicSelector = memo(({ tracks, onClose, onSelect }: any) => {
  const [q, setQ] = useState('');
  
  const filtered = useMemo(() => 
    tracks.filter((t: any) => 
      t.title.toLowerCase().includes(q.toLowerCase()) || 
      t.artist.toLowerCase().includes(q.toLowerCase())
    ), [tracks, q]
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" 
      />
      
      {/* Draggable Sheet */}
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={SPRING_SHEET}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 150) onClose(); }}
        className="fixed bottom-0 left-0 right-0 h-[80vh] bg-[#0A0A0A] rounded-t-[40px] border-t border-white/10 z-[201] flex flex-col overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transform-gpu will-change-transform"
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Library</h2>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40"><X size={20}/></button>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              autoFocus 
              className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 outline-none text-white focus:border-blue-500/40 focus:bg-white/10 transition-all" 
              placeholder="Search tracks or artists..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-12 no-scrollbar">
          <div className="flex flex-col gap-1">
            <AnimatePresence mode="popLayout">
              {filtered.map((t: any, i: number) => (
                <motion.button 
                  key={t.id} 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  onClick={() => onSelect(t)} 
                  className="w-full flex items-center gap-4 p-3 hover:bg-white/[0.05] active:bg-white/[0.1] rounded-2xl transition-all group"
                >
                  <div className="relative shrink-0 overflow-hidden rounded-xl shadow-lg">
                    <img src={t.albumArt} className="w-14 h-14 object-cover transform group-hover:scale-110 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-semibold text-white truncate group-hover:text-blue-400 transition-colors">{t.title}</p>
                    <p className="text-[11px] font-bold uppercase text-white/30 tracking-widest truncate">{t.artist}</p>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pr-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-full text-blue-400">
                      <Plus size={18} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-white/20">
                <MusicIcon size={48} className="mb-4 opacity-5" />
                <p className="text-sm font-medium">No results found</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
});

export default memo(ChatInput);
