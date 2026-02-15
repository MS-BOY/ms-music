import React, { useMemo } from 'react';
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

const HomeScreen: React.FC<Props> = ({ tracks, user, onSelectTrack, onNavigateProfile, onSeeAll, hasPlayer }) => {
  const latestTrack = tracks.length > 0 ? tracks[0] : null;

  // Optimization: Calculate these once to prevent layout thrashing
  const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
  const contentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  // Memoize static header to prevent re-renders
  const header = useMemo(() => (
    <header className={`fixed left-0 right-0 z-[90] h-[72px] px-6 flex items-center justify-between transition-transform duration-300 bg-black/60 backdrop-blur-md border-b border-white/5 ${headerStickyPos} will-change-transform`}>
      <motion.div 
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
          <span className="font-outfit font-black text-lg text-white">M</span>
        </div>
        <h1 className="text-lg font-black font-outfit tracking-tight uppercase text-white">MS MUSIC</h1>
      </motion.div>
      
      <div className="flex items-center gap-2.5">
        <button className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
          <Search size={18} className="text-white/70" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all relative">
          <Bell size={18} className="text-white/70" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-2 ring-black" />
        </button>
        <button onClick={onNavigateProfile} className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 bg-white/5 ml-1">
          <img loading="lazy" src={user?.avatar || "https://picsum.photos/200"} alt="Avatar" className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  ), [user, onNavigateProfile, headerStickyPos]);

  return (
    // REMOVED: transition-all duration-700 from the main container (Major lag cause during scroll)
    <div className="flex flex-col h-full w-full pb-32 overflow-y-auto no-scrollbar scroll-smooth">
      {header}

      <div className={`${contentPadding} transform-gpu`}>
        {/* Hero Showcase */}
        <section className="px-6 pt-6 flex justify-center">
          <AnimatePresence mode="wait">
            {latestTrack ? (
              <motion.div 
                key={latestTrack.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectTrack(latestTrack)}
                className="relative overflow-hidden rounded-[44px] w-full max-w-4xl aspect-[21/9] sm:aspect-[16/7] group cursor-pointer shadow-2xl border border-white/10 will-change-transform bg-neutral-900"
              >
                {/* Background Image - Optimized transition */}
                <motion.img 
                  src={latestTrack.albumArt} 
                  alt={latestTrack.title} 
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                  loading="eager"
                />
                
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                
                <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2.5 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 w-fit mb-4"
                  >
                    <Sparkles size={12} className="text-blue-400" />
                    <span className="text-[9px] font-black tracking-[0.3em] text-white uppercase opacity-70">Featured Drop</span>
                  </motion.div>
                  
                  <h2 className="text-4xl sm:text-6xl font-black font-outfit mb-1 text-white leading-none tracking-tighter">
                    {latestTrack.title}
                  </h2>
                  <p className="text-white/40 font-black text-xl mb-8 font-outfit tracking-tighter">
                    {latestTrack.artist}
                  </p>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectTrack(latestTrack); }}
                    className="px-8 h-12 bg-white text-black hover:bg-blue-500 hover:text-white rounded-full font-black flex items-center gap-3 w-fit shadow-xl transition-all active:scale-95"
                  >
                    <Play size={18} fill="currentColor" />
                    <span className="text-xs tracking-widest uppercase font-bold">Play Now</span>
                  </button>
                </div>
              </motion.div>
            ) : (
               <div className="relative rounded-[44px] w-full max-w-4xl aspect-[21/9] bg-white/5 flex flex-col items-center justify-center border border-white/5">
                  <ListMusic size={40} className="text-white/20 mb-4" />
                  <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">Awaiting Drop</h3>
               </div>
            )}
          </AnimatePresence>
        </section>

        {/* Search Bar */}
        <div className="px-6 mt-10 max-w-4xl mx-auto w-full">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
            <input 
              type="text" 
              placeholder="Search the MS Metaverse..."
              className="w-full h-14 bg-white/[0.03] rounded-[24px] pl-14 pr-8 outline-none border border-white/5 focus:border-blue-500/50 transition-all text-sm font-semibold placeholder:text-white/10"
            />
          </div>
        </div>

        {/* Trending List */}
        <section className="mt-12">
          <div className="px-6 mb-8 flex items-center justify-between max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-blue-500" />
              <h3 className="text-2xl font-black font-outfit tracking-tighter uppercase">Trending</h3>
            </div>
            <button onClick={onSeeAll} className="px-5 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/10 hover:bg-white/10 transition-colors">View All</button>
          </div>
          
          {/* Optimization: uses transform-gpu for smoother horizontal scrolling */}
          <div className="flex gap-6 overflow-x-auto px-6 pb-12 no-scrollbar snap-x snap-mandatory transform-gpu">
            <div className="flex gap-6 mx-auto">
              {tracks.length > 0 ? (
                tracks.map((track, idx) => (
                  <div key={track.id} className="snap-center will-change-contents">
                    <MusicCard 
                      track={track} 
                      index={idx} 
                      onClick={() => onSelectTrack(track)}
                    />
                  </div>
                ))
              ) : (
                <div className="px-4 text-white/10 text-xs font-black uppercase tracking-widest italic py-20 w-full text-center">
                  Syncing Frequency...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Discover Grid */}
        <section className="mt-4 px-6 mb-20 max-w-4xl mx-auto w-full">
          <h3 className="text-2xl font-black font-outfit mb-8 tracking-tighter uppercase">Discover</h3>
          <div className="grid grid-cols-2 gap-6">
            <DiscoverCard title="TOP CHARTS" color="from-indigo-600/20" icon={<Play size={20} />} onClick={onSeeAll} />
            <DiscoverCard title="NEW DROPS" color="from-fuchsia-600/20" icon={<Sparkles size={20} />} onClick={onSeeAll} />
          </div>
        </section>
      </div>
    </div>
  );
};

// Optimized DiscoverCard: Removed heavy filter effects on every frame
const DiscoverCard: React.FC<{ title: string, color: string, icon: React.ReactNode, onClick: () => void }> = ({ title, color, icon, onClick }) => (
  <motion.div
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="bg-white/5 h-36 rounded-[32px] p-6 relative overflow-hidden group cursor-pointer border border-white/10 will-change-transform"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} to-transparent opacity-40 group-hover:opacity-60 transition-opacity`} />
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 border border-white/10">
        {icon}
      </div>
      <h4 className="font-black text-lg font-outfit tracking-tighter uppercase text-white">{title}</h4>
    </div>
  </motion.div>
);

export default HomeScreen;
