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
  onSendMedia: (files: File[], type: 'image' | 'video') => void;
  onSendTrack?: (track: Track) => void;
  libraryTracks?: Track[];
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
}

const GROUP_ID = 'group-1';
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const EMOJI_LIST = ['❤️','😂','🔥','🙌','😮','😢','💯','✨','🎵','🎧','⚡','🌈','💎','👑','🚀'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<any[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ------------------ Reply Preview Helper ------------------ */

  const getPreviewContent = (content: string) => {
    if (!content) return '';

    if (content.includes('cloudinary.com')) {
      if (content.match(/\.(jpg|jpeg|png|webp)/)) return '📷 Image';
      if (content.match(/\.(mp4|webm|mov)/)) return '🎥 Video';
      if (content.match(/\.mp3/)) return '🎵 Audio';
    }

    return content.length > 40 ? content.slice(0, 40) + '...' : content;
  };

  /* ------------------ Send ------------------ */

  const handleSend = () => {
    if (selectedMedia.length > 0) {
      const hasVideo = selectedMedia.some(f => f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo ? 'video' : 'image');
      setSelectedMedia([]);
      setMediaPreviews([]);
    }

    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }

    setShowEmojiPicker(false);
  };

  /* ------------------ File Select ------------------ */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const previews: any[] = [];

    files.forEach(file => {
      if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
        alert('Video exceeds 50MB');
        return;
      }

      previews.push({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image'
      });
    });

    setSelectedMedia(files);
    setMediaPreviews(previews);
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="relative w-full px-4 py-3">

      {/* Reply Preview */}
      <AnimatePresence>
        {(replyingTo || editingMessage) && (
          <motion.div
            initial={{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0,y:10}}
            className="mb-2"
          >
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-3 flex justify-between items-center">
              <div>
                <div className="text-xs text-blue-400 font-semibold flex items-center gap-2">
                  {editingMessage ? <Edit2 size={14}/> : <CornerUpLeft size={14}/>}
                  {editingMessage ? 'Editing Message' : `Replying to ${replyingTo?.senderName}`}
                </div>
                <div className="text-xs text-white/60">
                  {getPreviewContent(editingMessage?.content || replyingTo?.content || '')}
                </div>
              </div>
              <button
                onClick={editingMessage ? onCancelEdit : onCancelReply}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X size={16}/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto">
          {mediaPreviews.map((item, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
              {item.type === 'video' ?
                <video src={item.url} className="w-full h-full object-cover" /> :
                <img src={item.url} className="w-full h-full object-cover" />
              }
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-3xl px-3 py-2 backdrop-blur-xl">

        {/* Plus */}
        <button
          onClick={() => document.getElementById('fileInput')?.click()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <Plus size={20}/>
        </button>

        <input
          id="fileInput"
          type="file"
          multiple
          accept="image/*,video/*"
          hidden
          onChange={handleFileSelect}
        />

        {/* Textarea */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent outline-none resize-none text-white text-sm py-2"
          rows={1}
        />

        {/* Emoji */}
        <button
          onClick={()=>setShowEmojiPicker(!showEmojiPicker)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-yellow-400"
        >
          <Smile size={20}/>
        </button>

        {/* Send / Mic */}
        <button
          onClick={handleSend}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition ${
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
