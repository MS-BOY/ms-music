import React, { useState, useEffect, useRef } from 'react';
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

  /* ---------------- GROUP INIT ---------------- */

  useEffect(() => {
    const groupRef = doc(db, 'groups', GROUP_ID);
    getDoc(groupRef).then((snap) => {
      if (!snap.exists()) setDoc(groupRef, MS_GROUP);
    });

    return onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) setGroupData(docSnap.data() as Group);
    });
  }, []);

  /* ---------------- TYPING ---------------- */

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

    return () => unsubscribe();
  }, []);

  /* ---------------- USERS COUNT ---------------- */

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      setMemberCount(snapshot.size);
    });
  }, []);

  /* ---------------- MESSAGES ---------------- */

  useEffect(() => {
    const messagesRef = collection(db, 'groups', GROUP_ID, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];

      setMessages(msgs);

      // remove optimistic if real message arrived
      setOptimisticMessages(prev =>
        prev.filter(om => !msgs.some(m => m.timestamp === om.timestamp))
      );
    });
  }, []);

  /* ---------------- AUTO SCROLL ---------------- */

  useEffect(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
    });
  }, [messages, optimisticMessages]);

  /* ---------------- CLOUDINARY UPLOAD ---------------- */

  const uploadToCloudinary = (file: File, onProgress: (p: number) => void): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_UPLOAD_URL);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          resolve(res.secure_url);
        } else reject(new Error('Upload failed'));
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  /* ---------------- SEND TEXT ---------------- */

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !auth.currentUser) return;

    if (editingMessage) {
      await updateDoc(
        doc(db, 'groups', GROUP_ID, 'messages', editingMessage.id),
        { content: text, isEdited: true }
      );
      setEditingMessage(null);
      return;
    }

    const newMessage: Omit<Message, 'id'> = {
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || '',
      content: text,
      timestamp: Date.now(),
      type: 'text',
      reactions: [],
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type,
          attachments: replyingTo.attachments || []
        }
      })
    };

    setReplyingTo(null);
    await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), newMessage);
  };

  /* ---------------- SEND MEDIA ---------------- */

  const handleSendMedia = async (files: File[], type: 'image' | 'video' | 'audio') => {
    if (!auth.currentUser || files.length === 0) return;

    const timestamp = Date.now();
    const tempId = `optimistic-${timestamp}`;
    const previews = files.map(f => URL.createObjectURL(f));

    const optimistic: Message = {
      id: tempId,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || '',
      content: previews[0],
      attachments: previews,
      timestamp,
      type: files.length > 1 ? 'image-grid' : type,
      reactions: [],
      status: 'sending',
      uploadProgress: 0,
      ...(replyingTo && {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type,
          attachments: replyingTo.attachments || []
        }
      })
    };

    setOptimisticMessages(prev => [...prev, optimistic]);
    setReplyingTo(null);

    try {
      const uploaded = await Promise.all(
        files.map(file =>
          uploadToCloudinary(file, (p) => {
            setOptimisticMessages(prev =>
              prev.map(m => m.id === tempId ? { ...m, uploadProgress: p } : m)
            );
          })
        )
      );

      const { id, status, uploadProgress, ...dbMessage } = {
        ...optimistic,
        content: uploaded[0],
        attachments: uploaded
      };

      await addDoc(collection(db, 'groups', GROUP_ID, 'messages'), dbMessage);

    } catch (err) {
      console.error(err);
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      alert('Upload failed');
    }
  };

  /* ---------------- COMBINED ---------------- */

  const combinedMessages = [...messages, ...optimisticMessages]
    .sort((a, b) => a.timestamp - b.timestamp);

  const headerStickyTop = hasPlayer ? 'top-[72px]' : 'top-0';
  const mainContentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden">

      {/* HEADER */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] bg-black/60 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-[40px] ${headerStickyTop}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/70">
            <ChevronLeft size={24} />
          </button>
          <div onClick={onSettings}>
            <h2 className="text-sm font-black uppercase">{groupData.name}</h2>
            <p className="text-[9px] text-blue-400 uppercase">{memberCount} Members</p>
          </div>
        </div>
        <button onClick={onSettings} className="p-2 rounded-full hover:bg-white/10 text-white/40">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto space-y-1 pb-24 px-4 ${mainContentPadding}`}
      >
        <div className="pt-4" />
        {combinedMessages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === auth.currentUser?.uid}
            showAvatar={
              idx === 0 ||
              combinedMessages[idx - 1]?.senderId !== msg.senderId
            }
            onSelectTrack={onSelectTrack}
            onReply={setReplyingTo}
          />
        ))}
      </div>

      {/* INPUT */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent">
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
        </AnimatePresence>

        <ChatInput
          onSend={handleSendMessage}
          onSendMedia={handleSendMedia}
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
