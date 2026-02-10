import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, CornerUpLeft, Edit2, Search } from 'lucide-react';
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
const EMOJI_LIST = ['❤️','😂','🔥','🙌','😮','😢','💯','✨','🎵','🎹','🎸','🎧','⚡️','🌈','💎','👑','🚀','🛸','👾','🎉'];

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
  const [mediaPreviews, setMediaPreviews] = useState<{url:string,type:'image'|'video'}[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Typing status broadcast
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const typingRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);
    if (text.length > 0) {
      setDoc(typingRef, { name: user.displayName||'Someone', avatar: user.photoURL||'', timestamp: Date.now() }, { merge:true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => deleteDoc(typingRef), 3000);
    } else {
      deleteDoc(typingRef);
    }
  }, [text]);

  // Autofocus on reply/edit
  useEffect(() => {
    if ((replyingTo || editingMessage) && inputRef.current) inputRef.current.focus();
    if (editingMessage) setText(editingMessage.content); else setText('');
  }, [replyingTo, editingMessage]);

  const handleSend = () => {
    if (selectedMedia.length > 0) {
      const hasVideo = selectedMedia.some(f=>f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo?'video':'image');
      mediaPreviews.forEach(p=>URL.revokeObjectURL(p.url));
      setSelectedMedia([]); setMediaPreviews([]);
      if (text.trim()) { onSend(text); setText(''); }
    } else if (text.trim()) {
      onSend(text); setText('');
    }
    if (inputRef.current) inputRef.current.style.height='auto';
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height='auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; // max-height 120px
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type:'camera'|'gallery') => {
    const files = Array.from(e.target.files||[]) as File[];
    if (!files.length) return;
    const validFiles:File[] = [], previews:{url:string,type:'image'|'video'}[] = [];
    files.forEach(f=>{
      const isVideo = f.type.startsWith('video/');
      if (isVideo && f.size>MAX_VIDEO_SIZE){ alert(`Video ${f.name} >50MB`); return; }
      if (isVideo || f.type.startsWith('image/')) {
        validFiles.push(f);
        previews.push({url:URL.createObjectURL(f),type:isVideo?'video':'image'});
      }
    });
    setSelectedMedia(prev=>[...prev,...validFiles]);
    setMediaPreviews(prev=>[...prev,...previews]);
    setIsExpanded(false);
    e.target.value='';
  };

  const removeMedia = (index:number)=>{
    const item = mediaPreviews[index]; if(item) URL.revokeObjectURL(item.url);
    setSelectedMedia(prev=>prev.filter((_,i)=>i!==index));
    setMediaPreviews(prev=>prev.filter((_,i)=>i!==index));
  };

  const addEmoji = (emoji:string)=>{
    setText(prev=>prev+emoji);
    inputRef.current?.focus();
  };

  const filteredTracks = libraryTracks.filter(t=>t.title.toLowerCase().includes(musicSearch.toLowerCase()) || t.artist.toLowerCase().includes(musicSearch.toLowerCase()));

  return (
    <div className="px-4 py-4 bg-transparent relative z-20 w-full max-w-full flex flex-col gap-2">
      {/* Hidden File Inputs */}
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={e=>handleFileSelect(e,'camera')} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={e=>handleFileSelect(e,'gallery')} />

      {/* Reply/Edit Preview */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="overflow-hidden">
            <div className={`glass p-3 rounded-2xl border ${editingMessage?'border-blue-500/30':'border-white/10'} flex justify-between items-center`}>
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <span className="text-[10px] font-black text-blue-400 flex items-center gap-1 uppercase tracking-tight">
                  {editingMessage?<Edit2 size={10}/>:<CornerUpLeft size={10}/>}
                  {editingMessage?'Editing Message':`Replying to ${replyingTo?.senderName}`}
                </span>
                <span className="text-xs text-white/60 truncate max-w-[150px]">{editingMessage?.content || replyingTo?.content}</span>
              </div>
              <button onClick={editingMessage?onCancelEdit:onCancelReply} className="p-1.5 hover:bg-white/10 rounded-full"><X size={14} className="text-white/40"/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Previews */}
      <AnimatePresence>
        {mediaPreviews.length>0 && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="overflow-x-auto no-scrollbar flex gap-2">
            {mediaPreviews.map((item,idx)=>(
              <div key={item.url} className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-[#0a0a0a]">
                {item.type==='video'?<video src={`${item.url}#t=0.1`} className="w-full h-full object-cover" muted/>:<img src={item.url} className="w-full h-full object-cover"/>}
                <button onClick={()=>removeMedia(idx)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500 transition-colors border border-white/10"><X size={12} className="text-white"/></button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <motion.div className="glass flex items-end gap-2 p-2 rounded-2xl border border-white/10 shadow-md bg-[#0a0a0a]/70 backdrop-blur-sm w-full transform-style-3d">
        {/* Action Button */}
        <div className="relative">
          <motion.button whileTap={{scale:0.9}} onClick={()=>setIsExpanded(!isExpanded)} className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpanded?'bg-white text-black':'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            <Plus size={20} className={`${isExpanded?'rotate-45':''} transition-transform`} />
          </motion.button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="absolute bottom-full mb-2 flex flex-col gap-2 glass-high p-2 rounded-2xl border border-white/10 shadow-lg z-30">
                <ActionButton icon={<Camera size={18}/>} color="blue" onClick={()=>cameraInputRef.current?.click()} label="Camera"/>
                <ActionButton icon={<Image size={18}/>} color="purple" onClick={()=>galleryInputRef.current?.click()} label="Gallery"/>
                <ActionButton icon={<MusicIcon size={18}/>} color="cyan" onClick={()=>{setIsExpanded(false);setShowMusicSelector(true)}} label="Music"/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Textarea */}
        <textarea ref={inputRef} rows={1} value={text} onChange={handleInputChange} placeholder={replyingTo?"Compose reply...":editingMessage?"Revise message...":"Type a message..."} className="flex-1 bg-transparent outline-none border-none resize-none text-white placeholder:text-white/30 max-h-28 py-2.5"/>

        {/* Emoji & Send */}
        <div className="flex items-center gap-1">
          <motion.button whileTap={{scale:0.85}} onClick={()=>setShowEmojiPicker(!showEmojiPicker)} className={`w-9 h-9 rounded-full flex items-center justify-center ${showEmojiPicker?'text-yellow-400 bg-white/10':'text-white/30 hover:bg-white/5'}`}><Smile size={18}/></motion.button>
          <motion.button whileTap={{scale:0.9}} onClick={(text||selectedMedia.length>0)?handleSend:undefined} className={`w-10 h-10 rounded-2xl flex items-center justify-center ${(text||selectedMedia.length>0)?'bg-blue-600 text-white shadow-md':'bg-white/5 text-white/30 hover:bg-white/10'}`}>{(text||selectedMedia.length>0)?<Send size={16}/>:<Mic size={18}/>}</motion.button>
        </div>
      </motion.div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div initial={{opacity:0,scale:0.9,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:10}} className="absolute bottom-full mb-2 right-2 glass-high p-2 rounded-xl shadow-lg border border-white/10 z-40 grid grid-cols-5 gap-1">
            {EMOJI_LIST.map(e=><motion.button key={e} whileTap={{scale:0.9}} onClick={()=>addEmoji(e)} className="text-xl flex items-center justify-center p-1 hover:bg-white/5 rounded-lg">{e}</motion.button>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Selector */}
      <AnimatePresence>
        {showMusicSelector && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:0.8}} exit={{opacity:0}} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={()=>setShowMusicSelector(false)} />
            <motion.div initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} exit={{opacity:0,y:50}} className="fixed bottom-0 left-0 right-0 z-50 glass-high rounded-t-3xl border-t border-white/10 h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-lg font-black flex items-center gap-2 text-white/90"><MusicIcon className="text-cyan-400"/> Library</h2>
                <button onClick={()=>setShowMusicSelector(false)} className="p-2 rounded-full hover:bg-white/10"><X size={20}/></button>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16}/>
                  <input type="text" placeholder="Search tracks..." value={musicSearch} onChange={e=>setMusicSearch(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-2xl border border-white/5 bg-white/5 text-white text-sm outline-none"/>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
                {filteredTracks.map(track=>(
                  <motion.div key={track.id} whileTap={{scale:0.98}} onClick={()=>{onSendTrack?.(track); setShowMusicSelector(false)}} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                    <img src={track.albumArt} className="w-12 h-12 rounded-xl object-cover"/>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-black text-sm truncate">{track.title}</h4>
                      <p className="text-cyan-400 text-[10px] truncate">{track.artist}</p>
                    </div>
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

const ActionButton: React.FC<{ icon: React.ReactNode, color: string, onClick: ()=>void, label:string }> = ({ icon, color, onClick })=>{
  const colorMap:any = { blue:'text-blue-400 hover:bg-blue-500/10 border-blue-500/10', purple:'text-purple-400 hover:bg-purple-500/10 border-purple-500/10', cyan:'text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/10'};
  return <motion.button whileTap={{scale:0.95}} onClick={onClick} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors border glass-high shadow-sm ${colorMap[color]||''}`}>{icon}</motion.button>;
};

export default ChatInput;
