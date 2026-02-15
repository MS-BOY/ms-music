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

// Snappy spring config for fast feel
const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const HomeScreen: React.FC<Props> = ({ tracks, user, onSelectTrack, onNavigateProfile, onSeeAll, hasPlayer }) => {
  const latestTrack = tracks.length > 0 ? tracks[0] : null;

  // Layout calculations
  const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
  const contentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050505] text-white">
      
      {/* 1. FIXED HEADER - Optimized with GPU layer */}
      <header 
        className={`fixed left-0 right-0 z-[100] h-[72px] px-6 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-white/5 transition-all duration-300 ${headerStickyPos}`}
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      >
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-outfit font-black text-lg">M</span>
          </div>
          <h1 className="text-lg font-black font-outfit tracking-tighter uppercase">MS MUSIC</h1>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors active:scale-90">
            <Search size={18} className="text-white/70" />
          </button>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors relative active:scale-90">
            <Bell size={18} className="text-white/70" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-2 ring-black" />
          </button>
          <div 
            onClick={onNavigateProfile}
            className="w-9 h-9 rounded-xl border border-white/10 overflow-hidden cursor-pointer ml-1 active:scale-90 transition-all bg-white/5"
          >
            <img src={user?.avatar || "https://picsum.photos/200"} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* 2. MAIN SCROLL AREA - Ultra Smooth Vertical Scroll */}
      <main 
        className={`h-full overflow-y-auto overflow-x-hidden no-scrollbar ${contentPadding} scroll-smooth`}
        style={{ 
          touchAction: 'pan-y', // Enables fast vertical swipe
          WebkitOverflowScrolling: 'touch', // iOS Momentum Scroll
          overscrollBehaviorY: 'contain' 
        }}
      >
        
        {/* HERO SECTION - Touch Optimized */}
        <section className="px-6 pt-4">
          <AnimatePresence mode="wait">
            {latestTrack ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springTransition}
                onClick={() => onSelectTrack(latestTrack)}
                className="relative aspect-[16/9] sm:aspect-[21/7] w-full max-w-5xl mx-auto rounded-[32px] overflow-hidden group cursor-pointer bg-neutral-900 shadow-2xl will-change-transform"
              >
                {/* Image Optimization: Pointer events none and Draggable false ensures swipe always works */}
                <img 
                  src={latestTrack.albumArt} 
                  alt="" 
                  draggable="false"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105 pointer-events-none select-none"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end pointer-events-none">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">Featured Drop</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black mb-1 tracking-tighter leading-none">{latestTrack.title}</h2>
                  <p className="text-white/40 font-bold text-lg mb-6">{latestTrack.artist}</p>
                  
                  <button className="pointer-events-auto flex items-center gap-3 bg-white text-black px-7 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95 w-fit shadow-xl">
                    <Play size={16} fill="currentColor" /> Play Now
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="aspect-[21/7] bg-white/5 rounded-[32px] flex items-center justify-center border border-white/5">
                <ListMusic className="text-white/10" size={40} />
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* SEARCH AREA - Non-blocking UI */}
        <div className="px-6 mt-10 max-w-5xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={20} />
            <input 
              type="text" 
              placeholder="Search the MS Metaverse..."
              className="w-full h-14 bg-white/[0.03] rounded-2xl pl-14 pr-6 border border-white/5 outline-none focus:bg-white/[0.08] focus:border-blue-500/30 transition-all text-sm font-medium placeholder:text-white/20"
            />
          </div>
        </div>

        {/* TRENDING SECTION - Horizontal Scroll Optimization */}
        <section className="mt-12">
          <div className="px-6 mb-6 flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-2 select-none">
              <TrendingUp size={20} className="text-blue-500" />
              <h3 className="text-xl font-black uppercase tracking-tighter">Trending Now</h3>
            </div>
            <button onClick={onSeeAll} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors py-2 px-4 bg-white/5 rounded-lg active:scale-95">View All</button>
          </div>
          
          <div 
            className="flex gap-5 overflow-x-auto px-6 pb-6 no-scrollbar snap-x touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {tracks.length > 0 ? (
              tracks.map((track, idx) => (
                <div key={track.id} className="snap-start shrink-0 will-change-transform">
                  <MusicCard 
                    track={track} 
                    index={idx} 
                    onClick={() => onSelectTrack(track)}
                  />
                </div>
              ))
            ) : (
              <div className="w-full text-center py-10 text-white/10 uppercase font-black text-xs tracking-[0.2em]">Syncing...</div>
            )}
          </div>
        </section>

        {/* DISCOVER GRID - High Response Tap */}
        <section className="mt-6 px-6 mb-32 max-w-5xl mx-auto">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6 select-none">Discover</h3>
          <div className="grid grid-cols-2 gap-4">
            <DiscoverCard title="TOP CHARTS" color="from-blue-600/30" icon={<Play size={20} />} onClick={onSeeAll} />
            <DiscoverCard title="NEW DROPS" color="from-purple-600/30" icon={<Sparkles size={20} />} onClick={onSeeAll} />
          </div>
        </section>
      </main>
    </div>
  );
};

// Memoized Discover Card for zero-lag interaction
const DiscoverCard = memo(({ title, color, icon, onClick }: { title: string, color: string, icon: any, onClick: () => void }) => (
  <motion.div
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className={`relative h-32 rounded-3xl p-5 overflow-hidden cursor-pointer border border-white/5 bg-white/[0.02] group will-change-transform shadow-lg`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} to-transparent opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none`} />
    <div className="relative z-10 h-full flex flex-col justify-between pointer-events-none">
      <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
        {icon}
      </div>
      <h4 className="font-black text-sm tracking-tighter uppercase">{title}</h4>
    </div>
  </motion.div>
));

export default HomeScreen;
