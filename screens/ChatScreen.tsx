import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, ChevronLeft } from 'lucide-react';
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
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

const ChatScreen: React.FC<Props> = ({
  onBack,
  onSettings,
  hasPlayer,
  tracks,
  onSelectTrack
}) => {

  /* ================= STATE ================= */

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
  const [viewerItems, setViewerItems] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  /* ================= GROUP SUB ================= */

  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);

    getDoc(groupRef).then((snap) => {
      if (!snap.exists()) setDoc(groupRef, MS_GROUP);
    });

    const unsubscribe = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        setGroupData(docSnap.data() as Group);
      }
    });

    return () => unsubscribe();
  }, []);

  /* ================= TYPING SUB ================= */

  useEffect(() => {
    const typingRef = collection(db, 'groups', GROUP_ID, 'typing');

    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const now = Date.now();

      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(user =>
          user.id !== auth.currentUser?.uid &&
          (now - user.timestamp) < 5000
        );

      setTypingUsers(users);
    });

    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev =>
        prev.filter(user => (now - user.timestamp) < 5000)
      );
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  /* ================= MEMBER COUNT ================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setMemberCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  /* ================= MESSAGE SUB ================= */

  useEffect(() => {
    const messagesRef = collection(db, 'groups', GROUP_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      setMessages(msgs);

      setOptimisticMessages(prev =>
        prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp))
      );
    });

    return () => unsubscribe();
  }, []);

  /* ================= SMART AUTO SCROLL ================= */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, optimisticMessages.length]);

  /* ================= MEMOIZED MERGE ================= */

  const combinedMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return messages;

    return [...messages, ...optimisticMessages]
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, optimisticMessages]);

  const headerStickyTop = hasPlayer ? 'top-[72px]' : 'top-0';
  const mainContentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  /* ================= UI ================= */

  return (
    <div
      className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden"
      style={{ transform: 'translateZ(0)' }}
    >

      {/* HEADER */}
      <header
        className={`fixed left-0 right-0 h-[72px] z-[90] bg-black/70 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-md ${headerStickyTop}`}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70 active:scale-90 transition-transform"
          >
            <ChevronLeft size={24} />
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onSettings}
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-neutral-900">
              <img
                src={groupData.photo}
                alt={groupData.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">
                {groupData.name}
              </h2>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">
                {memberCount} Members Online
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onSettings}
          className="p-2 rounded-full hover:bg-white/10 text-white/40 active:scale-90 transition-transform"
        >
          <MoreVertical size={20} />
        </button>
      </header>

      {/* MESSAGE AREA */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto no-scrollbar space-y-6 pb-28 px-4 ${mainContentPadding}`}
        style={{
          overflowAnchor: 'none',
          WebkitOverflowScrolling: 'touch',
          transform: 'translateZ(0)'
        }}
      >
        <div className="pt-4" />

        {combinedMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === auth.currentUser?.uid}
            showAvatar={
              idx === 0 ||
              combinedMessages[idx - 1].senderId !== msg.senderId
            }
          />
        ))}
      </div>

      {/* INPUT AREA */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col items-center pb-2"
        style={{ transform: 'translateZ(0)' }}
      >
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="px-6 w-full max-w-4xl flex justify-start mb-1"
            >
              <TypingIndicator users={typingUsers} />
            </motion.div>
          )}
        </AnimatePresence>

        <ChatInput
          onSend={async () => {}}
          onSendMedia={async () => {}}
          onSendTrack={async () => {}}
          libraryTracks={tracks}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      <MediaViewer
        isOpen={viewerOpen}
        items={viewerItems}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};

export default ChatScreen;
