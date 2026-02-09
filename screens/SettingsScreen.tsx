import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Camera, Edit3, Shield, Users, LogOut, Bell, Link, Check, X, Loader2 } from 'lucide-react';
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Group, User } from '../types';
import { MS_GROUP } from '../constants';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  hasPlayer?: boolean;
}

const GROUP_ID = 'group-1';
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dw3oixfbg/image/upload";
const CLOUDINARY_PRESET = "profile";

const SettingsScreen: React.FC<Props> = ({ onBack, onLogout, hasPlayer }) => {
  const [group, setGroup] = useState<Group>(MS_GROUP);
  const [members, setMembers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // UI States
  const [showMembers, setShowMembers] = useState(false);
  
  // Edit States
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Group Info with Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'groups', GROUP_ID), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Group;
        setGroup(prev => ({ ...prev, ...data }));
        setName(data.name);
        setDesc(data.description);
      }
    });
    return () => unsub();
  }, []);

  // Sync Members from Users collection (Real-time member list)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.username || 'Anonymous',
          avatar: data.photoURL || 'https://picsum.photos/200',
          bio: data.bio || ''
        } as User;
      });
      setMembers(fetchedMembers);
    });
    return () => unsub();
  }, []);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    
    const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const url = await uploadToCloudinary(file);
        await updateDoc(doc(db, 'groups', GROUP_ID), { photo: url });
      } catch (error) {
        console.error("Failed to upload group photo", error);
        alert("Failed to upload photo");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'groups', GROUP_ID), {
        name: name,
        description: desc
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  // Zero margin docking logic
  const headerStickyTop = hasPlayer ? 'top-[72px]' : 'top-0';
  const mainContentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] overflow-y-auto no-scrollbar relative">
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

      {/* Fixed Header positioned relative to Anchor Card at top-[72px] */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] glass bg-black/60 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-[40px] transition-all duration-500 ${headerStickyTop}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-black font-outfit uppercase tracking-tighter">Group Info</h1>
        </div>
        
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2 glass rounded-xl hover:bg-white/10 text-blue-400 transition-colors"
          >
            <Edit3 size={20} />
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => { setIsEditing(false); setName(group.name); setDesc(group.description); }}
              className="p-2 glass rounded-xl hover:bg-red-500/20 text-red-400"
              disabled={loading}
            >
              <X size={20} />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 glass rounded-xl hover:bg-emerald-500/20 text-emerald-400"
              disabled={loading}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            </button>
          </div>
        )}
      </header>

      {/* Main Content with dynamic padding */}
      <main className={`relative z-10 px-6 pb-32 transition-all duration-500 ${mainContentPadding}`}>
        {/* Group Photo */}
        <div className="flex flex-col items-center mt-6">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
            <div className="w-40 h-40 rounded-[48px] overflow-hidden border-4 border-white/5 shadow-2xl relative">
              <img src={group.photo} alt={group.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className={`absolute inset-0 bg-black/40 ${loading ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity flex items-center justify-center`}>
                {loading ? <Loader2 size={32} className="text-white animate-spin" /> : <Camera size={32} className="text-white/80" />}
              </div>
            </div>
            <button className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center border-4 border-[#050505] shadow-lg hover:scale-110 transition-transform">
               <Edit3 size={20} className="text-white" />
            </button>
          </div>
          
          {isEditing ? (
            <div className="mt-8 w-full space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Group Name</label>
                <div className="glass rounded-2xl border border-white/5 p-1">
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 bg-transparent px-4 text-center font-black font-outfit text-xl outline-none"
                    placeholder="Group Name"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Description</label>
                <div className="glass rounded-2xl border border-white/5 p-4">
                  <textarea 
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full h-24 bg-transparent text-center text-sm text-white/60 outline-none resize-none"
                    placeholder="Description"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-8 text-3xl font-black font-outfit text-center px-4 uppercase tracking-tighter">{group.name}</h2>
              <p className="mt-2 text-white/40 text-sm text-center max-w-xs px-4 leading-relaxed font-medium">{group.description}</p>
            </>
          )}
        </div>

        {/* Settings Grid */}
        <div className="mt-12 space-y-4">
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] ml-2">Configuration</h3>
          
          <SettingsItem icon={<Bell size={20} className="text-blue-400" />} label="Notifications" value="On" />
          <SettingsItem icon={<Link size={20} className="text-purple-400" />} label="Invite Link" value="ms.music/global" />
          <SettingsItem 
            icon={<Users size={20} className="text-cyan-400" />} 
            label="Members" 
            value={members.length.toString()} 
            onClick={() => setShowMembers(true)}
          />
          <SettingsItem icon={<Shield size={20} className="text-emerald-400" />} label="Admins" value="1 Admin" />
          
          <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] ml-2 mt-10">Advanced</h3>
          <div className="glass rounded-[32px] overflow-hidden border border-white/5">
             <button 
              onClick={onLogout}
              className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
             >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <LogOut size={20} className="text-red-500" />
                  </div>
                  <span className="font-black text-red-500 uppercase tracking-tight">Leave Group</span>
                </div>
             </button>
          </div>
        </div>
      </main>

      {/* Members Modal */}
      <AnimatePresence>
        {showMembers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
              onClick={() => setShowMembers(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-x-4 top-[15%] bottom-[15%] z-[101] glass-high rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden max-w-md mx-auto"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-black font-outfit uppercase">Members ({members.length})</h2>
                <button onClick={() => setShowMembers(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} className="text-white/70" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {members.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10">
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-sm text-white uppercase tracking-tight">{member.name}</h4>
                      {group.admins?.includes(member.id) && (
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Admin</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsItem: React.FC<{ icon: React.ReactNode, label: string, value: string, onClick?: () => void }> = ({ icon, label, value, onClick }) => (
  <motion.div 
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={`glass p-5 rounded-[32px] flex items-center justify-between border border-white/5 hover:bg-white/10 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <span className="font-black uppercase tracking-tight">{label}</span>
    </div>
    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{value}</span>
  </motion.div>
);

export default SettingsScreen;