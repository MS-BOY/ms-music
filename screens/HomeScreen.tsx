import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Play, TrendingUp, Sparkles, LayoutGrid, Clock, ChevronRight, Heart, MoreVertical } from 'lucide-react';
import { Track, User } from '../types';

interface Props {
  tracks: Track[];
  user: User | null;
  onSelectTrack: (track: Track) => void;
  onNavigateProfile: () => void;
}

// Ultra-optimized Animation Constants
const SPRING_UI = { type: "spring", stiffness: 400, damping: 30, mass: 0.8 };
const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const ITEM_ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: SPRING_UI }
};

const HomeScreen: React.FC<Props> = ({ tracks, user, onSelectTrack, onNavigateProfile }) => {
  const sections = useMemo(() => ({
    hero: tracks[0],
    trending: tracks.slice(1, 7),
    recent: tracks.slice(7, 13),
  }), [tracks]);

  return (
    <div className="h-full w-full bg-[#050505] text-white overflow-y-auto no-scrollbar scroll-smooth transform-gpu">
      
      {/* 1. HIGH-END NAV HEADER */}
      <header className="sticky top-0 z-[100] h-18 px-6 flex items-center justify-between bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-black text-lg italic">M</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tighter uppercase leading-none">MS MUSIC</h1>
            <span className="text-[9px] text-blue-500 font-bold tracking-[0.2em] uppercase">Vibe Engine</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
            <Search size={18} className="text-white/50" />
          </button>
          <div onClick={onNavigateProfile} className="w-10 h-10 rounded-xl border-2 border-white/5 p-0.5 active:rotate-3 active:scale-90 transition-all">
            <img src={user?.avatar || "https://picsum.photos/100"} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" />
          </div>
        </div>
      </header>

      <motion.main 
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="pb-36 pt-6"
      >
        {/* 2. HERO SPOTLIGHT */}
        <motion.section variants={ITEM_ANIM} className="px-6 mb-10" style={{ contain: 'layout' }}>
          {sections.hero && (
            <div 
              onClick={() => onSelectTrack(sections.hero)}
              className="relative aspect-[16/9] w-full rounded-[32px] overflow-hidden bg-zinc-900 border border-white/10 group shadow-2xl active:scale-[0.98] transition-all duration-500"
            >
              <img src={sections.hero.albumArt} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-[3s] group-hover:scale-110" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Global Drop</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-2">{sections.hero.title}</h2>
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-6">{sections.hero.artist}</p>
                <div className="flex items-center gap-3">
                  <button className="h-12 px-8 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-colors">
                    <Play size={16} fill="currentColor" /> Play
                  </button>
                  <button className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                    <Heart size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* 3. TRENDING ROW - High-Performance Snap Scroll */}
        <motion.section variants={ITEM_ANIM} className="mb-10" style={{ contain: 'content' }}>
          <div className="px-6 mb-5 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tighter flex items-center gap-2 uppercase">
              <TrendingUp size={18} className="text-blue-500" /> Trending
            </h3>
            <button className="text-[10px] font-black uppercase text-white/30 tracking-widest">See All</button>
          </div>
          
          <div className="flex gap-5 overflow-x-auto px-6 pb-4 no-scrollbar snap-x touch-pan-x">
            {sections.trending.map((track) => (
              <div 
                key={track.id} 
                onClick={() => onSelectTrack(track)}
                className="snap-start shrink-0 w-40 group active:scale-95 transition-transform"
              >
                <div className="relative aspect-square rounded-3xl bg-zinc-900 border border-white/5 overflow-hidden mb-3 shadow-xl transform-gpu">
                  <img src={track.albumArt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" loading="lazy" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute bottom-2 right-2 w-8 h-8 rounded-xl bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all">
                    <Play size={14} fill="white" />
                  </div>
                </div>
                <p className="text-xs font-bold truncate px-1 tracking-tight">{track.title}</p>
                <p className="text-[10px] text-white/30 truncate px-1 uppercase font-black tracking-tighter">{track.artist}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 4. DISCOVER TILES */}
        <motion.section variants={ITEM_ANIM} className="px-6 mb-12">
          <div className="grid grid-cols-2 gap-4">
            <DiscoveryCard title="Top Charts" color="from-blue-600/40" icon={<TrendingUp size={20}/>} />
            <DiscoveryCard title="New Drops" color="from-emerald-600/40" icon={<Sparkles size={20}/>} />
          </div>
        </motion.section>

        {/* 5. RECENTLY PLAYED - Dense List Layout */}
        <motion.section variants={ITEM_ANIM} className="px-6" style={{ contain: 'content' }}>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-2">
            <Clock size={14} /> Recently Played
          </h3>
          <div className="space-y-2">
            {sections.recent.map((track) => (
              <TrackRowItem key={track.id} track={track} onClick={() => onSelectTrack(track)} />
            ))}
          </div>
        </motion.section>

      </motion.main>
    </div>
  );
};

/* --- HIGH-PERFORMANCE SUB-COMPONENTS --- */

const DiscoveryCard = memo(({ title, color, icon }: any) => (
  <div className={`relative h-28 rounded-[24px] p-5 overflow-hidden bg-white/[0.03] border border-white/[0.05] active:scale-95 transition-transform transform-gpu`}>
    <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-gradient-to-br ${color} to-transparent blur-2xl opacity-50`} />
    <div className="relative h-full flex flex-col justify-between items-start">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.15em]">{title}</span>
    </div>
  </div>
));

const TrackRowItem = memo(({ track, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-white/[0.03] active:bg-white/[0.06] transition-all group border border-transparent active:border-white/5"
  >
    <div className="w-13 h-13 rounded-xl bg-zinc-900 overflow-hidden shrink-0 border border-white/10 shadow-md">
      <img src={track.albumArt} className="w-full h-full object-cover" alt="" loading="lazy" />
    </div>
    <div className="flex-1 text-left min-w-0">
      <p className="text-[13px] font-bold text-white/90 truncate mb-0.5 group-active:text-blue-400 transition-colors">{track.title}</p>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black px-1.5 py-0.5 bg-white/5 text-white/30 rounded uppercase tracking-tighter">HD</span>
        <p className="text-[10px] text-white/30 truncate uppercase font-bold tracking-tight">{track.artist}</p>
      </div>
    </div>
    <div className="flex items-center gap-1 pr-1">
      <button className="p-2 text-white/10 hover:text-white transition-colors">
        <Heart size={16} />
      </button>
      <button className="p-2 text-white/10">
        <MoreVertical size={16} />
      </button>
    </div>
  </button>
));

export default memo(HomeScreen);
