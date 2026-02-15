import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, CornerUpLeft, Edit2, Film, Search } from 'lucide-react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const GROUP_ID = 'group-1';
const EMOJI_LIST = ['❤️', '😂', '🔥', '🙌', '😮', '😢', '💯', '✨', '🎵', '🎹', '🎸', '🎧', '⚡️', '🚀', '💎', '👑'];

const ChatInput: React.FC<Props> = ({ 
  onSend, onSendMedia, onSendTrack, libraryTracks = [], 
  replyingTo, onCancelReply, editingMessage, onCancelEdit 
}) => {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- Optimized Typing Logic ---
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDocRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (isTyping) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        await setDoc(typingDocRef, {
          name: user.displayName || 'Someone',
          avatar: user.photoURL || 'https://picsum.photos/200',
          timestamp: Date.now()
        }, { merge: true });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => updateTypingStatus(false), 3000);
    } else {
      isTypingRef.current = false;
      await deleteDoc(typingDocRef);
    }
  }, []);

  useEffect(() => {
    if (text.length > 0) updateTypingStatus(true);
    else updateTypingStatus(false);
  }, [text, updateTypingStatus]);

  // Handle Send
  const handleSend = () => {
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
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
    setShowEmojiPicker(false);
    updateTypingStatus(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 relative z-50">
      {/* Hidden Inputs */}
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e)} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFileSelect(e)} />

      {/* --- Floating Emoji Picker --- */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full mb-4 right-4 p-3 bg-black/80 backdrop-blur-2xl rounded-[24px] border border-white/10 shadow-2xl z-[100] grid grid-cols-4 gap-2"
          >
            {EMOJI_LIST.map((emoji) => (
              <button 
                key={emoji} 
                onClick={() => setText(prev => prev + emoji)}
                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-all active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Media Previews --- */}
      <AnimatePresence>
        {mediaPreviews.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex gap-3 mb-4 overflow-x-auto no-scrollbar pb-2"
          >
            {mediaPreviews.map((item, idx) => (
              <div key={idx} className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" />
                )}
                <button 
                  onClick={() => {
                    URL.revokeObjectURL(item.url);
                    setSelectedMedia(prev => prev.filter((_, i) => i !== idx));
                    setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white/80 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Input Console --- */}
      <div className="relative group">
        {/* Reply/Edit Indicator */}
        <AnimatePresence>
          {(replyingTo || editingMessage) && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full left-4 right-4 mb-[-20px] pb-[30px] z-[-1]"
            >
              <div className={`flex items-center justify-between p-3 rounded-t-[20px] bg-white/[0.03] backdrop-blur-md border border-white/10 border-b-0`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-1 h-6 rounded-full ${editingMessage ? 'bg-blue-500' : 'bg-blue-400'}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                      {editingMessage ? 'Editing' : 'Reply to'}
                    </span>
                    <span className="text-xs text-white/50 truncate max-w-[200px]">
                      {editingMessage ? editingMessage.content : replyingTo?.content}
                    </span>
                  </div>
                </div>
                <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={14} className="text-white/40" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Pill */}
        <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[32px] border border-white/10 p-2 flex items-end gap-2 shadow-2xl transition-all group-focus-within:bg-white/[0.06] group-focus-within:border-white/20">
          
          {/* Quick Actions Menu */}
          <div className="relative flex items-center">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-white text-black rotate-45' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              <Plus size={22} />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -10 }}
                  className="absolute left-14 flex items-center gap-2 bg-black/40 p-1.5 rounded-full border border-white/10 backdrop-blur-3xl"
                >
                  <ActionIcon icon={<Camera size={18} />} color="text-blue-400" onClick={() => cameraInputRef.current?.click()} />
                  <ActionIcon icon={<Image size={18} />} color="text-purple-400" onClick={() => galleryInputRef.current?.click()} />
                  <ActionIcon icon={<MusicIcon size={18} />} color="text-cyan-400" onClick={() => setShowMusicSelector(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Area */}
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20 resize-none max-h-32 py-3 px-2 min-h-[44px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2.5 rounded-full transition-colors ${showEmojiPicker ? 'text-blue-400 bg-blue-400/10' : 'text-white/30 hover:bg-white/5'}`}
            >
              <Smile size={20} />
            </button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${text.trim() || selectedMedia.length > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-white/20'}`}
            >
              {text.trim() || selectedMedia.length > 0 ? <Send size={18} /> : <Mic size={20} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* --- Music Selector Sheet --- */}
      <AnimatePresence>
        {showMusicSelector && (
          <MusicSelector 
            tracks={libraryTracks} 
            onClose={() => setShowMusicSelector(false)} 
            onSelect={(t) => { onSendTrack?.(t); setShowMusicSelector(false); }}
            search={musicSearch}
            setSearch={setMusicSearch}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-Components for Cleanliness ---

const ActionIcon = ({ icon, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${color}`}
  >
    {icon}
  </button>
);

const MusicSelector = ({ tracks, onClose, onSelect, search, setSearch }: any) => {
  const filtered = tracks.filter((t: Track) => t.title.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" />
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        className="fixed bottom-0 left-0 right-0 h-[60vh] bg-[#0a0a0a] rounded-t-[40px] border-t border-white/10 z-[201] flex flex-col p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter text-white">Share Music</h3>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 h-12 rounded-2xl pl-12 pr-4 outline-none text-white focus:border-blue-500/50 transition-all"
            placeholder="Search tracks..."
          />
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
          {filtered.map((track: Track) => (
            <button key={track.id} onClick={() => onSelect(track)} className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98]">
              <img src={track.albumArt} className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white truncate">{track.title}</p>
                <p className="text-[10px] uppercase font-black text-blue-400">{track.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
};

export default ChatInput;
