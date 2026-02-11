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

  // Handle sending message
  const handleSend = async () => {
    const user = auth.currentUser;
    if (user) deleteDoc(doc(db, 'groups', GROUP_ID, 'typing', user.uid));

    // Send media first if selected
    if (selectedMedia.length > 0) {
      // Upload to Cloudinary
      const uploadedMedia = await Promise.all(selectedMedia.map(async file => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'profile'); // your preset
        const res = await fetch('https://api.cloudinary.com/v1_1/dw3oixfbg/upload', {
          method: 'POST',
          body: formData
        });
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
      {/* Hidden file inputs */}
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

      {/* Reply/Edit Preview */}
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

                  {/* Text + Media preview */}
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
                              <video src={m.url} className="w-full h-full object-cover brightness-75" muted playsInline controls={false} />
                            ) : (
                              <img src={m.url} className="w-full h-full object-cover" />
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

      {/* Media Previews */}
      <AnimatePresence>
        {mediaPreviews.length > 0 && (
          <motion.div initial={{opacity:0,y:10,height:0}} animate={{opacity:1,y:0,height:'auto'}} exit={{opacity:0,y:10,height:0}} className="mb-2 flex overflow-x-auto gap-2">
            {mediaPreviews.map((item, idx) => (
              <motion.div key={item.url} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0,opacity:0}} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                {item.type === 'video' ? (
                  <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover brightness-75" muted playsInline/>
                ) : (
                  <img src={item.url} className="w-full h-full object-cover"/>
                )}
                <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500 border border-white/10">
                  <X size={12} className="text-white"/>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input + Actions */}
      <motion.div layout className="glass rounded-2xl border border-white/10 p-1 flex items-end gap-1 bg-[#0a0a0a]/70 backdrop-blur-xl">
        <div className="relative">
          <motion.button whileTap={{scale:0.9,rotate:45}} onClick={() => setIsExpanded(!isExpanded)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            <Plus size={20}/>
          </motion.button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{opacity:0,y:10,scale:0.8}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:0.8}} className="absolute left-0 bottom-full mb-2 flex flex-col gap-2 p-2 rounded-xl bg-[#050505]/95 border border-white/10 shadow-lg">
                <ActionButton icon={<Camera size={18}/>} color="blue" onClick={() => cameraInputRef.current?.click()} label="Camera"/>
                <ActionButton icon={<Image size={18}/>} color="purple" onClick={() => galleryInputRef.current?.click()} label="Gallery"/>
                <ActionButton icon={<MusicIcon size={18}/>} color="cyan" onClick={() => { setIsExpanded(false); setShowMusicSelector(true); }} label="Music"/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={handleInputChange}
          placeholder={replyingTo ? "Reply..." : editingMessage ? "Edit..." : "Type a message..."}
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 resize-none max-h-24 py-2"
          onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }}
          onFocus={() => setShowEmojiPicker(false)}
        />

        <div className="flex items-center gap-1.5">
          <motion.button whileTap={{scale:0.85}} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-9 h-9 rounded-full flex items-center justify-center ${showEmojiPicker ? 'text-yellow-400 bg-white/10' : 'text-white/30 hover:bg-white/5'}`}>
            <Smile size={18}/>
          </motion.button>
          <motion.button whileTap={{scale:0.9}} onClick={(text||selectedMedia.length>0)?handleSend:undefined} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${(text||selectedMedia.length>0) ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
            {(text||selectedMedia.length>0)?<Send size={16}/>:<Mic size={18}/>}
          </motion.button>
        </div>
      </motion.div>

      {/* Music Selector */}
      <AnimatePresence>
        {showMusicSelector && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowMusicSelector(false)}/>
            <motion.div initial={{opacity:0,y:50,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:50,scale:0.95}} className="fixed bottom-0 left-0 right-0 z-50 glass-high rounded-t-3xl border-t border-white/10 h-[65vh] flex flex-col bg-[#050505]/95">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-black uppercase flex items-center gap-2"><MusicIcon className="text-cyan-400"/>Library</h2>
                <button onClick={() => setShowMusicSelector(false)} className="p-1 rounded-full text-white/40 hover:bg-white/10"><X size={20}/></button>
              </div>
              <div className="px-4 py-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16}/>
                <input type="text" placeholder="Search..." value={musicSearch} onChange={e=>setMusicSearch(e.target.value)} className="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-9 pr-3 text-white text-sm outline-none"/>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredTracks.map(track => (
                  <motion.div key={track.id} whileTap={{scale:0.97}} onClick={() => { onSendTrack?.(track); setShowMusicSelector(false); }} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 border border-transparent">
                    <img src={track.albumArt} className="w-12 h-12 rounded-xl object-cover shadow-lg"/>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase text-white truncate">{track.title}</h4>
                      <p className="text-[10px] font-black uppercase text-cyan-400/80">{track.artist}</p>
                    </div>
                    <div className="px-2 py-0.5 glass rounded-full text-[8px] font-black uppercase text-white/60">Share</div>
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

const ActionButton: React.FC<{ icon: React.ReactNode, color:string, onClick:()=>void, label:string }> = ({ icon, color, onClick }) => {
  const colorMap:any = {
    blue: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/10',
    purple: 'text-purple-400 hover:bg-purple-500/10 border-purple-500/10',
    cyan: 'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/10'
  };
  return <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onClick} className={`w-10 h-10 rounded-xl flex items-center justify-center border glass-high ${colorMap[color]||''}`}>{icon}</motion.button>;
};

export default ChatInput;
