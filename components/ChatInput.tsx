import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Smile,
  Mic,
  Send,
  Camera,
  Image,
  Music as MusicIcon,
  X,
  CornerUpLeft,
  Edit2,
  Search
} from 'lucide-react';
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

  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: 'image' | 'video' | 'audio' }[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  /* ------------------ Typing Status ------------------ */

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const typingRef = doc(db, 'groups', GROUP_ID, 'typing', user.uid);

    if (text.trim().length > 0) {
      setDoc(typingRef, {
        name: user.displayName || 'Someone',
        avatar: user.photoURL || '',
        timestamp: Date.now()
      }, { merge: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        deleteDoc(typingRef);
      }, 3000);
    } else {
      deleteDoc(typingRef);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text]);

  /* ------------------ Edit Mode ------------------ */

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
    }
  }, [editingMessage]);

  /* ------------------ Send ------------------ */

  const handleSend = () => {
    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db, 'groups', GROUP_ID, 'typing', user.uid));
    }

    if (selectedMedia.length > 0) {
      let type: 'image' | 'video' | 'audio' = 'image';

      if (selectedMedia.some(f => f.type.startsWith('video/'))) type = 'video';
      if (selectedMedia.some(f => f.type.startsWith('audio/'))) type = 'audio';

      onSendMedia(selectedMedia, type);

      mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
      setSelectedMedia([]);
      setMediaPreviews([]);
    }

    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }

    setShowEmojiPicker(false);
    setIsExpanded(false);
  };

  /* ------------------ File Select ------------------ */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previews: any[] = [];

    files.forEach(file => {
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
        alert('Video exceeds 50MB limit');
        return;
      }

      let type: 'image' | 'video' | 'audio' = 'image';

      if (file.type.startsWith('video/')) type = 'video';
      if (file.type.startsWith('audio/')) type = 'audio';

      previews.push({
        url: URL.createObjectURL(file),
        type
      });
    });

    setSelectedMedia(files);
    setMediaPreviews(previews);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="px-4 py-3 relative w-full">

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileSelect} />
      <input ref={galleryInputRef} type="file" accept="image/*,video/*,audio/*" multiple hidden onChange={handleFileSelect} />

      {/* Reply Preview */}
      {(replyingTo || editingMessage) && (
        <div className="mb-2 bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center">
          <div>
            <div className="text-xs text-blue-400 flex items-center gap-1">
              {editingMessage ? <Edit2 size={12}/> : <CornerUpLeft size={12}/>}
              {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}
            </div>
            <div className="text-xs text-white/60 truncate max-w-[220px]">
              {editingMessage?.content || replyingTo?.content}
            </div>
          </div>
          <button onClick={editingMessage ? onCancelEdit : onCancelReply}>
            <X size={16}/>
          </button>
        </div>
      )}

      {/* Media Preview */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto">
          {mediaPreviews.map((item, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-black">
              {item.type === 'image' && <img src={item.url} className="w-full h-full object-cover" />}
              {item.type === 'video' && <video src={item.url} className="w-full h-full object-cover" />}
              {item.type === 'audio' && (
                <div className="flex items-center justify-center h-full text-white text-xs">
                  🎵 Audio
                </div>
              )}
              <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-3xl px-3 py-2">

        <button onClick={() => galleryInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10">
          <Plus size={20}/>
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent outline-none resize-none text-white text-sm"
          rows={1}
        />

        <button onClick={()=>setShowEmojiPicker(!showEmojiPicker)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-yellow-400">
          <Smile size={20}/>
        </button>

        <button
          onClick={handleSend}
          className={`w-11 h-11 flex items-center justify-center rounded-full ${
            text || selectedMedia.length > 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'
          }`}
        >
          {text || selectedMedia.length > 0 ? <Send size={18}/> : <Mic size={20}/>}
        </button>

      </div>
    </div>
  );
};

export default ChatInput;
