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
  onSend,
  onSendMedia,
  onSendTrack,
  libraryTracks=[],
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit
}) => {

  const [text,setText] = useState('');
  const [isExpanded,setIsExpanded] = useState(false);
  const [showMusicSelector,setShowMusicSelector] = useState(false);
  const [showEmojiPicker,setShowEmojiPicker] = useState(false);
  const [musicSearch,setMusicSearch] = useState('');
  const [selectedMedia,setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews,setMediaPreviews] = useState<{url:string,type:'image'|'video'}[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- TYPING STATUS ---------------- */
  useEffect(()=>{
    const user = auth.currentUser;
    if(!user) return;
    const typingDocRef = doc(db,'groups',GROUP_ID,'typing',user.uid);

    if(text.length>0){
      setDoc(typingDocRef,{
        name:user.displayName||'Someone',
        avatar:user.photoURL||'https://picsum.photos/200',
        timestamp:Date.now()
      },{merge:true});

      if(typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(()=>deleteDoc(typingDocRef),3000);
    } else deleteDoc(typingDocRef);

  },[text]);

  useEffect(()=>{
    if((replyingTo||editingMessage)&&inputRef.current) inputRef.current.focus();
    if(editingMessage) setText(editingMessage.content);
    else setText('');
  },[replyingTo,editingMessage]);

  /* ---------------- SEND ---------------- */
  const handleSend = ()=>{
    const user = auth.currentUser;
    if(user) deleteDoc(doc(db,'groups',GROUP_ID,'typing',user.uid));

    if(selectedMedia.length>0){
      const hasVideo = selectedMedia.some(f=>f.type.startsWith('video/'));
      onSendMedia(selectedMedia,hasVideo?'video':'image');
      mediaPreviews.forEach(p=>URL.revokeObjectURL(p.url));
      setSelectedMedia([]); 
      setMediaPreviews([]);
    }

    if(text.trim()){
      onSend(text);
      setText('');
    }

    if(inputRef.current) inputRef.current.style.height='auto';
    setShowEmojiPicker(false);
  };

  /* ---------------- REPLY PREVIEW RENDER ---------------- */
  const renderReplyPreview = (content:string) => {

    // Detect cloudinary
    const isImage =
      content.includes('/image/upload') ||
      content.match(/\.(jpeg|jpg|png|gif|webp)$/i);

    const isVideo =
      content.includes('/video/upload') ||
      content.match(/\.(mp4|webm|ogg|mov)$/i);

    // Try music JSON
    try {
      const parsed = JSON.parse(content) as Track;
      if(parsed?.albumArt){
        return (
          <div className="flex items-center gap-2">
            <img src={parsed.albumArt} className="w-10 h-10 rounded-lg object-cover"/>
            <div className="text-[10px]">
              <div className="font-bold truncate max-w-[120px]">{parsed.title}</div>
              <div className="text-white/40 truncate max-w-[120px]">{parsed.artist}</div>
            </div>
          </div>
        );
      }
    } catch {}

    if(isImage){
      return (
        <img
          src={content}
          className="w-16 h-16 object-cover rounded-lg border border-white/10"
        />
      );
    }

    if(isVideo){
      return (
        <video
          src={`${content}#t=0.1`}
          className="w-16 h-16 object-cover rounded-lg border border-white/10"
          muted
          playsInline
        />
      );
    }

    return (
      <span className="truncate text-white/60 text-xs max-w-[180px] block">
        {content}
      </span>
    );
  };

  /* ---------------- JSX ---------------- */
  return (
    <div className="px-3 py-3 relative z-20 w-full max-w-4xl">

      {/* Reply / Edit Preview */}
      <AnimatePresence>
        {(replyingTo||editingMessage) && (
          <motion.div
            initial={{opacity:0,y:5,height:0}}
            animate={{opacity:1,y:0,height:'auto'}}
            exit={{opacity:0,y:5,height:0}}
            className="mb-1"
          >
            <div className={`glass flex items-center justify-between p-2 rounded-xl border ${editingMessage?'border-blue-500/30 bg-blue-500/5':'border-white/10 bg-white/5'}`}>
              
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-1 h-8 ${editingMessage?'bg-blue-500':'bg-white/40'} rounded-full`} />
                
                <div className="flex flex-col min-w-0 text-xs">
                  <span className="font-black uppercase flex items-center gap-1">
                    {editingMessage?<Edit2 size={10}/> : <CornerUpLeft size={10}/>}
                    {editingMessage?'Editing':'Replying'}
                  </span>

                  {renderReplyPreview(editingMessage?.content || replyingTo?.content || '')}
                </div>
              </div>

              <button
                onClick={editingMessage?onCancelEdit:onCancelReply}
                className="p-1 hover:bg-white/10 rounded-full"
              >
                <X size={14} className="text-white/40"/>
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area remains same */}
      <div className="glass rounded-2xl border border-white/10 p-1 flex items-end gap-1 bg-[#0a0a0a]/70 backdrop-blur-xl">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/30 resize-none max-h-24 py-2"
          onKeyDown={e=>{
            if(e.key==='Enter'&&!e.shiftKey){
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <motion.button
          whileTap={{scale:0.9}}
          onClick={handleSend}
          className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center"
        >
          <Send size={16}/>
        </motion.button>
      </div>

    </div>
  );
};

export default ChatInput;
