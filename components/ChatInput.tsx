import React, { useState, useRef, useEffect, useCallback, memo, useMemo, useLayoutEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, Search, CornerUpLeft, Edit2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Message, Track } from '../types';

// Optimized Animation Constants
const BEZIER_FAST = [0.23, 1, 0.32, 1]; // Power4 out
const SPRING_SNAPPY = { type: "spring", stiffness: 600, damping: 35, mass: 1 };
const SPRING_SHEET = { type: "spring", stiffness: 400, damping: 40, mass: 1 };

const GROUP_ID = 'group-1';
const EMOJI_LIST = ['❤️', '😂', '🔥', '🙌', '😮', '😢', '💯', '✨', '🎵', '🎹', '🎸', '🎧', '⚡️', '🚀', '💎', '👑'];

const ChatInput: React.FC<any> = ({ 
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

  // --- Auto-growing Textarea (Zero Flicker) ---
  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'inherit';
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [text]);

  // --- Optimized Typing Status ---
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDocRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (isTyping) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setDoc(typingDocRef, { name: user.displayName || 'Someone', timestamp: Date.now() }, { merge: true });
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

  const handleSend = () => {
    if (selectedMedia.length > 0) {
      onSendMedia(selectedMedia, selectedMedia.some(f => f.type.startsWith('video/')) ? 'video' : 'image');
      setSelectedMedia([]);
      setMediaPreviews([]);
    }
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
    setShowEmojiPicker(false);
    setIsExpanded(false);
  };

  return (
    <footer className="relative w-full max-w-4xl mx-auto px-4 pb-6 transform-gpu">
      <LayoutGroup>
        {/* 1. TOP OVERLAYS (Reply/Media) */}
        <div className="flex flex-col gap-2 mb-3 px-2">
          <AnimatePresence mode="popLayout">
            {mediaPreviews.length > 0 && (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="flex gap-2 overflow-x-auto no-scrollbar py-2"
              >
                {mediaPreviews.map((m, i) => (
                  <motion.div layout key={m.url} className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                      {m.type === 'video' ? <video src={m.url} className="w-full h-full object-cover" /> : <img src={m.url} className="w-full h-full object-cover" />}
                    </div>
                    <button onClick={() => setMediaPreviews(p => p.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"><X size={12}/></button>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {(replyingTo || editingMessage) && (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 p-3 rounded-2xl flex items-center justify-between shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-8 rounded-full ${editingMessage ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}
                    </p>
                    <p className="text-sm text-white/80 truncate pr-4">{editingMessage ? editingMessage.content : replyingTo?.content}</p>
                  </div>
                </div>
                <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-2 hover:bg-white/5 rounded-full"><X size={16} className="text-white/30"/></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. MAIN INPUT PILL */}
        <motion.div 
          layout
          transition={SPRING_SNAPPY}
          className="relative bg-zinc-900/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex items-end gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
        >
          {/* Action Menu (Plus Button) */}
          <div className="flex items-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-300 ${isExpanded ? 'bg-white text-black' : 'bg-white/5 text-white'}`}
            >
              <Plus size={24} className={`transition-transform duration-500 ease-out ${isExpanded ? 'rotate-45' : 'rotate-0'}`} />
            </motion.button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, x: -10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 8, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.9 }}
                  className="absolute left-14 flex items-center gap-1.5 bg-zinc-800/90 backdrop-blur-xl border border-white/10 p-1 rounded-full"
                >
                  <ActionIcon icon={<Camera size={18}/>} color="text-blue-400" onClick={() => {}} />
                  <ActionIcon icon={<Image size={18}/>} color="text-purple-400" onClick={() => {}} />
                  <ActionIcon icon={<MusicIcon size={18}/>} color="text-emerald-400" onClick={() => setShowMusicSelector(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea Field */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-[16px] py-3 text-white placeholder:text-white/20 resize-none no-scrollbar leading-[1.4]"
            onFocus={() => { setIsExpanded(false); setShowEmojiPicker(false); }}
          />

          {/* Right Actions */}
          <div className="flex items-center gap-1 pr-1">
            <motion.button 
              whileTap={{ scale: 0.8 }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showEmojiPicker ? 'text-blue-400' : 'text-white/30'}`}
            >
              <Smile size={22} />
            </motion.button>

            <motion.button
              layout
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${text.trim() || selectedMedia.length > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-white/20'}`}
            >
              <AnimatePresence mode="wait">
                {text.trim() || selectedMedia.length > 0 ? (
                  <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                    <Send size={18} className="ml-0.5" />
                  </motion.div>
                ) : (
                  <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Mic size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: -15, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full right-0 p-3 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl grid grid-cols-4 gap-2 z-[110]"
              >
                {EMOJI_LIST.map(e => (
                  <button key={e} onClick={() => setText(t => t + e)} className="w-10 h-10 text-xl hover:bg-white/5 rounded-xl transition-all active:scale-75">{e}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* 3. MUSIC SELECTOR (The "Butter" Sheet) */}
      <AnimatePresence>
        {showMusicSelector && (
          <MusicSheet 
            tracks={libraryTracks} 
            onClose={() => setShowMusicSelector(false)} 
            onSelect={(t: Track) => { onSendTrack?.(t); setShowMusicSelector(false); }} 
          />
        )}
      </AnimatePresence>
    </footer>
  );
};

// --- Sub-components with focus on animation ---

const ActionIcon = ({ icon, color, onClick }: any) => (
  <motion.button 
    whileTap={{ scale: 0.8 }}
    onClick={onClick}
    className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 ${color} transition-colors`}
  >
    {icon}
  </motion.button>
);

const MusicSheet = ({ tracks, onClose, onSelect }: any) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => 
    tracks.filter((t: any) => t.title.toLowerCase().includes(q.toLowerCase()) || t.artist.toLowerCase().includes(q.toLowerCase()))
  , [q, tracks]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
      />
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING_SHEET}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
        className="fixed bottom-0 left-0 right-0 h-[80vh] bg-zinc-950 rounded-t-[40px] border-t border-white/10 z-[201] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
        
        <div className="px-6 pb-4 shrink-0">
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 h-12 border border-white/5 focus-within:border-blue-500/50 transition-all">
            <Search size={18} className="text-white/20" />
            <input 
              autoFocus
              className="flex-1 bg-transparent outline-none text-white text-sm"
              placeholder="Search library..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 no-scrollbar pb-10">
          <AnimatePresence mode="popLayout">
            {filtered.map((t: any, i: number) => (
              <motion.button
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.2), ease: BEZIER_FAST }}
                onClick={() => onSelect(t)}
                className="w-full flex items-center gap-4 p-3 hover:bg-white/[0.03] active:bg-white/[0.06] rounded-2xl transition-all group"
              >
                <img src={t.albumArt} className="w-14 h-14 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-500" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{t.artist}</p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-full text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={16} />
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default memo(ChatInput);
