import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Group, Track } from '../types';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import MediaViewer from '../components/MediaViewer';
import TypingIndicator from '../components/TypingIndicator';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [groupData, setGroupData] = useState<Group>(MS_GROUP);
  const [memberCount, setMemberCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // ---------------- Responsive height listener ----------------
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------- Firestore Group ----------------
  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    getDoc(groupRef).then((snap) => {
      if (!snap.exists()) setDoc(groupRef, MS_GROUP);
    });
    const unsubscribe = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) setGroupData(doc.data() as Group);
    });
    return () => unsubscribe();
  }, []);

  // ---------------- Typing Users ----------------
  useEffect(() => {
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');
    const unsubscribe = onSnapshot(typingRef, snapshot => {
      const now = Date.now();
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(user => user.id !== auth.currentUser?.uid && (now - user.timestamp) < 5000);
      setTypingUsers(users);
    });
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(user => (now - user.timestamp) < 5000));
    }, 2000);
    return () => { unsubscribe(); clearInterval(interval); };
  }, []);

  // ---------------- Member Count ----------------
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), snapshot => setMemberCount(snapshot.size));
    return () => unsubscribe();
  }, []);

  // ---------------- Messages ----------------
  useEffect(() => {
    const messagesRef = collection(db, 'groups', GROUP_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
    });
    return () => unsubscribe();
  }, []);

  // ---------------- Auto Scroll ----------------
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, optimisticMessages.length]);

  // ---------------- Combine messages ----------------
  const combinedMessages = [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp);

  // ---------------- Menu Position ----------------
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

  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    const msgRef = doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id);
    const existing = selectedMessage.reactions || [];
    const newReactions = existing.includes(emoji) ? existing.filter(r => r !== emoji) : [...existing, emoji];
    await updateDoc(msgRef, { reactions: newReactions });
    setMenuOpen(false);
  };

  return (
    <div className="flex flex-col w-full" style={{ height: viewportHeight, backgroundColor: '#050505' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-[90] glass bg-black/60 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-[40px]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg relative">
              <img src={groupData.photo} alt={groupData.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#050505]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter">{groupData.name}</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{memberCount} Members Online</p>
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
        className="flex-1 overflow-y-auto scroll-smooth no-scrollbar px-4 pt-[72px] pb-[104px]"
        style={{ height: viewportHeight }}
      >
        {combinedMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === auth.currentUser?.uid}
            showAvatar={idx === 0 || combinedMessages[idx - 1].senderId !== msg.senderId}
            onOpenMenu={e => handleOpenMenu(e as any, msg)}
            onMediaClick={(url, all) => { setViewerItems(all); setViewerIndex(all.findIndex(i => i.url === url)); setViewerOpen(true); }}
            onSelectTrack={onSelectTrack}
          />
        ))}
      </div>

      {/* Typing + Input */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-4 py-2 flex flex-col">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
        </AnimatePresence>
        <ChatInput
          onSend={() => {}}
          onSendMedia={() => {}}
          onSendTrack={() => {}}
          libraryTracks={tracks}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      {/* Media Viewer */}
      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

export default ChatScreen;
