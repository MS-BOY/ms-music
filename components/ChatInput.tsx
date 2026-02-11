import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, CornerUpLeft, Edit2, Search } from 'lucide-react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Message, Track } from '../types';

interface Props {
  onSend: (text: string) => void;
  onSendMedia: (urls: string[], type: 'image' | 'video') => void;
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

// Cloudinary Config (Replace with your actual keys)
const CLOUDINARY_UPLOAD_PRESET = "your_unsigned_preset";
const CLOUDINARY_CLOUD_NAME = "your_cloud_name";

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
  const [isUploading, setIsUploading] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // 1. Optimized Typing Broadcaster (Debounced)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDocRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (text.length > 0) {
      setDoc(typingDocRef, {
        name: user.displayName?.split(' ')[0] || 'User',
        avatar: user.photoURL,
        timestamp: serverTimestamp()
      }, { merge: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => deleteDoc(typingDocRef), 3000);
    } else {
      deleteDoc(typingDocRef);
    }
  }, [text]);

  // 2. Cloudinary Upload Logic
  const uploadToCloudinary = async (files: File[]) => {
    const urls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
      
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.secure_url) urls.push(data.secure_url);
      } catch (err) {
        console.error("Cloudinary Upload Error:", err);
      }
    }
    return urls;
  };

  const handleSend = async () => {
    if (isUploading) return;
    const user = auth.currentUser;

    try {
      if (selectedMedia.length > 0) {
        setIsUploading(true);
        const uploadedUrls = await uploadToCloudinary(selectedMedia);
        const hasVideo = selectedMedia.some(f => f.type.startsWith('video/'));
        
        onSendMedia(uploadedUrls, hasVideo ? 'video' : 'image');
        
        // Cleanup previews
        mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
        setSelectedMedia([]);
        setMediaPreviews([]);
      }

      if (text.trim()) {
        onSend(text);
        setText('');
      }

      if (inputRef.current) inputRef.current.style.height = 'auto';
      setShowEmojiPicker(false);
      setIsExpanded(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const newPreviews: {url: string, type: 'image' | 'video'}[] = [];

    files.forEach(file => {
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) return;
      validFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    });

    setSelectedMedia(prev => [...prev, ...validFiles]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    setIsExpanded(false);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="px-4 py-4 bg-transparent relative z-20 w-full max-w-4xl mx-auto">
      {/* Hidden Inputs */}
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

      {/* Media Previews Bar */}
      <AnimatePresence>
        {mediaPreviews.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex gap-3 mb-4 overflow-x-auto no-scrollbar pb-2">
            {mediaPreviews.map((item, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" alt="" />
                )}
                <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white">
                  <X size={12} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply/Edit Indicator */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="mb-2">
            <div className="glass flex items-center justify-between p-3 rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-3xl">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${editingMessage ? 'bg-blue-500' : 'bg-cyan-400'}`} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {editingMessage ? 'Editing' : 'Replying'}
                  </p>
                  <p className="text-xs text-white/80 truncate max-w-[200px]">{editingMessage?.content || replyingTo?.content}</p>
                </div>
              </div>
              <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-2 text-white/30 hover:text-white"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Bar */}
      <motion.div layout className="glass-high rounded-[32px] border border-white/10 p-2 flex items-end gap-2 bg-[#0a0a0a]/80 backdrop-blur-3xl shadow-2xl will-change-transform">
        <div className="relative">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-white text-black' : 'bg-white/5 text-white/60'}`}
          >
            <Plus className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} size={24} />
          </motion.button>
          
          {/* Popover Menu */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }} className="absolute bottom-full mb-4 flex flex-col gap-2 z-50">
                <ActionButton icon={<Camera size={20}/>} label="Camera" onClick={() => cameraInputRef.current?.click()} color="blue" />
                <ActionButton icon={<Image size={20}/>} label="Gallery" onClick={() => galleryInputRef.current?.click()} color="purple" />
                <ActionButton icon={<MusicIcon size={20}/>} label="Music" onClick={() => { setShowMusicSelector(true); setIsExpanded(false); }} color="cyan" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          placeholder="Message..."
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-white py-3.5 px-2 resize-none max-h-40 placeholder:text-white/20"
          onFocus={() => setShowEmojiPicker(false)}
        />

        <div className="flex items-center gap-2 pr-1 pb-1">
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-10 h-10 rounded-full flex items-center justify-center ${showEmojiPicker ? 'text-yellow-400' : 'text-white/20'}`}>
            <Smile size={24} />
          </button>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={isUploading}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${text.trim() || selectedMedia.length > 0 ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/10'}`}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (text.trim() || selectedMedia.length > 0) ? (
              <Send size={18} />
            ) : (
              <Mic size={22} />
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

// Sub-component for Menu Actions
const ActionButton: React.FC<{ icon: any, label: string, onClick: () => void, color: string }> = ({ icon, onClick, color }) => (
  <motion.button
    whileHover={{ x: 5 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`w-12 h-12 rounded-2xl flex items-center justify-center glass border border-white/10 shadow-2xl text-white/80 hover:bg-white/10 transition-colors`}
  >
    {icon}
  </motion.button>
);

export default memo(ChatInput);
