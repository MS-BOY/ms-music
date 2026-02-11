import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon,
  X, CornerUpLeft, Edit2, Search
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Message, Track } from '../types';

interface Props {
  onSend: (text: string) => void;
  onSendMedia: (media: { url: string; type: 'image'|'video' }[], type: 'image'|'video') => void;
  onSendTrack?: (track: Track) => void;
  libraryTracks?: Track[];
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const GROUP_ID = 'group-1';
const EMOJI_LIST = ['❤️','😂','🔥','🙌','😮','😢','💯','✨','🎵','🎹','🎸','🎧','⚡️','🌈','💎','👑','🚀','🛸','👾','🎉'];

const ChatInput: React.FC<Props> = ({
  onSend,
  onSendMedia,
  onSendTrack,
  libraryTracks=[],
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit
}) => {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url:string,type:'image'|'video'}[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Typing indicator
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
      typingTimeoutRef.current = setTimeout(() => deleteDoc(typingDocRef), 3000);
    } else {
      deleteDoc(typingDocRef);
    }
  }, [text]);

  // Focus on reply/edit
  useEffect(() => {
    if ((replyingTo || editingMessage) && inputRef.current) inputRef.current.focus();
    if (editingMessage) setText(editingMessage.content || '');
    else setText('');
  }, [replyingTo, editingMessage]);

  // Send message
  const handleSend = async () => {
    const user = auth.currentUser;
    if (user) deleteDoc(doc(db, 'groups', GROUP_ID, 'typing', user.uid));

    // Send media first if selected
    if (selectedMedia.length > 0) {
      const uploadedMedia = await Promise.all(selectedMedia.map(async file => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'profile'); // Cloudinary preset
        const res = await fetch('https://api.cloudinary.com/v1_1/dw3oixfbg/upload', { method: 'POST', body: formData });
        const data = await res.json();
        return {
          url: data.secure_url,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        };
      }));

      onSendMedia(uploadedMedia, uploadedMedia.some(m => m.type === 'video') ? 'video' : 'image');
      setSelectedMedia([]);
      mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
      setMediaPreviews([]);
    }

    // Send text
    if (text.trim()) {
      onSend(text);
      setText('');
    }

    if (inputRef.current) inputRef.current.style.height = 'auto';
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    const validFiles: File[] = [];
    const newPreviews: { url: string, type: 'image'|'video' }[] = [];

    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        alert(`Video ${file.name} exceeds 50MB`);
        return;
      }

      if (isVideo || isImage) {
        validFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });
      }
    });

    setSelectedMedia(prev => [...prev, ...validFiles]);
    setMediaPreviews(prev => [...prev, ...newPreviews]);
    setIsExpanded(false);
    e.target.value = '';
  };

  const removeMedia = (idx: number) => {
    const item = mediaPreviews[idx];
    if (item) URL.revokeObjectURL(item.url);
    setSelectedMedia(prev => prev.filter((_, i) => i !== idx));
    setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  const filteredTracks = libraryTracks.filter(t =>
    t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(musicSearch.toLowerCase())
  );

  return (
    <div className="px-3 py-3 relative z-20 w-full max-w-4xl">
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div initial={{opacity:0,scale:0.9,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:10}} className="absolute bottom-full mb-3 right-3 glass-high p-3 rounded-2xl border border-white/10 shadow-xl bg-[#0a0a0a]/95 backdrop-blur-xl z-50">
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_LIST.map(e => (
                <motion.button key={e} whileHover={{scale:1.2}} whileTap={{scale:0.9}} onClick={() => addEmoji(e)} className="text-lg">{e}</motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply/Edit Preview with Cloudinary media */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div initial={{opacity:0,y:5,height:0}} animate={{opacity:1,y:0,height:'auto'}} exit={{opacity:0,y:5,height:0}} className="mb-1">
            <div className={`glass flex items-center justify-between p-2 rounded-xl border ${editingMessage ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-1 h-6 ${editingMessage ? 'bg-blue-500' : 'bg-white/40'} rounded-full`} />
                <div className="flex flex-col min-w-0 text-xs">
                  <span className="font-black uppercase tracking-tight flex items-center gap-1">
                    {editingMessage ? <Edit2 size={10}/> : <CornerUpLeft size={10}/>} {editingMessage ? 'Editing' : 'Replying'}
                  </span>
                  <div className="flex flex-col gap-1 max-w-[200px]">
                    {(editingMessage?.content || replyingTo?.content) && (
                      <span className="truncate text-white/60 text-xs">
                        {editingMessage?.content || replyingTo?.content}
                      </span>
                    )}
                    {replyingTo?.media?.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {replyingTo.media.map((m, idx) => (
                          <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                            {m.type === 'video' ? (
                              <video src={m.url} className="w-full h-full object-cover brightness-75" muted playsInline controls={false}/>
                            ) : (
                              <img src={m.url} className="w-full h-full object-cover"/>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="p-1 hover:bg-white/10 rounded-full">
                <X size={14} className="text-white/40"/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media previews, input, actions... (same as before) */}
      {/* ...rest of your existing code (media previews, textarea, buttons, music selector) remains unchanged */}
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ReactNode, color:string, onClick:()=>void, label:string }> = ({ icon, color, onClick }) => {
  const colorMap:any = {
    blue: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/10',
    purple: 'text-purple-400 hover:bg-purple-500/10 border-purple-500/10',
    cyan: 'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/10'
  };
  return <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onClick} className={`w-10 h-10 rounded-xl flex items-center justify-center border glass-high ${colorMap[color]||''}`}>{icon}</motion.button>;
};

export default ChatInput;
