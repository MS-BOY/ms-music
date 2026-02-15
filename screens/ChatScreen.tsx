import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc, limitToLast } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Group, Track } from '../types';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import MediaViewer from '../components/MediaViewer';
import TypingIndicator from '../components/TypingIndicator';

// --- Sub-components for performance ---

const MemoizedMessageBubble = memo(MessageBubble);

const ChatScreen: React.FC<Props> = ({ onBack, onSettings, hasPlayer, tracks, onSelectTrack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [groupData, setGroupData] = useState<Group>(MS_GROUP);
  const [memberCount, setMemberCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  // UI States
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 1. Optimized Data Fetching (Limit initial load for speed)
  useEffect(() => {
    const messagesRef = collection(db, 'groups', GROUP_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      // Batch state updates
      setMessages(msgs);
      setOptimisticMessages(prev => 
        prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp))
      );
    });

    return () => unsubscribe();
  }, []);

  // 2. Typing Indicator - Throttled
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

  // 3. High-Performance Scroll Logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  }, []);

  useEffect(() => {
    // Immediate scroll on first load, smooth for new messages
    const behavior = messages.length < 15 ? 'auto' : 'smooth';
    
    // Use requestAnimationFrame to ensure the DOM has updated
    requestAnimationFrame(() => scrollToBottom(behavior));
  }, [messages.length, optimisticMessages.length, scrollToBottom]);

  // 4. Handlers with useCallback to prevent child re-renders
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

  const handleMediaClick = useCallback((url: string, all: any[]) => {
    setViewerItems(all);
    setViewerIndex(all.findIndex(i => i.url === url));
    setViewerOpen(true);
  }, []);

  // 5. Memoized Message List Construction
  const combinedMessages = useMemo(() => 
    [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp),
    [messages, optimisticMessages]
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden">
      {/* HEADER - Glassmorphism optimized */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] bg-black/40 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-2xl transition-all duration-300 ${hasPlayer ? 'top-[72px]' : 'top-0'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70 active:scale-90 transition-transform">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 relative bg-neutral-900">
              <img src={groupData.photo} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div>
              <h2 className="text-sm font-black font-outfit uppercase tracking-tighter text-white">{groupData.name}</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">{memberCount} Active</p>
              </div>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 text-white/40 active:scale-90 transition-transform">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* MESSAGES AREA - GPU Accelerated Scrolling */}
      <div 
        ref={scrollRef} 
        className={`flex-1 overflow-y-auto no-scrollbar space-y-1 pb-32 px-4 will-change-transform ${hasPlayer ? 'pt-[150px]' : 'pt-[80px]'}`}
        style={{ 
          transform: 'translateZ(0)', 
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        <LayoutGroup>
          {combinedMessages.map((msg, idx) => (
            <div 
              key={msg.id} 
              style={{ 
                contentVisibility: 'auto', 
                containIntrinsicSize: '0 60px' 
              }}
            >
              <MemoizedMessageBubble 
                message={msg} 
                isMe={msg.senderId === auth.currentUser?.uid} 
                showAvatar={idx === 0 || combinedMessages[idx-1].senderId !== msg.senderId}
                onOpenMenu={handleOpenMenu}
                onMediaClick={handleMediaClick}
                onSelectTrack={onSelectTrack}
                onReply={setReplyingTo}
              />
            </div>
          ))}
        </LayoutGroup>
      </div>

      {/* INPUT AREA - Elevated with Blur */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                className="ml-4 mb-2"
              >
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

      {/* CONTEXT MENU - Optimized Animation */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-[2px]" 
              onClick={() => setMenuOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x }} 
              className="z-[111] w-56 bg-neutral-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-1.5 overflow-hidden"
            >
              <div className="grid grid-cols-6 gap-1 p-2 mb-1 bg-white/5 rounded-2xl">
                {REACTIONS.map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => handleReaction(emoji)} 
                    className="text-lg hover:bg-white/10 rounded-lg transition-colors p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="space-y-0.5">
                <MenuButton label="Reply" onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} />
                <MenuButton label="Copy" onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} />
                {auth.currentUser?.uid === selectedMessage.senderId && (
                  <>
                    <MenuButton label="Edit" onClick={() => { setEditingMessage(selectedMessage); setMenuOpen(false); }} />
                    <MenuButton label="Unsend" danger onClick={() => { /* delete logic */ }} />
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

// Small helper for Menu
const MenuButton = ({ label, onClick, danger = false }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full text-left px-4 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-colors ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-white/80 hover:bg-white/5'}`}
  >
    {label}
  </button>
);

export default memo(ChatScreen);
