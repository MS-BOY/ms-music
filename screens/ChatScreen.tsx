import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, ChevronLeft, Copy, Edit2, Trash2, X } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Group, Track } from '../types';

// Memoized Components for Performance
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
  
  // Refs for high-speed access
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef<number>(0);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 1. Efficient Scroll to Bottom (Throttled for 120Hz)
  const scrollToBottom = useCallback((force = false) => {
    if (!scrollRef.current) return;
    const now = Date.now();
    if (force || now - lastScrollTime.current > 100) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: force ? 'auto' : 'smooth'
      });
      lastScrollTime.current = now;
    }
  }, []);

  // Sync Group Data & Typing Status (Pruned)
  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');

    const unSubGroup = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) setGroupData(doc.data() as Group);
    });

    const unSubTyping = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      setTypingUsers(snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(u => u.id !== auth.currentUser?.uid && (now - u.timestamp) < 5000)
      );
    });

    return () => { unSubGroup(); unSubTyping(); };
  }, []);

  // Listen for Messages with Memory Management
  useEffect(() => {
    const q = query(collection(db, 'groups', GROUP_ID, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
      scrollToBottom();
    });
  }, [scrollToBottom]);

  // 2. Performance: Combined Messages (Memoized)
  const combinedMessages = useMemo(() => {
    return [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, optimisticMessages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !auth.currentUser) return;

    if (editingMessage) {
      const msgRef = doc(db, 'groups', GROUP_ID, 'messages', editingMessage.id);
      await updateDoc(msgRef, { content: text, isEdited: true });
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
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type
        }
      })
    };

    setReplyingTo(null);
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
    scrollToBottom(true);
  };

  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    if (msg.id.startsWith('optimistic-')) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setMenuPosition({ 
      x: Math.min(clientX, window.innerWidth - 230), 
      y: Math.min(clientY, window.innerHeight - 250) 
    });
    setSelectedMessage(msg);
    setMenuOpen(true);
  }, []);

  // Optimization: Style variables calculated outside render
  const headerStickyTop = hasPlayer ? '72px' : '0px';
  const mainContentPadding = hasPlayer ? '144px' : '72px';

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden transform-gpu">
      {/* HEADER - Solid background for better FPS */}
      <header 
        style={{ top: headerStickyTop }}
        className="fixed left-0 right-0 h-[72px] z-[90] bg-[#0a0a0a] border-b border-white/[0.05] flex items-center justify-between px-6 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-white/70 active:scale-90 transition-transform">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-white/5">
              <img src={groupData.photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-white">{groupData.name}</h2>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">{memberCount} Online</p>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 text-white/40"><MoreVertical size={20} /></button>
      </header>

      {/* MESSAGE LIST - Hardware Accelerated */}
      <div 
        ref={scrollRef} 
        style={{ paddingTop: mainContentPadding }}
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth space-y-2 pb-32 transform-gpu"
      >
        <div className="h-4" />
        {combinedMessages.map((msg, idx) => (
          <div key={msg.id} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 60px' }}>
            <MessageBubble 
              message={msg} 
              isMe={msg.senderId === auth.currentUser?.uid} 
              showAvatar={idx === 0 || combinedMessages[idx-1].senderId !== msg.senderId}
              onOpenMenu={handleOpenMenu}
              onReply={(m) => setReplyingTo(m)}
              onMediaClick={(url, all) => {
                setViewerItems(all);
                setViewerIndex(all.findIndex(i => i.url === url));
                setViewerOpen(true);
              }}
              onSelectTrack={onSelectTrack}
            />
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className="absolute bottom-0 left-0 right-0 z-[100] bg-gradient-to-t from-black via-black/80 to-transparent">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <div className="px-6 mb-1"><TypingIndicator users={typingUsers} /></div>
          )}
        </AnimatePresence>
        
        <ChatInput 
          onSend={handleSendMessage} 
          onSendMedia={() => {}} // Connect your handleSendMedia
          onSendTrack={() => {}} // Connect your handleSendTrack
          libraryTracks={tracks}
          replyingTo={replyingTo} 
          onCancelReply={() => setReplyingTo(null)} 
          editingMessage={editingMessage} 
          onCancelEdit={() => setEditingMessage(null)} 
        />
      </div>

      {/* ACTION MENU */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100]" 
              onClick={() => setMenuOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x }}
              className="z-[101] w-52 bg-[#121212] rounded-[24px] border border-white/10 shadow-2xl p-1.5 overflow-hidden"
            >
              <div className="flex justify-between p-2 border-b border-white/5 mb-1">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => {}} className="text-xl active:scale-125 transition-transform">{emoji}</button>
                ))}
              </div>
              <MenuBtn icon={<Copy size={16}/>} label="Copy" onClick={() => {}} />
              <MenuBtn icon={<ReplyIcon size={16}/>} label="Reply" onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} />
              {auth.currentUser?.uid === selectedMessage.senderId && (
                <MenuBtn icon={<Trash2 size={16} className="text-red-500"/>} label="Delete" onClick={() => {}} />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

const MenuBtn = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[13px] font-medium text-white/80 transition-colors">
    {icon} {label}
  </button>
);

const ReplyIcon = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

export default memo(ChatScreen);
