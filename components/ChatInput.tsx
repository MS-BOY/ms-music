import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
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

  // Sync text with editing message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      // Adjust height for long messages being edited
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
          inputRef.current.focus();
        }
      }, 0);
    } else if (!replyingTo) {
      setText('');
    }
    
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingMessage, replyingTo]);

  // Handle Typing Status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDocRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (text.length > 0 && !editingMessage) {
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
  }, [text, editingMessage]);

  const handleSend = () => {
    if (!text.trim() && selectedMedia.length === 0) return;

    if (selectedMedia.length > 0) {
      const hasVideo = selectedMedia.some(f => f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo ? 'video' : 'image');
      mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
      setSelectedMedia([]);
      setMediaPreviews([]);
    } else {
      onSend(text);
    }

    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setShowEmojiPicker(false);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If swiped right more than 100px, cancel the current state
    if (info.offset.x > 80) {
      if (editingMessage) onCancelEdit?.();
      else onCancelReply?.();
    }
  };

  // Helper to get preview content for the reply bar
  const getReplyPreview = (msg: Message) => {
    if (msg.type === 'image' || msg.type === 'image-grid') return 'Shared an image';
    if (msg.type === 'video') return 'Shared a video';
    if (msg.type === 'music') return 'Shared a track';
    return msg.content;
  };

  const getReplyThumbnail = (msg: Message) => {
    if (msg.type === 'image' || msg.type === 'image-grid' || msg.type === 'video') {
      return msg.attachments?.[0] || msg.content;
    }
    return null;
  };

  return (
    <div className="px-4 py-4 bg-transparent relative z-20 w-full max-w-4xl mx-auto">
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={(e) => {/* handleFileSelect */}} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={(e) => {/* handleFileSelect */}} />

      {/* --- REPLY / EDIT BANNER --- */}
      <AnimatePresence mode="wait">
        {(replyingTo || editingMessage) && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
            drag="x"
            dragConstraints={{ left: 0, right: 150 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="mb-[-20px] pb-6 px-1 relative z-10"
          >
            <div className={`glass-high flex items-center justify-between p-3 rounded-t-[24px] border-t border-l border-r ${editingMessage ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-white/5'} backdrop-blur-3xl shadow-2xl`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-1 h-8 ${editingMessage ? 'bg-blue-600' : 'bg-blue-400'} rounded-full shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]`} />
                
                {/* Thumbnail for media replies */}
                {replyingTo && getReplyThumbnail(replyingTo) && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                    <img src={getReplyThumbnail(replyingTo)!} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-blue-400 flex items-center gap-1 uppercase tracking-wider">
                    {editingMessage ? <Edit2 size={10} /> : <CornerUpLeft size={10} />}
                    {editingMessage ? 'Editing Message' : `Reply to ${replyingTo?.senderName}`}
                  </span>
                  <p className="text-xs text-white/50 truncate pr-4 italic">
                    {editingMessage ? editingMessage.content : getReplyPreview(replyingTo!)}
                  </p>
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={editingMessage ? onCancelEdit : onCancelReply} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors group"
              >
                <X size={16} className="text-white/40 group-hover:text-white" />
              </motion.button>
            </div>
            
            {/* Gesture Hint */}
            <div className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Swipe to cancel</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAIN INPUT AREA --- */}
      <motion.div 
        layout
        className="glass rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-2 flex items-end gap-2 bg-[#0a0a0a]/80 backdrop-blur-2xl relative z-20"
      >
        <div className="relative">
          <motion.button 
            whileTap={{ scale: 0.9, rotate: 45 }} 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
          >
            <Plus size={24} className={`transition-transform duration-500 ${isExpanded ? 'rotate-45' : ''}`} />
          </motion.button>
          {/* Action buttons (Camera, Gallery, etc.) */}
        </div>

        <div className="flex-1 min-h-[48px] flex items-center px-3">
          <textarea 
            ref={inputRef} 
            rows={1} 
            value={text} 
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }} 
            placeholder={replyingTo ? "Write a reply..." : editingMessage ? "Edit your message..." : "Message..."} 
            className="w-full bg-transparent border-none outline-none text-[15px] text-white placeholder:text-white/20 resize-none max-h-40 py-3.5" 
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSend(); 
              } 
            }}
          />
        </div>
        
        <div className="flex items-center gap-1.5 px-1.5 pb-1.5">
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showEmojiPicker ? 'text-yellow-400 bg-white/10' : 'text-white/30 hover:bg-white/5'}`}
          >
            <Smile size={22} />
          </motion.button>
          
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={handleSend}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              (text.trim() || selectedMedia.length > 0) 
                ? 'bg-blue-600 shadow-lg text-white' 
                : 'bg-white/5 text-white/30'
            }`}
          >
            {(text.trim() || selectedMedia.length > 0) ? <Send size={18} /> : <Mic size={22} />}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatInput;
