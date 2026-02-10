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

  // Typing indicator
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const typingDoc = doc(db,'groups',GROUP_ID,'typing',user.uid);
    if(text.trim().length>0){
      setDoc(typingDoc,{
        name: user.displayName || 'Someone',
        avatar: user.photoURL || 'https://picsum.photos/200',
        timestamp: Date.now()
      }, { merge:true });
      if(typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(()=>deleteDoc(typingDoc),3000);
    } else deleteDoc(typingDoc);
  },[text]);

  // Focus input on reply/edit
  useEffect(() => {
    if(inputRef.current) inputRef.current.focus();
    if(editingMessage) setText(editingMessage.content);
  }, [replyingTo, editingMessage]);

  const handleSend = () => {
    if(!text.trim() && selectedMedia.length===0) return;

    // Send media first
    if(selectedMedia.length>0){
      const hasVideo = selectedMedia.some(f=>f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo?'video':'image');
      mediaPreviews.forEach(p=>URL.revokeObjectURL(p.url));
      setSelectedMedia([]);
      setMediaPreviews([]);
    }

    // Send text
    if(text.trim()){
      onSend(text.trim());
      setText('');
    }

    if(inputRef.current) inputRef.current.style.height='auto';
    setEmojiOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(e.key==='Enter' && !e.shiftKey){
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height='auto';
    e.target.style.height=`${e.target.scrollHeight}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'camera'|'gallery') => {
    const files = Array.from(e.target.files || []);
    if(!files.length) return;

    const validFiles: File[] = [];
    const previews: {url:string,type:'image'|'video'}[] = [];

    files.forEach(file=>{
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if(isVideo && file.size>MAX_VIDEO_SIZE) { alert(`Video ${file.name} exceeds 50MB.`); return; }
      if(isVideo||isImage){
        validFiles.push(file);
        previews.push({url: URL.createObjectURL(file), type: isVideo?'video':'image'});
      }
    });

    setSelectedMedia(prev=>[...prev,...validFiles]);
    setMediaPreviews(prev=>[...prev,...previews]);
    setExpanded(false);
    e.target.value='';
  };

  const removeMedia = (idx:number) => {
    URL.revokeObjectURL(mediaPreviews[idx].url);
    setSelectedMedia(prev=>prev.filter((_,i)=>i!==idx));
    setMediaPreviews(prev=>prev.filter((_,i)=>i!==idx));
  };

  const addEmoji = (emoji:string) => {
    setText(prev=>prev+emoji);
    inputRef.current?.focus();
  };

  const filteredTracks = libraryTracks.filter(t =>
    t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(musicSearch.toLowerCase())
  );

  return (
    <div className="px-4 py-4 w-full max-w-4xl relative z-20">
      {/* Hidden inputs */}
      <input type="file" ref={cameraRef} accept="image/*" capture="environment" className="hidden" onChange={e=>handleFileSelect(e,'camera')} />
      <input type="file" ref={galleryRef} accept="image/*,video/*" multiple className="hidden" onChange={e=>handleFileSelect(e,'gallery')} />

      {/* Emoji picker */}
      <AnimatePresence>
        {emojiOpen && (
          <motion.div initial={{opacity:0,scale:0.9,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:10}} className="absolute bottom-full mb-4 right-4 glass-high p-4 rounded-2xl border border-white/10 z-50 bg-[#0a0a0a]/95 backdrop-blur-3xl">
            <div className="grid grid-cols-5 gap-2">
              {EMOJI_LIST.map(e=>
                <motion.button key={e} onClick={()=>addEmoji(e)} whileTap={{scale:0.9}} className="text-2xl p-1 rounded hover:bg-white/5">{e}</motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply / Edit */}
      <AnimatePresence>
        {(replyingTo||editingMessage) && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="mb-2 overflow-hidden">
            <div className={`glass flex items-center justify-between p-3 rounded-2xl border ${editingMessage?'border-blue-500/30 bg-blue-500/5':'border-white/10 bg-white/5'} backdrop-blur-md`}>
              <div className="flex items-center gap-3 truncate">
                <div className={`w-1 h-8 ${editingMessage?'bg-blue-500':'bg-white/40'} rounded-full shrink-0`} />
                <div className="flex flex-col min-w-0 truncate">
                  <span className="text-[10px] font-black text-blue-400 flex items-center gap-1 uppercase">
                    {editingMessage?<Edit2 size={10}/> : <CornerUpLeft size={10}/>}
                    {editingMessage?'Editing':'Replying'}
                  </span>
                  <span className="text-xs text-white/60 truncate">{editingMessage?.content || replyingTo?.content}</span>
                </div>
              </div>
              <button onClick={editingMessage?onCancelEdit:onCancelReply} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={16} className="text-white/40"/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media previews */}
      <AnimatePresence>
        {mediaPreviews.length>0 && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="mb-2 overflow-x-auto flex gap-2">
            {mediaPreviews.map((p,idx)=>(
              <div key={p.url} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10">
                {p.type==='video'? <video src={p.url} className="w-full h-full object-cover" muted playsInline /> : <img src={p.url} className="w-full h-full object-cover" />}
                <button onClick={()=>removeMedia(idx)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-500">
                  <X size={12} className="text-white"/>
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input + actions */}
      <motion.div className="flex items-end gap-2 p-2 bg-[#0a0a0a]/70 rounded-2xl border border-white/10 backdrop-blur-2xl">
        {/* Plus button */}
        <motion.div className="relative">
          <motion.button onClick={()=>setExpanded(prev=>!prev)} whileTap={{scale:0.9,rotate:45}} className={`w-12 h-12 rounded-full flex items-center justify-center ${expanded?'bg-white text-black':'bg-white/5 text-white/60 hover:bg-white/10'}`}>
            <Plus size={24} className={`${expanded?'rotate-45':''}`}/>
          </motion.button>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="absolute bottom-full mb-2 flex flex-col gap-2 p-2 bg-[#050505]/95 rounded-2xl border border-white/10">
                <ActionButton icon={<Camera size={20}/>} color="blue" onClick={()=>cameraRef.current?.click()} label="Camera"/>
                <ActionButton icon={<Image size={20}/>} color="purple" onClick={()=>galleryRef.current?.click()} label="Gallery"/>
                <ActionButton icon={<MusicIcon size={20}/>} color="cyan" onClick={()=>{ setMusicOpen(true); setExpanded(false); }} label="Music"/>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={replyingTo?'Compose reply...': editingMessage?'Revise message...':'Type a message...'}
          className="flex-1 bg-transparent border-none outline-none text-white text-sm resize-none max-h-32 py-3"
          rows={1}
        />

        {/* Emoji + send */}
        <motion.button onClick={()=>setEmojiOpen(prev=>!prev)} className={`w-10 h-10 rounded-full flex items-center justify-center ${emojiOpen?'text-yellow-400 bg-white/10':'text-white/30 hover:bg-white/5'}`}><Smile size={22}/></motion.button>
        <motion.button onClick={handleSend} className={`w-11 h-11 rounded-2xl flex items-center justify-center ${text||selectedMedia.length>0?'bg-blue-600 text-white':'bg-white/5 text-white/30 hover:bg-white/10'}`}>
          {text||selectedMedia.length>0?<Send size={18}/> : <Mic size={22}/>}
        </motion.button>
      </motion.div>
    </div>
  );
};

const ActionButton: React.FC<{icon:React.ReactNode,color:string,onClick:()=>void,label:string}> = ({icon,color,onClick})=>{
  const colors: any = {blue:'text-blue-400 hover:bg-blue-500/10',purple:'text-purple-400 hover:bg-purple-500/10',cyan:'text-cyan-400 hover:bg-cyan-500/10'};
  return (
    <motion.button onClick={onClick} whileTap={{scale:0.95}} className={`w-12 h-12 flex items-center justify-center rounded-2xl border ${colors[color]||''}`}>
      {icon}
    </motion.button>
  );
};

export default ChatInput;
