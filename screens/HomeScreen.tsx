import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, Play, TrendingUp, Sparkles, LayoutGrid, Clock, ChevronRight } from 'lucide-react';
import { Track, User } from '../types';

interface Props {
  tracks: Track[];
  user: User | null;
  onSelectTrack: (track: Track) => void;
  onNavigateProfile: () => void;
}

const SPRING_CONFIG = { type: "spring", stiffness: 500, damping: 35 };

const HomeScreen: React.FC<Props> = ({ tracks, user, onSelectTrack, onNavigateProfile }) => {
  // Memoize data to prevent re-renders on low-end CPUs
  const featuredTrack = useMemo(() => tracks[0], [tracks]);
  const trendingTracks = useMemo(() => tracks.slice(1, 6), [tracks]);
  const recentTracks = useMemo(() => tracks.slice(6, 12), [tracks]);

  return (
    <div className="h-full w-full bg-[#050505] text-white selection:bg-blue-500/30 overflow-y-auto no-scrollbar scroll-smooth">
      
      {/* 1. ULTRA-LIGHT HEADER */}
      <header className="sticky top-0 z-[100] h-16 px-5 flex items-center justify-between bg-[#050505]/80 backdrop-blur-md border-b border-white/[0.03] will-change-transform">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm">M</div>
          <span className="text-sm font-black tracking-tighter uppercase italic">VIBE</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Search size={20} className="text-white/40" />
          <div onClick={onNavigateProfile} className="w-8 h-8 rounded-full border border-white/10 overflow-hidden active:scale-90 transition-transform">
            <img src={user?.avatar || "https://picsum.photos/100"} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
      </header>

      <main className="pb-32 pt-4">
        {/* 2. HERO SECTION - Single layer with CSS gradient (Low RAM usage) */}
        <section className="px-5 mb-8" style={{ contain: 'content' }}>
          {featuredTrack && (
            <div 
              onClick={() => onSelectTrack(featuredTrack)}
              className="relative aspect-[16/10] w-full rounded-[24px] overflow-hidden bg-zinc-900 shadow-2xl active:scale-[0.98] transition-transform"
            >
              <img 
                src={featuredTrack.albumArt} 
                className="absolute inset-0 w-full h-full object-cover opacity-50" 
                alt="" 
                loading="eager" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Sparkles size={12} fill="currentColor" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hot Pick</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight leading-none mb-1">{featuredTrack.title}</h2>
                <p className="text-white/40 text-sm font-medium mb-4">{featuredTrack.artist}</p>
                <button className="h-10 px-6 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-tighter flex items-center gap-2">
                  <Play size={14} fill="currentColor" /> Listen Now
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 3. TRENDING - Native CSS Scroll Snap (Zero JS overhead) */}
        <section className="mb-10" style={{ contain: 'content' }}>
          <div className="px-5 mb-4 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
              <TrendingUp size={14} /> Trending
            </h3>
            <ChevronRight size={16} className="text-white/20" />
          </div>
          
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar snap-x touch-pan-x">
            {trendingTracks.map((track) => (
              <div 
                key={track.id} 
                onClick={() => onSelectTrack(track)}
                className="snap-start shrink-0 w-32 active:scale-95 transition-transform"
              >
                <div className="aspect-square rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden mb-2">
                  <img src={track.albumArt} className="w-full h-full object-cover" alt="" loading="lazy" />
                </div>
                <p className="text-[11px] font-bold truncate">{track.title}</p>
                <p className="text-[10px] text-white/30 truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. DISCOVER GRID - Static layout for performance */}
        <section className="px-5 mb-10">
          <div className="grid grid-cols-2 gap-3">
            <CategoryCard title="Charts" color="bg-blue-600/10" icon={<TrendingUp size={18} className="text-blue-500" />} />
            <CategoryCard title="Moods" color="bg-purple-600/10" icon={<LayoutGrid size={18} className="text-purple-500" />} />
          </div>
        </section>

        {/* 5. RECENTLY PLAYED - Simple vertical list (Memory Efficient) */}
        <section className="px-5" style={{ contain: 'content' }}>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
            <Clock size={14} /> Recents
          </h3>
          <div className="space-y-1">
            {recentTracks.map((track) => (
              <TrackListItem 
                key={track.id} 
                track={track} 
                onClick={() => onSelectTrack(track)} 
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

/* --- SUB-COMPONENTS (Memoized to prevent CPU spikes) --- */

const CategoryCard = memo(({ title, color, icon }: any) => (
  <div className={`p-4 rounded-2xl ${color} border border-white/[0.03] flex flex-col gap-3 active:scale-95 transition-transform`}>
    <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center">{icon}</div>
    <span className="text-xs font-black uppercase tracking-wider">{title}</span>
  </div>
));

const TrackListItem = memo(({ track, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 p-2 hover:bg-white/[0.02] active:bg-white/[0.05] rounded-xl transition-colors group"
  >
    <div className="w-12 h-12 rounded-lg bg-zinc-900 overflow-hidden shrink-0 border border-white/5">
      <img src={track.albumArt} className="w-full h-full object-cover" alt="" loading="lazy" />
    </div>
    <div className="flex-1 text-left min-w-0">
      <p className="text-sm font-bold text-white/90 truncate group-active:text-blue-400 transition-colors">{track.title}</p>
      <p className="text-[11px] text-white/30 truncate font-medium uppercase tracking-tighter">{track.artist}</p>
    </div>
    <div className="w-8 h-8 flex items-center justify-center text-white/20">
      <Play size={16} fill="currentColor" className="opacity-0 group-active:opacity-100 group-hover:opacity-100 transition-opacity" />
    </div>
  </button>
));

export default memo(HomeScreen);
