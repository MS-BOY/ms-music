import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, ChevronLeft, Reply, Trash2, Copy, Edit2 } from 'lucide-react';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MS_GROUP } from '../constants';
import { Message, Track } from '../types';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import MediaViewer from '../components/MediaViewer';
import TypingIndicator from '../components/TypingIndicator';
import SwipeableMessage from '../components/SwipeableMessage';

// --- PERFORMANCE OPTIMIZATION: MEMOIZED MESSAGE ITEM ---
const ChatItem = React.memo(({ msg, prevMsg, onReply, onOpenMenu, onMediaClick, onSelectTrack }: any) => {
  const isMe = msg.senderId === auth.currentUser?.uid;
  const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full"
    >
      <SwipeableMessage isMe={isMe} onReply={() => onReply(msg)}>
        <MessageBubble
          message={msg}
          isMe={isMe}
          showAvatar={showAvatar}
          onOpenMenu={onOpenMenu}
          onMediaClick={onMediaClick}
          onSelectTrack={onSelectTrack}
        />
      </SwipeableMessage>
    </motion.div>
  );
}, (p, n) => p.msg.id === n.msg.id && p.msg.reactions?.length === n.msg.reactions?.length && p.msg.content === n.msg.content);

const ChatScreen = ({ onBack, onSettings, hasPlayer, tracks, onSelectTrack }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // UI States
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  // Media States
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // --- FIREBASE SYNC ---
  useEffect(() => {
    const q = query(collection(db, 'groups', 'group-1', 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[];
      setMessages(msgs);
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
    });
  }, []);

  // Listen for Typing
  useEffect(() => {
    return onSnapshot(collection(db, 'groups', 'group-1', 'typing'), (snap) => {
      const now = Date.now();
      setTypingUsers(snap.docs.map(d => d.data()).filter((u:any) => u.uid !== auth.currentUser?.uid && (now - u.timestamp) < 4000));
    });
  }, []);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, optimisticMessages.length]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const msgData = {
      senderId: auth.currentUser?.uid,
      senderName: auth.currentUser?.displayName || 'User',
      content: text,
      timestamp: Date.now(),
      type: 'text',
      reactions: [],
      ...(replyingTo && { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content } })
    };
    setReplyingTo(null);
    await addDoc(collection(db, 'groups', 'group-1', 'messages'), msgData);
  };

  const combinedMessages = useMemo(() => [...messages, ...optimisticMessages], [messages, optimisticMessages]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-white overflow-hidden relative">
      {/* --- REDESIGNED HEADER --- */}
      <header className={`fixed left-0 right-0 h-[70px] z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 transition-all ${hasPlayer ? 'top-[72px]' : 'top-0'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[1.5px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                <img src={MS_GROUP.photo} className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">{MS_GROUP.name}</h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Live Group Chat</p>
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 text-white/40"><MoreVertical size={20} /></button>
      </header>

      {/* --- CHAT VIEWPORT --- */}
      <div 
        ref={scrollRef} 
        className={`flex-1 overflow-y-auto no-scrollbar pt-20 pb-32 px-3 sm:px-6 space-y-1 transition-all ${hasPlayer ? 'mt-[72px]' : ''}`}
      >
        {combinedMessages.map((msg, idx) => (
          <ChatItem 
            key={msg.id} 
            msg={msg} 
            prevMsg={combinedMessages[idx-1]} 
            onReply={setReplyingTo}
            onOpenMenu={(e:any, m:any) => {
               const pos = { x: Math.min(e.clientX || e.touches[0].clientX, window.innerWidth - 220), y: Math.min(e.clientY || e.touches[0].clientY, window.innerHeight - 200) };
               setMenuPosition(pos); setSelectedMessage(m); setMenuOpen(true);
            }}
            onMediaClick={(url:any, all:any) => { setViewerItems(all); setViewerIndex(all.findIndex((i:any)=>i.url===url)); setViewerOpen(true); }}
            onSelectTrack={onSelectTrack}
          />
        ))}
      </div>

      {/* --- INPUT & TYPING --- */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <div className="h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none absolute bottom-0 w-full" />
        <div className="relative flex flex-col items-center pb-4">
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-4xl px-8 mb-2">
                <TypingIndicator users={typingUsers} />
              </motion.div>
            )}
          </AnimatePresence>
          <ChatInput 
             onSend={handleSendMessage} 
             replyingTo={replyingTo} 
             onCancelReply={() => setReplyingTo(null)} 
             libraryTracks={tracks}
          />
        </div>
      </div>

      {/* --- CONTEXT MENU --- */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ top: menuPosition.y, left: menuPosition.x }}
              className="fixed z-[101] w-52 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1"
            >
               <button onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-sm font-medium transition-colors">
                 <Reply size={16} /> Reply
               </button>
               <button onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-sm font-medium transition-colors">
                 <Copy size={16} /> Copy Text
               </button>
               {selectedMessage.senderId === auth.currentUser?.uid && (
                 <button onClick={async () => { await deleteDoc(doc(db, 'groups', 'group-1', 'messages', selectedMessage.id)); setMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 text-red-400 rounded-xl text-sm font-medium transition-colors">
                   <Trash2 size={16} /> Unsend
                 </button>
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
