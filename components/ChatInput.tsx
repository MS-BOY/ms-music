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

/* ---------------- MEDIA DETECT ---------------- */

const detectReplyType = (content: any): 'image' | 'video' | 'music' | 'text' => {
  if (typeof content === 'object' && content?.title && content?.url) return 'music';
  if (typeof content !== 'string') return 'text';

  if (/\.(jpe?g|png|gif|webp)$/i.test(content)) return 'image';
  if (/\.(mp4|webm|ogg)$/i.test(content)) return 'video';

  if (content.includes('firebasestorage.googleapis.com') && content.includes('image'))
    return 'image';
  if (content.includes('firebasestorage.googleapis.com') && content.includes('video'))
    return 'video';

  if (content.includes('res.cloudinary.com') && content.includes('/image/'))
    return 'image';
  if (content.includes('res.cloudinary.com') && content.includes('/video/'))
    return 'video';

  return 'text';
};

/* ---------------- COMPONENT ---------------- */

const ChatInput: React.FC<Props> = ({
  onSend,
  onSendMedia,
  onSendTrack,
  libraryTracks = [],
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

      if(text.trim()){
        onSend(text);
        setText('');
      }
    }
    else if(text.trim()){
      onSend(text);
      setText('');
    }

    if(inputRef.current) inputRef.current.style.height='auto';
    setShowEmojiPicker(false);
  };

  /* ---------------- FILE SELECT ---------------- */

  const handleFileSelect=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const files = Array.from(e.target.files||[]) as File[];
    if(files.length===0) return;

    const validFiles:File[]=[];
    const newPreviews:{url:string,type:'image'|'video'}[]=[];

    files.forEach(file=>{
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if(isVideo && file.size>MAX_VIDEO_SIZE){
        alert(`Video ${file.name} exceeds 50MB`);
        return;
      }
      if(isVideo||isImage){
        validFiles.push(file);
        newPreviews.push({
          url:URL.createObjectURL(file),
          type:isVideo?'video':'image'
        });
      }
    });

    setSelectedMedia(prev=>[...prev,...validFiles]);
    setMediaPreviews(prev=>[...prev,...newPreviews]);
    setIsExpanded(false);
    e.target.value='';
  };

  const removeMedia=(idx:number)=>{
    const item = mediaPreviews[idx];
    if(item) URL.revokeObjectURL(item.url);
    setSelectedMedia(prev=>prev.filter((_,i)=>i!==idx));
    setMediaPreviews(prev=>prev.filter((_,i)=>i!==idx));
  };

  const addEmoji=(emoji:string)=>{
    setText(prev=>prev+emoji);
    inputRef.current?.focus();
  };

  const filteredTracks = libraryTracks.filter(t =>
    t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(musicSearch.toLowerCase())
  );

  /* ---------------- UI ---------------- */

  return (
    <div className="px-3 py-3 relative z-20 w-full max-w-4xl">

      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
      <input type="file" ref={galleryInputRef} accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />

      {/* -------- REPLY / EDIT PREVIEW -------- */}

      <AnimatePresence>
        {(replyingTo||editingMessage) && (
          <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}} className="mb-2">
            <div className="glass flex items-center justify-between p-2 rounded-xl border border-white/10 bg-white/5">

              <div className="flex items-center gap-2 overflow-hidden">

                <div className="w-1 h-8 bg-blue-500 rounded-full" />

                {(() => {
                  const content = editingMessage?.content || replyingTo?.content;
                  const type = detectReplyType(content);

                  if(type === 'image'){
                    return (
                      <img
                        src={content}
                        className="w-16 h-12 object-cover rounded-md border border-white/10"
                      />
                    );
                  }

                  if(type === 'video'){
                    return (
                      <div className="relative w-16 h-12 rounded-md overflow-hidden border border-white/10">
                        <video
                          src={`${content}#t=0.1`}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white">
                          VIDEO
                        </div>
                      </div>
                    );
                  }

                  if(type === 'music'){
                    return (
                      <div className="flex items-center gap-2">
                        <img src={content.albumArt} className="w-10 h-10 rounded-md object-cover"/>
                        <div className="flex flex-col text-[10px]">
                          <span className="font-bold truncate">{content.title}</span>
                          <span className="text-cyan-400 truncate">{content.artist}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <span className="truncate max-w-[200px] text-white/60 text-sm">
                      {content}
                    </span>
                  );
                })()}

              </div>

              <button
                onClick={editingMessage?onCancelEdit:onCancelReply}
                className="p-1 hover:bg-white/10 rounded-full"
              >
                <X size={16} className="text-white/40"/>
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------- INPUT AREA -------- */}

      <div className="glass rounded-2xl border border-white/10 p-1 flex items-end gap-1 bg-[#0a0a0a]/70 backdrop-blur-xl">

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30 resize-none max-h-24 py-2 px-2"
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
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600 text-white"
        >
          <Send size={16}/>
        </motion.button>

      </div>
    </div>
  );
};

export default ChatInput;
