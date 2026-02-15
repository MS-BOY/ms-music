import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  // --- States ---
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

  // --- Refs ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- 1. Firestore: Group Data & Member Count ---
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

  // --- 2. Firestore: Optimized Messages Listener ---
  useEffect(() => {
    const messagesRef = collection(db, 'groups', GROUP_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limitToLast(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      // Remove optimistic message if it now exists in the real messages list
      setOptimisticMessages(prev => prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp)));
    });

    return () => unsubscribe();
  }, []);

  // --- 3. Firestore: Typing Indicator Logic ---
  useEffect(() => {
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');
    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(user => user.id !== auth.currentUser?.uid && (now - user.timestamp) < 5000);
      setTypingUsers(users);
    });

    return () => unsubscribe();
  }, []);

  // --- 4. Auto-Scroll Logic (Optimized) ---
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior });
    }
  }, []);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const isMyMessage = lastMsg?.senderId === auth.currentUser?.uid;
    scrollToBottom(isMyMessage ? 'smooth' : 'auto');
  }, [messages.length, optimisticMessages.length, scrollToBottom]);

  // --- 5. Media Upload (Cloudinary) ---
  const uploadToCloudinary = async (file: File, onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_UPLOAD_URL, true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
        else reject(new Error('Upload failed'));
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  // --- 6. Send Handlers ---
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
      ...(replyingTo && { replyTo: { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content, type: replyingTo.type } })
    };

    setReplyingTo(null);
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  };

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
      const uploadedUrls = await Promise.all(files.map(file => 
        uploadToCloudinary(file, (p) => {
          setOptimisticMessages(prev => prev.map(m => m.id === tempId ? { ...m, uploadProgress: p } : m));
        })
      ));
      
      const { status, uploadProgress, id, ...dbMessage } = { ...optimisticMsg, content: uploadedUrls[0], attachments: uploadedUrls } as any;
      await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), dbMessage);
    } catch (error) {
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      alert("Failed to send media.");
    }
  };

  const handleSendTrack = async (track: Track) => {
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
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  };

  // --- 7. Menu & Reaction Handlers ---
  const handleOpenMenu = (e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    if (msg.id.startsWith('optimistic-')) return;
    e.preventDefault();
    const touch = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    const x = Math.min(touch.clientX, window.innerWidth - 230);
    const y = Math.min(touch.clientY, window.innerHeight - 320);
    
    setMenuPosition({ x, y });
    setSelectedMessage(msg);
    setMenuOpen(true);
  };

  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    const msgRef = doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id);
    const existing = selectedMessage.reactions || [];
    const newReactions = existing.includes(emoji) ? existing.filter(r => r !== emoji) : [...existing, emoji];
    setMenuOpen(false);
    await updateDoc(msgRef, { reactions: newReactions });
  };

  // --- Computed ---
  const headerStickyTop = hasPlayer ? 'top-[72px]' : 'top-0';
  const combinedMessages = useMemo(() => 
    [...messages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp),
    [messages, optimisticMessages]
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden transform-gpu">
      {/* HEADER */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 transition-all duration-300 ${headerStickyTop}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-white/10 text-white/70 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={onSettings}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg relative bg-white/5">
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

      {/* MESSAGES LIST */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-4 pt-24 pb-32"
        style={{ overflowAnchor: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
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
          <div ref={bottomRef} className="h-2 w-full" />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center pb-4">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <div className="px-6 w-full max-w-4xl flex justify-start mb-2">
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

      {/* CONTEXT MENU */}
      <AnimatePresence>
        {menuOpen && selectedMessage && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} 
              style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x }} 
              className="z-[101] w-56 bg-[#0a0a0a]/95 backdrop-blur-xl rounded-[28px] border border-white/10 shadow-2xl p-1.5"
            >
              <div className="flex justify-around p-2 border-b border-white/5 mb-1">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReaction(emoji)} className="text-xl hover:scale-125 transition-transform active:scale-90 p-1">{emoji}</button>
                ))}
              </div>
              <MenuButton label="Reply" onClick={() => { setReplyingTo(selectedMessage); setMenuOpen(false); }} />
              <MenuButton label="Copy Message" onClick={() => { navigator.clipboard.writeText(selectedMessage.content); setMenuOpen(false); }} />
              {auth.currentUser?.uid === selectedMessage.senderId && selectedMessage.type === 'text' && (
                <MenuButton label="Edit" onClick={() => { setEditingMessage(selectedMessage); setMenuOpen(false); }} />
              )}
              {auth.currentUser?.uid === selectedMessage.senderId && (
                <MenuButton label="Unsend" color="text-red-500" onClick={async () => { await deleteDoc(doc(db, 'groups', GROUP_ID, 'messages', selectedMessage.id)); setMenuOpen(false); }} />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MediaViewer isOpen={viewerOpen} items={viewerItems} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
    </div>
  );
};

// Internal Helper Component for Menu
const MenuButton = ({ label, onClick, color = "text-white/80" }: any) => (
  <button onClick={onClick} className={`w-full text-left px-4 py-3 hover:bg-white/5 rounded-2xl text-[13px] font-black uppercase tracking-tight transition-colors ${color}`}>
    {label}
  </button>
);

export default ChatScreen;
