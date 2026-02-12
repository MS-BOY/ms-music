import React, { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Bell, Play, ListMusic, TrendingUp, 
  Sparkles, ChevronRight, Mic2, Radio, Heart 
} from 'lucide-react';
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

// Sub-component for Discover Cards to prevent unnecessary re-renders
const DiscoverCard = memo(({ title, icon: Icon, color, onClick }: any) => (
  <motion.div
    whileHover={{ scale: 1.02, translateY: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group relative h-32 rounded-2xl p-5 cursor-pointer overflow-hidden border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-300"
  >
    <div className={`absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon size={80} />
    </div>
    <Icon size={20} className={`${color} mb-3`} />
    <h4 className="font-bold text-sm uppercase tracking-wider text-white">
      {title}
    </h4>
    <div className="mt-2 flex items-center text-[10px] font-bold text-white/40 uppercase">
      Explore <ChevronRight size={12} />
    </div>
  </motion.div>
));

const HomeScreen: React.FC<Props> = ({
  tracks,
  user,
  onSelectTrack,
  onNavigateProfile,
  onSeeAll,
  hasPlayer
}) => {
  const latestTrack = useMemo(() => tracks[0] || null, [tracks]);

  // Dynamic layout constants
  const headerStickyPos = hasPlayer ? 'top-0 md:top-0' : 'top-0';
  const contentPadding = "pt-24 md:pt-28";

  return (
    <div className="min-h-screen w-full pb-32 overflow-x-hidden bg-[#050505] text-white selection:bg-blue-500/30">
      
      {/* Optimized Glassmorphism Header */}
      <header className={`fixed left-0 right-0 z-[100] h-[72px] px-6 flex items-center justify-between backdrop-blur-xl bg-black/40 border-b border-white/5 transition-all duration-300 ${headerStickyPos}`}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 5 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-900/20"
            >
              <span className="font-black text-white text-lg">M</span>
            </motion.div>
            <h1 className="hidden sm:block text-sm font-black uppercase tracking-[0.2em] text-white">
              MS MUSIC
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center bg-white/5 rounded-full px-4 py-1.5 border border-white/5 focus-within:border-white/20 transition">
              <Search size={16} className="text-white/40" />
              <input type="text" placeholder="Search artists..." className="bg-transparent border-none focus:ring-0 text-xs w-48 ml-2" />
            </div>

            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition relative">
              <Bell size={20} className="text-white/80" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#050505]" />
            </button>

            <button
              onClick={onNavigateProfile}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/10 hover:border-blue-500 transition-colors"
            >
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                alt="Profile"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto ${contentPadding}`}>
        
        {/* Hero Section - Optimized for wide screens */}
        <section className="px-6">
          <AnimatePresence mode="wait">
            {latestTrack ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectTrack(latestTrack)}
                className="group relative overflow-hidden rounded-[2rem] w-full aspect-[16/9] md:aspect-[21/8] cursor-pointer border border-white/5 shadow-2xl"
              >
                <img
                  src={latestTrack.albumArt}
                  alt={latestTrack.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent md:bg-gradient-to-r" />
                
                <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-2/3">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mb-4"
                  >
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                      Featured Release
                    </span>
                  </motion.div>

                  <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-2 tracking-tighter">
                    {latestTrack.title}
                  </h2>
                  <p className="text-white/60 text-lg md:text-xl font-medium mb-6">
                    {latestTrack.artist}
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectTrack(latestTrack); }}
                      className="px-8 h-12 bg-white text-black hover:bg-blue-500 hover:text-white rounded-full flex items-center gap-3 text-sm font-bold uppercase transition-all transform active:scale-95"
                    >
                      <Play size={18} fill="currentColor" />
                      Play Now
                    </button>
                    <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition">
                      <Heart size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[400px] rounded-[2rem] bg-white/5 animate-pulse flex items-center justify-center border border-white/5">
                <Sparkles className="text-white/10 animate-spin-slow" size={48} />
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* Quick Search - Mobile Visible Only */}
        <div className="px-6 mt-8 md:hidden">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search your library..."
              className="w-full h-14 bg-white/5 rounded-2xl pl-12 pr-4 border border-white/5 focus:border-blue-500/50 outline-none text-base transition-all backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Trending Section */}
        <section className="mt-12">
          <div className="px-6 mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-blue-500" />
                <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">Hot Right Now</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Trending
              </h3>
            </div>

            <button
              onClick={onSeeAll}
              className="group flex items-center gap-2 text-xs font-bold uppercase text-white/40 hover:text-white transition-colors"
            >
              View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex gap-5 overflow-x-auto px-6 pb-8 no-scrollbar scroll-smooth snap-x">
            {tracks.length > 0 ? (
              tracks.map((track, idx) => (
                <div key={track.id} className="snap-start min-w-[160px] md:min-w-[200px]">
                  <MusicCard
                    track={track}
                    index={idx}
                    onClick={() => onSelectTrack(track)}
                  />
                </div>
              ))
            ) : (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="w-[180px] h-[240px] rounded-2xl bg-white/5 animate-pulse" />
              ))
            )}
          </div>
        </section>

        {/* Discover Grid */}
        <section className="mt-12 px-6 mb-32">
          <h3 className="text-2xl font-black mb-8 uppercase tracking-tight text-white">
            Discover
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DiscoverCard 
              title="Top Charts" 
              icon={TrendingUp} 
              color="text-blue-500" 
              onClick={onSeeAll} 
            />
            <DiscoverCard 
              title="New Drops" 
              icon={Sparkles} 
              color="text-purple-500" 
              onClick={onSeeAll} 
            />
            <DiscoverCard 
              title="Live Radio" 
              icon={Radio} 
              color="text-orange-500" 
              onClick={onSeeAll} 
            />
            <DiscoverCard 
              title="Podcasts" 
              icon={Mic2} 
              color="text-emerald-500" 
              onClick={onSeeAll} 
            />
          </div>
        </section>
      </main>

      {/* Persistent Bottom Padding for Player */}
      {hasPlayer && <div className="h-24" />}
    </div>
  );
};

export default memo(HomeScreen);
