import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Play, ListMusic, TrendingUp, Sparkles } from 'lucide-react';
import MusicCard from '../components/MusicCard';
import { Track, User } from '../types';

interface Props {
  tracks: Track[];
  user: User | null;
  onSelectTrack: (track: Track) => void;
  onNavigateProfile: () => void;
  onSeeAll: () => void;
  hasPlayer?: boolean;
}

// Optimization: Snappy spring transitions for "fast" feel
const springConfig = { type: "spring", stiffness: 300, damping: 30 };

const HomeScreen: React.FC<Props> = ({ tracks, user, onSelectTrack, onNavigateProfile, onSeeAll, hasPlayer }) => {
  const latestTrack = tracks.length > 0 ? tracks[0] : null;

  // Use simple pixel offsets for padding to avoid layout thrashing
  const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
  const contentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050505] text-white">
      {/* FIXED HEADER - Optimized Blur */}
      <header 
        className={`fixed left-0 right-0 z-[100] h-[72px] px-6 flex items-center justify-between bg-black/60 backdrop-blur-lg border-b border-white/5 transition-all duration-300 ${headerStickyPos}`}
        style={{ transform: 'translateZ(0)' }} // Force GPU layer
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="font-outfit font-black text-lg">M</span>
          </div>
          <h1 className="text-lg font-black font-outfit tracking-tighter uppercase">MS MUSIC</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Search size={20} className="text-white/70" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
            <Bell size={20} className="text-white/70" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-black" />
          </button>
          <div 
            onClick={onNavigateProfile}
            className="w-9 h-9 rounded-full border border-white/20 overflow-hidden cursor-pointer ml-1 active:scale-90 transition-transform"
          >
            <img src={user?.avatar || "https://picsum.photos/200"} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* SCROLLABLE AREA - Clean scrolling, no transitions on container */}
      <main className={`h-full overflow-y-auto overflow-x-hidden no-scrollbar ${contentPadding} scroll-smooth transform-gpu`}>
        
        {/* HERO - Optimized for no-stutter */}
        <section className="px-6 pt-4">
          <AnimatePresence mode="wait">
            {latestTrack && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springConfig}
                onClick={() => onSelectTrack(latestTrack)}
                className="relative aspect-[16/8] sm:aspect-[21/7] w-full max-w-5xl mx-auto rounded-[32px] overflow-hidden group cursor-pointer bg-neutral-900 shadow-2xl"
              >
                <img 
                  src={latestTrack.albumArt} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">Featured</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black mb-1 tracking-tighter">{latestTrack.title}</h2>
                  <p className="text-white/50 font-bold text-lg mb-6">{latestTrack.artist}</p>
                  
                  <button className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-colors active:scale-95 w-fit">
                    <Play size={16} fill="currentColor" /> Play Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SEARCH - Fast input response */}
        <div className="px-6 mt-10 max-w-5xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search tracks, artists..."
              className="w-full h-14 bg-white/5 rounded-2xl pl-14 pr-6 border border-white/5 outline-none focus:bg-white/10 focus:border-white/10 transition-all text-sm"
            />
          </div>
        </div>

        {/* TRENDING - Smooth horizontal scroll */}
        <section className="mt-12">
          <div className="px-6 mb-6 flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              <h3 className="text-xl font-black uppercase tracking-tighter">Trending</h3>
            </div>
            <button onClick={onSeeAll} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">View All</button>
          </div>
          
          <div className="flex gap-5 overflow-x-auto px-6 pb-4 no-scrollbar snap-x touch-pan-x">
            {tracks.map((track, idx) => (
              <div key={track.id} className="snap-start shrink-0">
                <MusicCard 
                  track={track} 
                  index={idx} 
                  onClick={() => onSelectTrack(track)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* DISCOVER - Quick tap response */}
        <section className="mt-8 px-6 mb-32 max-w-5xl mx-auto">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Discover</h3>
          <div className="grid grid-cols-2 gap-4">
            <DiscoverCard title="TOP CHARTS" color="from-blue-600/20" icon={<Play size={20} />} onClick={onSeeAll} />
            <DiscoverCard title="NEW DROPS" color="from-purple-600/20" icon={<Sparkles size={20} />} onClick={onSeeAll} />
          </div>
        </section>
      </main>
    </div>
  );
};

// Memoized Discover Card for zero re-render lag
const DiscoverCard = memo(({ title, color, icon, onClick }: { title: string, color: string, icon: any, onClick: () => void }) => (
  <motion.div
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className={`relative h-32 rounded-3xl p-5 overflow-hidden cursor-pointer border border-white/5 bg-white/[0.03] group`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} to-transparent opacity-50 group-hover:opacity-80 transition-opacity`} />
    <div className="relative z-10 h-full flex flex-col justify-between">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
        {icon}
      </div>
      <h4 className="font-black text-sm tracking-tighter uppercase">{title}</h4>
    </div>
  </motion.div>
));

export default HomeScreen;
