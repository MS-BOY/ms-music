import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc, limitToLast } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Group, Track } from '../types';

// Components
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
const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dw3oixfbg/auto/upload";
const CLOUDINARY_PRESET = "profile";

const ChatScreen: React.FC<Props> = ({ onBack, onSettings, hasPlayer, tracks, onSelectTrack }) => {
  // States
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

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  // 1. Optimized Data Listeners
  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    getDoc(groupRef).then((snap) => { if (!snap.exists()) setDoc(groupRef, MS_GROUP); });

    const unsubGroup = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) setGroupData(doc.data() as Group);
    });
    
    const unsubMembers = onSnapshot(collection(db, 'users'), (snap) => {
      setMemberCount(snap.size);
    });

    return () => { unsubGroup(); unsubMembers(); };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'groups', GROUP_ID, 'messages'), orderBy('timestamp', 'asc'), limitToLast(80));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
    });
  }, []);

  useEffect(() => {
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');
    return onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(u => u.id !== auth.currentUser?.uid && (now - u.timestamp) < 4000);
      setTypingUsers(users);
    });
  }, []);

  // 2. Performance: Intelligent Scrolling
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior });
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottom.current = scrollHeight - scrollTop <= clientHeight + 150;
  };

  useEffect(() => {
    if (isAtBottom.current) {
      scrollToBottom(messages.length < 10 ? 'auto' : 'smooth');
    }
  }, [messages.length, optimisticMessages.length, scrollToBottom]);

  // 3. Handlers (Memoized)
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !auth.currentUser) return;

    if (editingMessage) {
      await updateDoc(doc(db, 'groups', GROUP_ID, 'messages', editingMessage.id), { content: text, isEdited: true });
      setEditingMessage(null);
      return;
    }

    const newMessage = {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://picsum.photos/200',
      content: text,
      timestamp: Date.now(),
      type: 'text',
      reactions: [],
      ...(replyingTo && { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content, type: replyingTo.type } })
    };

    setReplyingTo(null);
    scrollToBottom('smooth');
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  }, [editingMessage, replyingTo, scrollToBottom]);

  const handleSendMedia = async (files: File[], type: 'image' | 'video' | 'audio') => {
    if (!auth.currentUser || files.length === 0) return;
    const timestamp = Date.now();
    const tempId = `opt-${timestamp}`;
    
    const optimisticMsg: Message = {
      id: tempId,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://picsum.photos/200',
      content: URL.createObjectURL(files[0]),
      attachments: files.map(f => URL.createObjectURL(f)),
      timestamp,
      type: files.length > 1 ? 'image-grid' : (type === 'audio' ? 'audio' : (type === 'video' ? 'video' : 'image')),
      reactions: [],
      status: 'sending',
      uploadProgress: 0
    };

    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom('smooth');

    try {
      const upload = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
      };

      const urls = await Promise.all(files.map(upload));
      const { status, uploadProgress, id, ...dbMsg } = { ...optimisticMsg, content: urls[0], attachments: urls } as any;
      await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), dbMsg);
    } catch (e) {
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleSendTrack = useCallback(async (track: Track) => {
    if (!auth.currentUser) return;
    const newMessage = {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || 'https://picsum.photos/200',
      content: JSON.stringify(track),
      timestamp: Date.now(),
      type: 'music',
      reactions: [],
      ...(replyingTo && { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content, type: replyingTo.type } })
    };
    setReplyingTo(null);
    scrollToBottom('smooth');
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  }, [replyingTo, scrollToBottom]);

  const handleOpenMenu = (e: any, msg: Message) => {
    if (msg.id.startsWith('opt-')) return;
    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : e;
    const x = Math.min(touch.clientX, window.innerWidth - 240);
    const y = Math.min(touch.clientY, window.innerHeight - 340);
    setMenuPosition({ x, y });
    setSelectedMessage(msg);
    setMenuOpen(true);
  };

  const combinedMessages = useMemo(() => 
    [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp),
    [messages, optimisticMessages]
  );

  const headerTop = hasPlayer ? 'top-[72px]' : 'top-0';

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden transform-gpu">
      {/* HEADER */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 transition-all duration-300 ${headerTop}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-white/10 text-white/70">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 relative bg-white/5">
              <img src={groupData.photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black" />
            </div>
            <div>
              <h2 className="text-sm font-black font-outfit uppercase tracking-tighter leading-tight">{groupData.name}</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{memberCount} Members Online</p>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 text-white/40">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* MESSAGE LIST - Optimized scrolling */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar pt-24 pb-32 px-4 space-y-1"
        style={{ overflowAnchor: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-5 max-w-4xl mx-auto will-change-transform">
          {combinedMessages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isMe={msg.senderId === auth.currentUser?.uid} 
              showAvatar={idx === 0 || combinedMessages[idx-1].senderId !== msg.senderId}
              onOpenMenu={handleOpenMenu}
              onMediaClick={(url, all) => { setViewerItems(all); setViewerIndex(all.findIndex(i => i.url === url)); setViewerOpen(true); }}
              onSelectTrack={onSelectTrack}
              onReply={setReplyingTo}
            />
          ))}
          <div ref={bottomRef} className="h-4 w-full" />
        </div>
      </div>

      {/* INPUT CONTAINER */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 ml-4">
                <TypingIndicator users={typingUsers} />
              </motion.div>
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
      </div>

      {/* SNAP MENU */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x }}
              className="z-[101] w-56 bg-[#111111]/95 backdrop-blur-xl rounded-[28px] border border-white/10 shadow-2xl p-1.5 overflow-hidden"
            >
              <div className="flex justify-between px-2 py-2 border-b border-white/5 mb-1 bg-white/5 rounded-t-[22px]">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={async () => {
                    const msgRef = doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id);
                    const exs = selectedMessage.reactions || [];
                    await updateDoc(msgRef, { reactions: exs.includes(emoji) ? exs.filter(r => r !== emoji) : [...exs, emoji] });
                    setMenuOpen(false);
                  }} className="text-lg hover:scale-125 transition-transform active:scale-90">{emoji}</button>
                ))}
              </div>
              <MenuAction label="Reply" onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} />
              <MenuAction label="Copy" onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} />
              {auth.currentUser?.uid === selectedMessage.senderId && (
                <>
                  <MenuAction label="Edit" onClick={() => { setEditingMessage(selectedMessage); setMenuOpen(false); }} />
                  <MenuAction label="Unsend" color="text-red-500" onClick={async () => { await deleteDoc(doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id)); setMenuOpen(false); }} />
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

const MenuAction = memo(({ label, onClick, color = "text-white/80" }: any) => (
  <button onClick={onClick} className={`w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-[13px] font-black uppercase tracking-tight transition-colors ${color}`}>
    {label}
  </button>
));

export default ChatScreen;
