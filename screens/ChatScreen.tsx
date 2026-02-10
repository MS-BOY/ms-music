// ChatScreen.tsx
import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Group, Track } from '../types';
import ChatInput from './ChatInput';
import MediaViewer from './MediaViewer';
import TypingIndicator from './TypingIndicator';
import MessageBubble from './MessageBubble';

interface Props {
  onBack: () => void;
  onSettings: () => void;
  hasPlayer?: boolean;
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
}

const GROUP_ID = 'group-1';
const REACTIONS = ['❤️', '😂', '😮', '😢', '😠', '👍'];
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dw3oixfbg/auto/upload";
const CLOUDINARY_PRESET = "profile";

const ChatScreen: React.FC<Props> = ({ onBack, onSettings, hasPlayer, tracks, onSelectTrack }) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [groupData, setGroupData] = useState<Group>(MS_GROUP);
  const [memberCount, setMemberCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch group data
  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    getDoc(groupRef).then(snap => { if (!snap.exists()) setDoc(groupRef, MS_GROUP) });
    const unsub = onSnapshot(groupRef, doc => { if (doc.exists()) setGroupData(doc.data() as Group) });
    return () => unsub();
  }, []);

  // Listen typing users
  useEffect(() => {
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');
    const unsub = onSnapshot(typingRef, snapshot => {
      const now = Date.now();
      const users = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(u => u.id !== auth.currentUser?.uid && now - u.timestamp < 5000);
      setTypingUsers(users);
    });

    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 5000));
    }, 2000);

    return () => { unsub(); clearInterval(interval); }
  }, []);

  // Member count
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snapshot => setMemberCount(snapshot.size));
    return () => unsub();
  }, []);

  // Messages
  useEffect(() => {
    const q = query(collection(db, 'groups', GROUP_ID, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
    });
    return () => unsub();
  }, []);

  // Auto scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, optimisticMessages.length]);

  // Cloudinary upload
  const uploadToCloudinary = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_UPLOAD_URL, true);
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)) };
      xhr.onload = () => { xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject(new Error('Upload failed')) };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !auth.currentUser) return;

    if (editingMessage) {
      const msgRef = doc(db, 'groups', GROUP_ID, 'messages', editingMessage.id);
      await updateDoc(msgRef, { content: text, isEdited: true });
      setEditingMessage(null);
      return;
    }

    const newMessage: Omit<Message, 'id'> = {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://picsum.photos/200',
      content: text,
      timestamp: Date.now(),
      type: 'text',
      reactions: [],
      ...(replyingTo ? {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type
        }
      } : {})
    };

    setReplyingTo(null);
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  };

  // Send media
  const handleSendMedia = async (files: File[], type: 'image' | 'video' | 'audio') => {
    if (!auth.currentUser || files.length === 0) return;
    const timestamp = Date.now();
    const tempId = `optimistic-${timestamp}`;
    const localPreviews = files.map(f => URL.createObjectURL(f));

    const optimisticMsg: Message = {
      id: tempId,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://picsum.photos/200',
      content: localPreviews[0],
      attachments: localPreviews,
      timestamp,
      type: files.length > 1 ? 'image-grid' : (type === 'audio' ? 'audio' : (type === 'video' ? 'video' : 'image')),
      reactions: [],
      status: 'sending',
      uploadProgress: 0
    };

    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    setReplyingTo(null);

    try {
      const uploadedUrls = await Promise.all(files.map(file => uploadToCloudinary(file, p => {
        setOptimisticMessages(prev => prev.map(m => m.id === tempId ? { ...m, uploadProgress: p } : m));
      })));

      const finalMessage: Omit<Message, 'id'> = { ...optimisticMsg, content: uploadedUrls[0], attachments: uploadedUrls, status: 'sent', uploadProgress: 100 };
      const { id, status, uploadProgress, ...dbMessage } = finalMessage as any;
      await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), dbMessage);
    } catch (err) {
      console.error(err);
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Failed to send media.");
    }
  };

  // Send track
  const handleSendTrack = async (track: Track) => {
    if (!auth.currentUser) return;
    const newMessage: Omit<Message, 'id'> = {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://picsum.photos/200',
      content: JSON.stringify(track),
      timestamp: Date.now(),
      type: 'music',
      reactions: [],
    };
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  };

  // Open message menu
  const handleOpenMenu = (e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    if (msg.id.startsWith('optimistic-')) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const menuWidth = 224;
    const x = Math.min(clientX, window.innerWidth - menuWidth - 20);
    const y = Math.min(clientY, window.innerHeight - 300);

    setMenuPosition({ x, y });
    setSelectedMessage(msg);
    setMenuOpen(true);
  };

  // Handle reaction
  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    const msgRef = doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id);
    const existing = selectedMessage.reactions || [];
    const newReactions = existing.includes(emoji) ? existing.filter(r => r !== emoji) : [...existing, emoji];
    await updateDoc(msgRef, { reactions: newReactions });
    setMenuOpen(false);
  };

  // Combine messages
  const combinedMessages = [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* Header */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] glass bg-black/60 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 backdrop-blur-[20px]`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg relative">
              <img src={groupData.photo} alt={groupData.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#050505]" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-black uppercase tracking-tight">{groupData.name}</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase">{memberCount} Members Online</p>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 text-white/40">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth space-y-4 px-3 sm:px-6 pt-[80px] pb-[140px]`}
      >
        {combinedMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === auth.currentUser?.uid}
            showAvatar={idx === 0 || combinedMessages[idx-1].senderId !== msg.senderId}
            onOpenMenu={handleOpenMenu}
            onMediaClick={(url, all) => { setViewerItems(all); setViewerIndex(all.findIndex(i => i.url === url)); setViewerOpen(true); }}
            onSelectTrack={onSelectTrack}
          />
        ))}
      </div>

      {/* Typing + Input */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex flex-col items-center w-full px-3 sm:px-6 py-2 bg-gradient-to-t from-black via-black/90 to-transparent">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <div className="w-full max-w-4xl">
              <TypingIndicator users={typingUsers} />
            </div>
          )}
        </AnimatePresence>

        <ChatInput
          onSend={handleSendMessage}
          onSendMedia={handleSendMedia}
          onSendTrack={handleSendTrack}
          libraryTracks={tracks}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      {/* Menu */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[100]"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{ top: menuPosition.y, left: menuPosition.x }}
              className="z-[101] w-56 glass-high rounded-[24px] border border-white/10 shadow-lg p-1.5 bg-[#0a0a0a]/95"
            >
              <div className="flex justify-around p-1 border-b border-white/5 mb-1">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-110 transition-transform p-1">{emoji}</button>
                ))}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-xl text-[13px] font-bold">Copy</button>
              <button onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-xl text-[13px] font-bold">Reply</button>
              {auth.currentUser?.uid === selectedMessage.senderId && selectedMessage.type === 'text' && (
                <button onClick={() => { setEditingMessage(selectedMessage); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-xl text-[13px] font-bold">Edit</button>
              )}
              {auth.currentUser?.uid === selectedMessage.senderId && (
                <button onClick={async () => { await deleteDoc(doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id)); setMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-red-500/10 rounded-xl text-[13px] font-bold text-red-500">Unsend</button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Media Viewer */}
      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

export default ChatScreen;
