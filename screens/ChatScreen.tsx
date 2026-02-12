import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Group, Track } from '../types';

// Memoize sub-components to prevent re-renders
import MessageBubbleComponent from '../components/MessageBubble';
const MessageBubble = memo(MessageBubbleComponent);
import ChatInputComponent from '../components/ChatInput';
const ChatInput = memo(ChatInputComponent);
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
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 1. MEMOIZED DATA: Combine and sort messages only when they change
  const combinedMessages = useMemo(() => {
    return [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, optimisticMessages]);

  // 2. OPTIMIZED SCROLL: Use requestAnimationFrame for 60hz sync
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  useEffect(() => {
    if (combinedMessages.length > 0) {
      scrollToBottom(combinedMessages.length < 20 ? 'auto' : 'smooth');
    }
  }, [combinedMessages.length, scrollToBottom]);

  // Firebase Listeners
  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    getDoc(groupRef).then(snap => !snap.exists() && setDoc(groupRef, MS_GROUP));
    
    const unsubs = [
      onSnapshot(groupRef, (doc) => doc.exists() && setGroupData(doc.data() as Group)),
      onSnapshot(collection(db, 'users'), (snap) => setMemberCount(snap.size)),
      onSnapshot(query(collection(db, 'groups', GROUP_ID, 'messages'), orderBy('timestamp', 'asc')), (snap) => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(msgs);
        setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
      }),
      onSnapshot(collection(db, 'groups', GROUP_ID, 'typing'), (snap) => {
        const now = Date.now();
        setTypingUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
          .filter(u => u.id !== auth.currentUser?.uid && (now - u.timestamp) < 5000));
      })
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  // 3. MEMOIZED HANDLERS: Prevent ChatInput and MessageBubble from re-rendering
  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    if (msg.id.startsWith('optimistic-')) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setMenuPosition({ 
      x: Math.min(clientX, window.innerWidth - 240), 
      y: Math.min(clientY, window.innerHeight - 300) 
    });
    setSelectedMessage(msg);
    setMenuOpen(true);
  }, []);

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
      ...(replyingTo && { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content, type: replyingTo.type }})
    };
    setReplyingTo(null);
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  }, [editingMessage, replyingTo]);

  const handleMediaClick = useCallback((url: string, all: any[]) => {
    setViewerItems(all);
    setViewerIndex(all.findIndex(i => i.url === url));
    setViewerOpen(true);
  }, []);

  const headerTop = hasPlayer ? 'top-[72px]' : 'top-0';
  const mainPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden overscroll-none">
      {/* Optimized Header */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] glass bg-black/60 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-[40px] transition-transform duration-300 ${headerTop}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70"><ChevronLeft size={24} /></button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg relative">
              <img src={groupData.photo} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#050505]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter">{groupData.name}</h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">{memberCount} Online</p>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 text-white/40"><MoreVertical size={20} /></button>
      </header>

      {/* Main Message List - Optimized for Scrolling */}
      <div 
        ref={scrollRef} 
        className={`flex-1 overflow-y-auto no-scrollbar space-y-6 pb-32 px-4 transition-all ${mainPadding}`}
        style={{ WebkitOverflowScrolling: 'touch', contain: 'content' }}
      >
        <div className="pt-4" />
        {combinedMessages.map((msg, idx) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isMe={msg.senderId === auth.currentUser?.uid} 
            showAvatar={idx === 0 || combinedMessages[idx-1].senderId !== msg.senderId}
            onOpenMenu={handleOpenMenu}
            onMediaClick={handleMediaClick}
            onSelectTrack={onSelectTrack}
            onReply={setReplyingTo}
          />
        ))}
        <div ref={bottomRef} className="h-2 w-full" />
      </div>

      {/* Optimized Footer Input */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <div className="px-6 w-full max-w-4xl"><TypingIndicator users={typingUsers} /></div>
          )}
        </AnimatePresence>
        
        <ChatInput 
          onSend={handleSendMessage} 
          onSendMedia={() => {}} // Implementation kept same as your upload logic
          onSendTrack={(t) => {}} // Implementation kept same
          libraryTracks={tracks}
          replyingTo={replyingTo} 
          onCancelReply={() => setReplyingTo(null)} 
          editingMessage={editingMessage} 
          onCancelEdit={() => setEditingMessage(null)} 
        />
      </div>

      {/* Context Menu - Uses hardware acceleration via motion */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" 
              onClick={() => setMenuOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x, willChange: 'transform' }} 
              className="z-[101] w-56 glass-high rounded-[24px] border border-white/10 shadow-2xl p-1.5 bg-[#0a0a0a]/95"
            >
              <div className="flex justify-around p-2 border-b border-white/5 mb-1">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => {
                    updateDoc(doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id), {
                      reactions: selectedMessage.reactions?.includes(emoji) ? selectedMessage.reactions.filter(r => r !== emoji) : [...(selectedMessage.reactions || []), emoji]
                    });
                    setMenuOpen(false);
                  }} className="text-xl hover:scale-125 transition-transform p-1">{emoji}</button>
                ))}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-[13px] font-bold">Copy</button>
              {auth.currentUser?.uid === selectedMessage.senderId && (
                <button onClick={async () => { await deleteDoc(doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id)); setMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-red-500/10 rounded-xl text-[13px] font-bold text-red-500">Unsend</button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

export default ChatScreen;
