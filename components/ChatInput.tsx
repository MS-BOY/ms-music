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

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const GROUP_ID = 'group-1';
const EMOJI_LIST = ['❤️','😂','🔥','🙌','😮','😢','💯','✨','🎵','🎹','🎸','🎧','⚡️','🌈','💎','👑','🚀','🛸','👾','🎉'];

const ChatInput: React.FC<Props> = ({ 
  onSend, onSendMedia, onSendTrack, libraryTracks = [], 
  replyingTo, onCancelReply, editingMessage, onCancelEdit 
}) => {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{url:string,type:'image'|'video'}[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>|null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Typing status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDoc = doc(db,'groups',GROUP_ID,'typing',user.uid);

    if (text.trim().length>0) {
      setDoc(typingDoc,{name:user.displayName||'Someone',avatar:user.photoURL||'https://picsum.photos/200',timestamp:Date.now()},{merge:true});
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(()=>deleteDoc(typingDoc),3000);
    } else deleteDoc(typingDoc);
  },[text]);

  useEffect(()=>{
    if(inputRef.current) inputRef.current.focus();
    if(editingMessage) setText(editingMessage.content);
  },[replyingTo,editingMessage]);

  const handleSend = ()=>{
    if(selectedMedia.length>0){
      const hasVideo = selectedMedia.some(f=>f.type.startsWith('video/'));
      onSendMedia(selectedMedia,hasVideo?'video':'image');
      mediaPreviews.forEach(p=>URL.revokeObjectURL(p.url));
      setSelectedMedia([]); setMediaPreviews([]);
      if(text.trim()){onSend(text); setText('');}
    } else if(text.trim()){onSend(text); setText('');}
    if(inputRef.current) inputRef.current.style.height='auto';
    setEmojiOpen(false);
  };

  const handleChange=(e:React.ChangeEvent<HTMLTextAreaElement>)=>{
    setText(e.target.value);
    e.target.style.height='auto';
    e.target.style.height=`${e.target.scrollHeight}px`;
  };

  const handleFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const files = Array.from(e.target.files||[]);
    const valid:File[] = []; const previews:{url:string,type:'image'|'video'}[] = [];
    files.forEach(f=>{
      const isVideo=f.type.startsWith('video/'),isImage=f.type.startsWith('image/');
      if(isVideo && f.size>MAX_VIDEO_SIZE){alert(`Video ${f.name} >50MB`); return;}
      if(isVideo||isImage){valid.push(f); previews.push({url:URL.createObjectURL(f),type:isVideo?'video':'image'});}
    });
    setSelectedMedia(prev=>[...prev,...valid]);
    setMediaPreviews(prev=>[...prev,...previews]);
    e.target.value='';
    setExpanded(false);
  };

  const removeMedia=(i:number)=>{
    const item = mediaPreviews[i]; if(item) URL.revokeObjectURL(item.url);
    setSelectedMedia(prev=>prev.filter((_,idx)=>idx!==i));
    setMediaPreviews(prev=>prev.filter((_,idx)=>idx!==i));
  };

  const addEmoji=(emoji:string)=>{setText(prev=>prev+emoji); inputRef.current?.focus();};
  const filteredTracks = libraryTracks.filter(t=>t.title.toLowerCase().includes(musicSearch.toLowerCase())||t.artist.toLowerCase().includes(musicSearch.toLowerCase()));

  return (
    <div className="px-3 pb-3 w-full max-w-full relative z-20 flex flex-col gap-2">

      <input type="file" ref={cameraRef} accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input type="file" ref={galleryRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFile} />

      {/* Reply / Edit bar */}
      <AnimatePresence>
        {(replyingTo||editingMessage) && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="overflow-hidden">
            <div className={`flex items-center justify-between p-2 rounded-xl border ${editingMessage?'border-blue-500/30 bg-blue-500/5':'border-white/10 bg-white/5'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1 h-6 ${editingMessage?'bg-blue-500':'bg-white/40'} rounded-full shrink-0`} />
                <div className="flex flex-col min-w-0 truncate">
                  <span className="text-[10px] font-black text-blue-400 flex items-center gap-1 uppercase truncate">
                    {editingMessage?<Edit2 size={10}/>:<CornerUpLeft size={10}/>}
                    {editingMessage?'Editing':`Replying to ${replyingTo?.senderName}`}
                  </span>
                  <span className="text-xs text-white/60 truncate max-w-[180px]">{editingMessage?.content||replyingTo?.content}</span>
                </div>
              </div>
              <button onClick={editingMessage?onCancelEdit:onCancelReply} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16} className="text-white/40"/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media preview */}
      <AnimatePresence>
        {mediaPreviews.length>0 && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="flex gap-2 overflow-x-auto no-scrollbar">
            {mediaPreviews.map((item,idx)=>(
              <motion.div key={item.url} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                {item.type==='video'?<video src={`${item.url}#t=0.1`} className="w-full h-full object-cover brightness-75" muted playsInline/>:<img src={item.url} className="w-full h-full object-cover"/>}
                <button onClick={()=>removeMedia(idx)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500 border border-white/10"><X size={12} className="text-white"/></button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input */}
      <motion.div className="flex items-end gap-2 bg-[#0a0a0a]/70 backdrop-blur-2xl rounded-2xl border border-white/10 p-1.5">
        <motion.button onClick={()=>setExpanded(!expanded)} className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5 transition-all">
          <Plus size={20}/>
        </motion.button>
        <textarea ref={inputRef} value={text} onChange={handleChange} rows={1} placeholder={replyingTo?'Compose reply...':editingMessage?'Edit message...':'Type a message...'} className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30 resize-none max-h-28 py-2"/>
        <div className="flex items-center gap-1">
          <motion.button onClick={()=>setEmojiOpen(!emojiOpen)} className="w-9 h-9 flex items-center justify-center text-white/40 hover:bg-white/5 rounded-full"><Smile size={20}/></motion.button>
          <motion.button onClick={handleSend} className={`w-10 h-10 flex items-center justify-center rounded-2xl ${text||selectedMedia.length>0?'bg-blue-600 text-white':'bg-white/5 text-white/30 hover:bg-white/10'}`}>
            {text||selectedMedia.length>0?<Send size={16}/>:<Mic size={20}/>}
          </motion.button>
        </div>
      </motion.div>

      {/* Emoji picker */}
      <AnimatePresence>
        {emojiOpen && (
          <motion.div initial={{opacity:0,scale:0.9,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:10}} className="absolute bottom-full mb-2 right-3 p-3 bg-[#0a0a0a]/95 rounded-xl border border-white/10 grid grid-cols-5 gap-2">
            {EMOJI_LIST.map(e=><motion.button key={e} whileTap={{scale:0.9}} onClick={()=>addEmoji(e)} className="text-xl">{e}</motion.button>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music selector modal */}
      <AnimatePresence>
        {musicOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-xl" onClick={()=>setMusicOpen(false)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/>
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 rounded-t-3xl h-[70vh] flex flex-col p-3" initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-black flex items-center gap-2"><MusicIcon className="text-cyan-400"/>Library Music</h2>
                <button onClick={()=>setMusicOpen(false)}><X size={24} className="text-white/40"/></button>
              </div>
              <div className="relative mb-2">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
                <input type="text" value={musicSearch} onChange={e=>setMusicSearch(e.target.value)} placeholder="Search..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white text-sm outline-none"/>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredTracks.map(track=>(
                  <motion.div key={track.id} onClick={()=>{onSendTrack?.(track); setMusicOpen(false)}} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                    <img src={track.albumArt} className="w-12 h-12 rounded-xl object-cover"/>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-black truncate">{track.title}</h4>
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

export default ChatInput;
