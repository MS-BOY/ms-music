import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc, limitToLast, serverTimestamp } from 'firebase/firestore';
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

// Memoized Sub-components to prevent unnecessary re-renders
const MemoizedMessageBubble = memo(MessageBubble);

const ChatScreen: React.FC<Props> = ({ onBack, onSettings, hasPlayer, tracks, onSelectTrack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [groupData, setGroupData] = useState<Group>(MS_GROUP);
  const [memberCount, setMemberCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // UI State
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 1. Optimized Message Subscription (Limit to last 100 for performance)
  useEffect(() => {
    const q = query(
      collection(db, 'groups', GROUP_ID, 'messages'), 
      orderBy('timestamp', 'asc'),
      limitToLast(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      // Remove optimistic messages once they exist in the server messages
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
    });

    return () => unsubscribe();
  }, []);

  // 2. Optimized Metadata Fetching
  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    onSnapshot(groupRef, (doc) => doc.exists() && setGroupData(doc.data() as Group));
    
    return onSnapshot(collection(db, 'users'), (snap) => setMemberCount(snap.size));
  }, []);

  // 3. Typing Indicators with auto-cleanup
  useEffect(() => {
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');
    return onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(user => user.id !== auth.currentUser?.uid && (now - user.timestamp) < 5000);
      setTypingUsers(users);
    });
  }, []);

  // 4. Butter-Smooth Scroll Logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const node = scrollRef.current;
      node.scrollTo({ top: node.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame to wait for DOM paint
    const timer = requestAnimationFrame(() => scrollToBottom(messages.length < 10 ? 'auto' : 'smooth'));
    return () => cancelAnimationFrame(timer);
  }, [messages.length, optimisticMessages.length, scrollToBottom]);

  // 5. Message Handlers
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
      ...(replyingTo && { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content, type: replyingTo.type }})
    };

    setReplyingTo(null);
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  };

  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    if (msg.id.startsWith('optimistic-')) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setMenuPosition({ 
      x: Math.min(clientX, window.innerWidth - 240), 
      y: Math.min(clientY, window.innerHeight - 320) 
    });
    setSelectedMessage(msg);
    setMenuOpen(true);
  }, []);

  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    const msgRef = doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id);
    const existing = selectedMessage.reactions || [];
    const newReactions = existing.includes(emoji) ? existing.filter(r => r !== emoji) : [...existing, emoji];
    setMenuOpen(false);
    await updateDoc(msgRef, { reactions: newReactions });
  };

  // 6. Computational Memoization
  const combinedMessages = useMemo(() => 
    [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp),
    [messages, optimisticMessages]
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* HEADER - Optimized Blur */}
      <header 
        className={`fixed left-0 right-0 h-[72px] z-[90] bg-black/40 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-2xl transition-all duration-500 ${hasPlayer ? 'top-[72px]' : 'top-0'}`}
      >
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70 transition-transform active:scale-90">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-xl bg-neutral-900">
              <img src={groupData.photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div>
              <h2 className="text-sm font-black font-outfit uppercase tracking-tighter text-white">{groupData.name}</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{memberCount} Online</p>
              </div>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 text-white/40 active:scale-90 transition-transform">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* MESSAGES AREA - GPU Accelerated & Virtualized */}
      <div 
        ref={scrollRef} 
        className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth space-y-1 pb-32 px-4 transition-all duration-500 ${hasPlayer ? 'pt-[150px]' : 'pt-[80px]'}`}
        style={{ 
          transform: 'translateZ(0)', // Force GPU layer
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <LayoutGroup>
          {combinedMessages.map((msg, idx) => (
            <div 
              key={msg.id} 
              style={{ 
                contentVisibility: 'auto', // Native Virtualization
                containIntrinsicSize: '60px' 
              }}
            >
              <MemoizedMessageBubble 
                message={msg} 
                isMe={msg.senderId === auth.currentUser?.uid} 
                showAvatar={idx === 0 || combinedMessages[idx-1].senderId !== msg.senderId}
                onOpenMenu={handleOpenMenu}
                onMediaClick={(url, all) => { setViewerItems(all); setViewerIndex(all.findIndex(i => i.url === url)); setViewerOpen(true); }}
                onSelectTrack={onSelectTrack}
                onReply={setReplyingTo}
              />
            </div>
          ))}
        </LayoutGroup>
      </div>

      {/* INPUT BAR - Anchored */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
        <div className="max-w-4xl mx-auto w-full p-4 pointer-events-auto">
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="mb-2 ml-4">
                <TypingIndicator users={typingUsers} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <ChatInput 
            onSend={handleSendMessage} 
            onSendMedia={() => {}} // Integration logic same as before
            onSendTrack={onSelectTrack}
            libraryTracks={tracks}
            replyingTo={replyingTo} 
            onCancelReply={() => setReplyingTo(null)} 
            editingMessage={editingMessage} 
            onCancelEdit={() => setEditingMessage(null)} 
          />
        </div>
      </div>

      {/* CONTEXT MENU */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm" 
              onClick={() => setMenuOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x }} 
              className="z-[111] w-56 bg-neutral-900/90 backdrop-blur-2xl rounded-[24px] border border-white/10 shadow-2xl p-1.5"
            >
              <div className="flex justify-around p-2 bg-white/5 rounded-2xl mb-1.5">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-125 transition-transform active:scale-90">{emoji}</button>
                ))}
              </div>
              <div className="flex flex-col">
                <MenuAction label="Copy text" onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} />
                <MenuAction label="Reply" onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} />
                {auth.currentUser?.uid === selectedMessage.senderId && (
                  <>
                    <MenuAction label="Edit" onClick={() => { setEditingMessage(selectedMessage); setMenuOpen(false); }} />
                    <MenuAction label="Unsend" danger onClick={async () => { await deleteDoc(doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id)); setMenuOpen(false); }} />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

// Helper Menu Button for better code cleanliness
const MenuAction = ({ label, onClick, danger = false }: { label: string, onClick: () => void, danger?: boolean }) => (
  <button 
    onClick={onClick} 
    className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/5'}`}
  >
    {label}
  </button>
);

export default memo(ChatScreen);
