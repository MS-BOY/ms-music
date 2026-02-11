import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smile, Mic, Send, Camera, Image, Music as MusicIcon, X, CornerUpLeft, Edit2, Film, Search } from 'lucide-react';
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
const EMOJI_LIST = ['❤️', '😂', '🔥', '🙌', '😮', '😢', '💯', '✨', '🎵', '🎹', '🎸', '🎧', '⚡️', '🌈', '💎', '👑', '🚀', '🛸', '👾', '🎉'];

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
  const [mediaPreviews, setMediaPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cancelOffset, setCancelOffset] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Voice refs
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef<number | null>(null);
  const isCancelledRef = useRef(false);

  const formatTime = (seconds: number) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

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
      typingTimeoutRef.current = setTimeout(() => {
        deleteDoc(typingDocRef);
      }, 3000);
    } else {
      deleteDoc(typingDocRef);
    }
  }, [text]);

  // Focus & edit/reply
  useEffect(() => {
    if ((replyingTo || editingMessage) && inputRef.current) {
      inputRef.current.focus();
    }
    if (editingMessage) {
      setText(editingMessage.content);
    } else if (!replyingTo) {
      setText('');
    }
  }, [replyingTo, editingMessage]);

  // Start recording
  const startRecording = async (e: React.PointerEvent) => {
    if (text || selectedMedia.length > 0 || isRecording) return;
    e.preventDefault();

    startXRef.current = e.clientX;
    setCancelOffset(0);
    isCancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (!isCancelledRef.current && recordingTime >= 1) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          onSendMedia([file], 'audio');
        }
        chunksRef.current = [];
      };

      recorder.start();
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

      setIsRecording(true);
      setRecordingTime(0);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone permission.');
    }
  };

  // Pointer move (for cancel)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording || startXRef.current === null) return;
    const offset = startXRef.current - e.clientX;
    if (offset > 0) {
      setCancelOffset(offset);
      isCancelledRef.current = offset > 120;
    }
  };

  // Stop recording
  const stopRecording = (e?: React.PointerEvent) => {
    if (!isRecording) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }

    setIsRecording(false);
    setRecordingTime(0);
    setCancelOffset(0);
    startXRef.current = null;

    if (isCancelledRef.current && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const handleSend = () => {
    // existing send logic...
    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db, 'groups', GROUP_ID, 'typing', user.uid));
    }
    if (selectedMedia.length > 0) {
      const hasVideo = selectedMedia.some(f => f.type.startsWith('video/'));
      onSendMedia(selectedMedia, hasVideo ? 'video' : 'image');
      mediaPreviews.forEach(p => URL.revokeObjectURL(p.url));
      setSelectedMedia([]);
      setMediaPreviews([]);
    }
    if (text.trim()) {
      onSend(text);
      setText('');
    }
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setShowEmojiPicker(false);
  };

  // rest of handlers (file select, emoji, etc.) unchanged...
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'camera' | 'gallery') => {
    // unchanged...
  };

  const removeMedia = (index: number) => {
    // unchanged...
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const filteredTracks = libraryTracks.filter(t =>
    t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(musicSearch.toLowerCase())
  );

  const hasContent = text.trim() || selectedMedia.length > 0;
  const isVoiceMode = !hasContent && !isRecording;

  return (
    // whole return JSX unchanged until the input bar...
    <div className="px-4 py-4 bg-transparent relative z-20 w-full max-w-4xl">
      {/* hidden inputs, emoji picker, reply/edit preview, media previews — unchanged */}

      <motion.div layout className="glass rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-2 flex items-end gap-2 bg-[#0a0a0a]/70 backdrop-blur-2xl relative transform-style-3d">
        {/* + button — hide during recording */}
        {!isRecording && (
          <div className="relative">
            {/* + button & expanded menu — unchanged */}
          </div>
        )}

        {/* Input / Recording area */}
        <div className="flex-1 min-h-[48px] flex items-center px-3 relative overflow-hidden">
          {!isRecording ? (
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={handleInputChange}
              placeholder={replyingTo ? "Compose reply..." : editingMessage ? "Revise message..." : "Type a message..."}
              className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20 resize-none max-h-32 py-3.5"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              onFocus={() => setShowEmojiPicker(false)}
            />
          ) : (
            <div className="relative w-full h-full flex items-center">
              <div className="absolute left-4 text-white/30 pointer-events-none select-none">
                ←←← Slide to cancel
              </div>

              <motion.div
                animate={{ x: -Math.min(cancelOffset, 300) }}
                transition={{ type: "tween", ease: "easeOut" }}
                className="flex items-center gap-4 pl-4"
              >
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <span className="text-white font-bold text-lg">{formatTime(recordingTime)}</span>
              </motion.div>

              {cancelOffset > 120 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-red-500 font-black text-xl">Release to cancel</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emoji & Send/Mic button */}
        <div className="flex items-center gap-1.5 px-1.5 pb-1.5">
          {!isRecording && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showEmojiPicker ? 'text-yellow-400 bg-white/10 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'text-white/30 hover:bg-white/5'}`}
            >
              <Smile size={22} />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              hasContent ? 'bg-blue-600 shadow-[0_10px_30px_rgba(59,130,246,0.4)] text-white' :
              isRecording ? 'bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.4)] text-white' :
              'bg-white/5 text-white/30 hover:bg-white/10'
            }`}
            onClick={hasContent ? handleSend : undefined}
            onPointerDown={isVoiceMode ? startRecording : undefined}
            onPointerMove={isRecording ? handlePointerMove : undefined}
            onPointerUp={isRecording ? stopRecording : undefined}
            onPointerLeave={isRecording ? stopRecording : undefined}
            onPointerCancel={isRecording ? stopRecording : undefined}
          >
            {hasContent ? <Send size={18} className="ml-0.5" /> : <Mic size={22} />}
          </motion.button>
        </div>
      </motion.div>

      {/* Music selector modal — unchanged */}
    </div>
  );
};

// ActionButton unchanged...

export default ChatInput;
