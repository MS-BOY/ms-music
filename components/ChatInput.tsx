import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion'; // Added PanInfo
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, CornerUpLeft, Edit2, Film, Search } from 'lucide-react';
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

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const GROUP_ID = 'group-1';

const EMOJI_LIST = ['❤️', '😂', '🔥', '🙌', '😮', '😢', '💯', '✨', '🎵', '🎹', '🎸', '🎧', '⚡️', '🌈', '💎', '👑', '🚀', '🛸', '👾', '🎉'];

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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Broadcaster for typing status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const typingDocRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (text.length > 0) {
      setDoc(typingDocRef, {
        name: user.displayName || 'Someone',
        avatar: user.photoURL || 'https://picsum.photos/200',
        timestamp: Date.now()
      }, { merge: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        deleteDoc(typingDocRef);
      }, 3000);
    } else {
      deleteDoc(typingDocRef);
    }
  }, [text]);

  useEffect(() => {
    if ((replyingTo || editingMessage) && inputRef.current) {
      inputRef.current.focus();
    }
    if (editingMessage) {
      setText(editingMessage.content);
    } else {
      setText('');
    }
  }, [replyingTo, editingMessage]);

  const handleSend = () => {
    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db, 'groups', GROUP_ID, 'typing', user.uid));
    }

    if (selectedMedia.length > 0) {
      const hasVideo = selectedMedia.some(f => f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo ? 'video' : 'image');
      
      mediaPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
      setSelectedMedia([]);
      setMediaPreviews([]);
      
      if (text.trim()) {
        onSend(text);
        setText('');
      }
    } else if (text.trim()) {
      onSend(text);
      setText('');
    }

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'camera' | 'gallery') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const newPreviews: {url: string, type: 'image' | 'video'}[] = [];

    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        alert(`Video ${file.name} exceeds 50MB limit.`);
        return;
      }

      if (isVideo || isImage) {
        validFiles.push(file);
        newPreviews.push({
          url: URL.createObjectURL(file),
          type: isVideo ? 'video' : 'image'
        });
      }
    });

    setSelectedMedia(prev => [...prev, ...validFiles]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    setIsExpanded(false);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    const item = mediaPreviews[index];
    if (item) URL.revokeObjectURL(item.url);
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // SWIPE TO DISMISS HANDLER
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) { // Swipe right 100px to cancel
      if (editingMessage) onCancelEdit?.();
      else onCancelReply?.();
    }
  };

  const filteredTracks = libraryTracks.filter(t => 
    t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(musicSearch.toLowerCase())
  );

  return (
    <div className="px-4 py-4 bg-transparent relative z-20 w-full max-w-4xl">
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileSelect(e, 'camera')} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFileSelect(e, 'gallery')} />

      {/* Emoji Picker Popover */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10, rotateX: 20 }}
            className="absolute bottom-full mb-4 right-4 glass-high p-4 rounded-[32px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[100] transform-style-3d bg-[#0a0a0a]/95 backdrop-blur-3xl"
          >
            <div className="grid grid-cols-5 gap-3">
              {EMOJI_LIST.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.3, rotate: 5, z: 20 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl p-2 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
            <div className="absolute -bottom-2 right-8 w-4 h-4 glass border-r border-b border-white/10 rotate-45 bg-[#0a0a0a]" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 10, height: 0 }} 
            animate={{ opacity: 1, y: 0, height: 'auto' }} 
            exit={{ opacity: 0, x: 200, opacity: 0 }} // Exits by sliding away
            drag="x"
            dragConstraints={{ left: 0, right: 150 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="mb-2 mx-1 overflow-hidden cursor-grab active:cursor-grabbing"
          >
            <div className={`glass flex items-center justify-between p-3 rounded-[24px] border ${editingMessage ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/10 bg-white/5'} backdrop-blur-md`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-1 h-8 ${editingMessage ? 'bg-blue-500' : 'bg-white/40'} rounded-full shrink-0`} />
                <div className="flex flex-col min-w-0">
                  <span className={`text-[10px] font-black text-blue-400 flex items-center gap-1 uppercase tracking-tight`}>
                    {editingMessage ? <Edit2 size={10} /> : <CornerUpLeft size={10} />}
                    {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}
                  </span>
                  <span className="text-xs text-white/60 truncate max-w-[200px]">{editingMessage?.content || replyingTo?.content}</span>
                </div>
              </div>
              <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={16} className="text-white/40" />
              </button>
            </div>
            <p className="text-[8px] text-white/10 uppercase font-black tracking-widest text-center mt-1">Swipe right to dismiss</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest of the component remains exactly the same... */}
      <AnimatePresence>
        {mediaPreviews.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 20, height: 0 }} className="mb-4 mx-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 pb-2">
              {mediaPreviews.map((item, idx) => (
                <motion.div key={item.url} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="relative flex-shrink-0 w-28 h-28 rounded-[24px] overflow-hidden shadow-2xl border border-white/10 bg-[#0a0a0a]">
                  {item.type === 'video' ? (
                    <div className="w-full h-full relative">
                      <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover brightness-75" muted playsInline />
                    </div>
                  ) : (
                    <img src={item.url} alt="preview" className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => removeMedia(idx)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500 transition-colors border border-white/10">
                    <X size={14} className="text-white" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout className="glass rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-2 flex items-end gap-2 bg-[#0a0a0a]/70 backdrop-blur-2xl relative transform-style-3d">
        <div className="relative">
          <motion.button 
            whileTap={{ scale: 0.9, rotate: 45 }} 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            <Plus size={24} className={`transition-transform duration-500 ${isExpanded ? 'rotate-45' : ''}`} />
          </motion.button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.8, rotateX: 30 }} 
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} 
                exit={{ opacity: 0, y: 20, scale: 0.8, rotateX: 30 }} 
                className="absolute left-0 bottom-full mb-4 glass-high p-2.5 rounded-[28px] flex flex-col gap-3 shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 z-50 bg-[#050505]/95"
              >
                <ActionButton icon={<Camera size={20} />} color="blue" onClick={() => cameraInputRef.current?.click()} label="Camera" />
                <ActionButton icon={<Image size={20} />} color="purple" onClick={() => galleryInputRef.current?.click()} label="Gallery" />
                <ActionButton icon={<MusicIcon size={20} />} color="cyan" onClick={() => { setIsExpanded(false); setShowMusicSelector(true); }} label="Music" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-h-[48px] flex items-center px-3">
          <textarea 
            ref={inputRef} 
            rows={1} 
            value={text} 
            onChange={handleInputChange} 
            placeholder={replyingTo ? "Compose reply..." : editingMessage ? "Revise message..." : "Type a message..."} 
            className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20 resize-none max-h-32 py-3.5" 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onFocus={() => setShowEmojiPicker(false)}
          />
        </div>
        
        <div className="flex items-center gap-1.5 px-1.5 pb-1.5">
          <motion.button 
            whileTap={{ scale: 0.85, z: 10 }}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showEmojiPicker ? 'text-yellow-400 bg-white/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'text-white/30 hover:bg-white/5'}`}
          >
            <Smile size={22} />
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.9, translateZ: 10 }} 
            onClick={(text || selectedMedia.length > 0) ? handleSend : undefined} 
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${(text || selectedMedia.length > 0) ? 'bg-blue-600 shadow-[0_10px_30px_rgba(59,130,246,0.4)] text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
          >
            {(text || selectedMedia.length > 0) ? <Send size={18} className="ml-0.5" /> : <Mic size={22} />}
          </motion.button>
        </div>
      </motion.div>

      {/* Music Selector Modal */}
      <AnimatePresence>
        {showMusicSelector && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl" onClick={() => setShowMusicSelector(false)} />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95, rotateX: 10 }} 
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} 
              exit={{ opacity: 0, y: 100, scale: 0.95, rotateX: 10 }} 
              className="fixed bottom-0 left-0 right-0 z-[201] glass-high rounded-t-[40px] border-t border-white/10 h-[70vh] flex flex-col bg-[#050505]/95 shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-black font-outfit uppercase flex items-center gap-3">
                  <MusicIcon className="text-cyan-400" />
                  Library Music
                </h2>
                <button onClick={() => setShowMusicSelector(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40"><X size={24} /></button>
              </div>
              <div className="px-6 py-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input type="text" placeholder="Search library..." value={musicSearch} onChange={(e) => setMusicSearch(e.target.value)} className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 outline-none text-white text-sm" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {filteredTracks.map((track) => (
                  <motion.div key={track.id} whileTap={{ scale: 0.98 }} onClick={() => { onSendTrack?.(track); setShowMusicSelector(false); }} className="flex items-center gap-4 p-3 rounded-[24px] hover:bg-white/5 transition-colors border border-transparent">
                    <img src={track.albumArt} className="w-14 h-14 rounded-2xl object-cover shadow-lg" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase text-white truncate">{track.title}</h4>
                      <p className="text-[10px] font-black uppercase text-cyan-400/80">{track.artist}</p>
                    </div>
                    <div className="px-3 py-1.5 glass rounded-full text-[9px] font-black uppercase text-white/60">Share</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ... ActionButton helper stays the same
const ActionButton: React.FC<{ icon: React.ReactNode, color: string, onClick: () => void, label: string }> = ({ icon, color, onClick, label }) => {
  const colorMap: any = {
    blue: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/10',
    purple: 'text-purple-400 hover:bg-purple-500/10 border-purple-500/10',
    cyan: 'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/10',
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.05, x: 5, z: 20 }} 
      whileTap={{ scale: 0.95 }} 
      onClick={onClick} 
      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors border glass-high shadow-xl transform-style-3d ${colorMap[color] || ''}`}
    >
      {icon}
    </motion.button>
  );
};

export default ChatInput;
