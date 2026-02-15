import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, Search, CornerUpLeft, Edit2 } from 'lucide-react';
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

// Snappy spring config for mobile keyboard feel
const transitionConfig = { type: "spring", stiffness: 500, damping: 40, mass: 1 };

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

  // --- Optimized Typing Status (Prevents Firestore Spam) ---
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
    if (text.length > 0) updateTypingStatus(true);
    else updateTypingStatus(false);
  }, [text, updateTypingStatus]);

  // Focus effect for Mobile Keyboard
  const handleFocus = () => {
    setIsExpanded(false);
    setShowEmojiPicker(false);
  };

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
    })) as any;
    
    setSelectedMedia(prev => [...prev, ...files]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    setIsExpanded(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-safe-area relative z-[100] transform-gpu">
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

      {/* 1. TOP PREVIEWS (Media & Reply) */}
      <div className="flex flex-col gap-2 mb-2">
        <AnimatePresence mode="popLayout">
          {mediaPreviews.length > 0 && (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {mediaPreviews.map((m, i) => (
                <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shrink-0 shadow-xl">
                  {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} className="w-full h-full object-cover" alt="" />}
                  <button onClick={() => setMediaPreviews(p => p.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"><X size={12}/></button>
                </div>
              ))}
            </motion.div>
          )}

          {(replyingTo || editingMessage) && (
            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-1 h-6 rounded-full ${editingMessage ? 'bg-blue-500' : 'bg-blue-400'}`} />
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1">
                    {editingMessage ? <Edit2 size={10}/> : <CornerUpLeft size={10}/>}
                    {editingMessage ? 'Editing' : 'Reply'}
                  </span>
                  <span className="text-xs text-white/50 truncate italic">{editingMessage ? editingMessage.content : replyingTo?.content}</span>
                </div>
              </div>
              <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-1.5 hover:bg-white/10 rounded-full"><X size={14} className="text-white/40" /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. MAIN INPUT PILL */}
      <motion.div layout transition={transitionConfig} className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-1.5 rounded-[32px] flex items-end gap-2 shadow-2xl relative">
        
        {/* Actions Menu */}
        <div className="relative flex items-center">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-white text-black' : 'bg-white/5 text-white/50'}`}
          >
            <Plus size={24} className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ opacity: 0, x: -20, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -20, scale: 0.8 }} className="absolute left-14 flex gap-2 bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-2xl">
                <ActionIcon icon={<Camera size={18}/>} onClick={() => cameraInputRef.current?.click()} color="text-blue-400" />
                <ActionIcon icon={<Image size={18}/>} onClick={() => galleryInputRef.current?.click()} color="text-purple-400" />
                <ActionIcon icon={<MusicIcon size={18}/>} onClick={() => setShowMusicSelector(true)} color="text-cyan-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text Field */}
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onFocus={handleFocus}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = '44px';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
          }}
          placeholder="Message..."
          className="flex-1 bg-transparent border-none outline-none text-[15px] py-3 text-white placeholder:text-white/20 resize-none no-scrollbar min-h-[44px]"
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
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showEmojiPicker ? 'text-blue-400 bg-blue-400/10' : 'text-white/30'}`}
          >
            <Smile size={22} />
          </button>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleSendInternal}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${text.trim() || selectedMedia.length > 0 ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/5 text-white/10'}`}
          >
            {text.trim() || selectedMedia.length > 0 ? <Send size={18} className="ml-0.5" /> : <Mic size={22} />}
          </motion.button>
        </div>

        {/* Floating Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className="absolute bottom-full mb-4 right-0 p-3 bg-black/90 backdrop-blur-2xl rounded-[28px] border border-white/10 shadow-2xl grid grid-cols-4 gap-2 z-[110]">
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => setText(p => p + e)} className="w-10 h-10 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl active:scale-90 transition-all">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Music Selector Sheet */}
      <AnimatePresence>
        {showMusicSelector && (
          <MusicSelector 
            tracks={libraryTracks} 
            onClose={() => setShowMusicSelector(false)} 
            onSelect={(t) => { onSendTrack?.(t); setShowMusicSelector(false); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Optimized Sub-Components ---

const ActionIcon = memo(({ icon, onClick, color }: any) => (
  <button onClick={onClick} className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 ${color} transition-all active:scale-90`}>
    {icon}
  </button>
));

const MusicSelector = memo(({ tracks, onClose, onSelect }: any) => {
  const [q, setQ] = useState('');
  const filtered = tracks.filter((t: any) => t.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 h-[70vh] bg-[#050505] rounded-t-[40px] border-t border-white/10 z-[201] flex flex-col p-6 overflow-hidden">
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input autoFocus className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 outline-none text-white focus:border-blue-500/40 transition-all" placeholder="Search tracks..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          {filtered.map((t: any) => (
            <button key={t.id} onClick={() => onSelect(t)} className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-95 group">
              <img src={t.albumArt} className="w-14 h-14 rounded-xl object-cover shadow-lg" alt="" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{t.title}</p>
                <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">{t.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
});

export default memo(ChatInput);
