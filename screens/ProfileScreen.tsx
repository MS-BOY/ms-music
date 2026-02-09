
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Grid, List, Heart, Clock, LogOut } from 'lucide-react';
import { User } from '../types';

interface Props {
  user: User | null;
  onBack: () => void;
  onLogout: () => void;
  hasPlayer?: boolean;
}

const ProfileScreen: React.FC<Props> = ({ user, onBack, onLogout, hasPlayer }) => {
  if (!user) return null;

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] overflow-y-auto">
      {/* Dynamic Background Blur */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-900/40 to-transparent pointer-events-none" />

      {/* Header */}
      <header className={`relative z-10 px-6 ${hasPlayer ? 'pt-4' : 'pt-12'} flex items-center justify-between transition-all duration-300`}>
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={28} />
        </button>
        <button 
          onClick={onLogout}
          className="p-2 glass rounded-full hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-400"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Profile Header */}
      <div className="relative z-10 flex flex-col items-center px-6 mt-8">
        
        <motion.div 
          initial={{ scale: 0.8, rotateY: 30 }}
          animate={{ scale: 1, rotateY: 0 }}
          className="relative group"
        >
          <div className="absolute inset-0 blur-2xl bg-blue-500/30 rounded-full scale-90" />
          <div className="relative w-36 h-36 rounded-[48px] border-4 border-white/10 overflow-hidden shadow-2xl bg-black/20">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
        </motion.div>
        
        <h2 className="mt-8 text-3xl font-extrabold font-outfit">{user.name}</h2>
        <p className="mt-1 text-blue-400 font-bold uppercase text-[10px] tracking-[0.3em]">Premium Listener</p>
        
        <p className="mt-4 text-white/50 text-center max-w-xs text-sm leading-relaxed">
          {user.bio}
        </p>

        {/* Stats */}
        <div className="flex gap-8 mt-10">
          <Stat value="0" label="Playlists" />
          <div className="w-px h-10 bg-white/10" />
          <Stat value="0" label="Followers" />
          <div className="w-px h-10 bg-white/10" />
          <Stat value="0" label="Following" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-12">
        <div className="glass p-2 rounded-2xl flex items-center justify-between">
          <TabButton icon={<Grid size={20} />} active />
          <TabButton icon={<Heart size={20} />} />
          <TabButton icon={<Clock size={20} />} />
          <TabButton icon={<List size={20} />} />
        </div>
      </div>

      {/* Content Grid */}
      <div className="px-6 mt-6 pb-12 text-center text-white/20 text-xs font-bold uppercase tracking-widest pt-10">
        No activities yet
      </div>
    </div>
  );
};

const Stat: React.FC<{ value: string, label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="text-xl font-bold font-outfit">{value}</span>
    <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{label}</span>
  </div>
);

const TabButton: React.FC<{ icon: React.ReactNode, active?: boolean }> = ({ icon, active }) => (
  <button className={`flex-1 h-12 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:bg-white/5'}`}>
    {icon}
  </button>
);

export default ProfileScreen;
