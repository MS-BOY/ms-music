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
  Edit2
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

const GROUP_ID = 'group-1';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

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
  const [showActions, setShowActions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<any[]>([]);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  /* ---------------- SMART REPLY DETECT ---------------- */

  const detectType = (content: any) => {
    if (!content) return 'text';

    if (typeof content === 'object' && content?.title) return 'music';

    if (typeof content !== 'string') return 'text';

    if (content.includes('res.cloudinary.com') && content.includes('/image/'))
      return 'image';

    if (content.includes('res.cloudinary.com') && content.includes('/video/'))
      return 'video';

    if (content.includes('firebasestorage.googleapis.com') && content.includes('image'))
      return 'image';

    if (content.includes('firebasestorage.googleapis.com') && content.includes('video'))
      return 'video';

    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(content)) return 'image';
    if (/\.(mp4|webm|ogg)$/i.test(content)) return 'video';

    return 'text';
  };

  /* ---------------- SEND ---------------- */

  const handleSend = () => {

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

    setShowActions(false);
  };

  /* ---------------- FILE SELECT ---------------- */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previews: any[] = [];

    files.forEach(file => {
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
        alert('Video exceeds 50MB');
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

  /* ---------------- UI ---------------- */

  return (
    <div className="px-4 py-3 relative w-full">

      {/* Hidden Inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileSelect}/>
      <input ref={galleryRef} type="file" accept="image/*,video/*,audio/*" multiple hidden onChange={handleFileSelect}/>

      {/* Reply Preview */}
      {(replyingTo || editingMessage) && (
        <div className="mb-3 bg-[#1a1a1a] border border-white/10 p-3 rounded-2xl flex justify-between items-center">

          <div className="flex gap-3 items-center">

            {/* Media Preview */}
            {(() => {
              const content = editingMessage?.content || replyingTo?.content;
              const type = detectType(content);

              if (type === 'image') {
                return <img src={content} className="w-12 h-12 rounded-lg object-cover"/>;
              }

              if (type === 'video') {
                return (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <video src={`${content}#t=0.1`} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs text-white">
                      ▶
                    </div>
                  </div>
                );
              }

              if (type === 'music') {
                return (
                  <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
                    🎵
                  </div>
                );
              }

              return null;
            })()}

            <div>
              <div className="text-xs text-blue-400 flex items-center gap-1">
                {editingMessage ? <Edit2 size={12}/> : <CornerUpLeft size={12}/>}
                {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}
              </div>
              <div className="text-xs text-white/60 truncate max-w-[200px]">
                {editingMessage?.content || replyingTo?.content}
              </div>
            </div>

          </div>

          <button onClick={editingMessage ? onCancelEdit : onCancelReply}>
            <X size={16}/>
          </button>
        </div>
      )}

      {/* Selected Media Preview */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto">
          {mediaPreviews.map((item, i) => (
            <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden">
              {item.type === 'image' && <img src={item.url} className="w-full h-full object-cover"/>}
              {item.type === 'video' && <video src={item.url} className="w-full h-full object-cover"/>}
              {item.type === 'audio' && <div className="flex items-center justify-center h-full bg-purple-600 text-white text-xs">🎵 Audio</div>}
              <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 bg-black/70 rounded-full p-1">
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons Expand */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-4 mb-3"
          >
            <button onClick={()=>cameraRef.current?.click()} className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Camera size={20}/>
            </button>

            <button onClick={()=>galleryRef.current?.click()} className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Image size={20}/>
            </button>

            <button className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <MusicIcon size={20}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-full px-3 py-2">

        <button onClick={()=>setShowActions(!showActions)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
          <Plus size={20}/>
        </button>

        <textarea
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent outline-none resize-none text-white text-sm"
          rows={1}
        />

        <button
          onClick={handleSend}
          className={`w-11 h-11 rounded-full flex items-center justify-center ${
            text || selectedMedia.length > 0
              ? 'bg-blue-600 text-white'
              : 'bg-white/10 text-white'
          }`}
        >
          {text || selectedMedia.length > 0 ? <Send size={18}/> : <Mic size={20}/>}
        </button>

      </div>

    </div>
  );
};

export default ChatInput;
