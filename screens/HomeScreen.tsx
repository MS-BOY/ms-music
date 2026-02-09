
import React from 'react';
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

  const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
  const contentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="flex flex-col h-full w-full pb-32 overflow-y-auto no-scrollbar transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
      {/* Header */}
      <header className={`fixed left-0 right-0 z-[90] h-[72px] px-6 flex items-center justify-between transition-all duration-500 bg-black/40 backdrop-blur-[30px] border-b border-white/5 ${headerStickyPos}`}>
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <span className="font-outfit font-black text-lg text-white">M</span>
          </div>
          <h1 className="text-lg font-black font-outfit tracking-tight uppercase text-white">MS MUSIC</h1>
        </motion.div>
        
        <div className="flex items-center gap-2.5">
          <button className="w-10 h-10 flex items-center justify-center glass rounded-xl hover:bg-white/10 transition-all">
            <Search size={18} className="text-white/70" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center glass rounded-xl hover:bg-white/10 transition-all relative">
            <Bell size={18} className="text-white/70" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-2 ring-black" />
          </button>
          <button onClick={onNavigateProfile} className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 bg-white/5 ml-1">
            <img src={user?.avatar || "https://picsum.photos/200"} alt="Avatar" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`${contentPadding}`}>
        {/* Hero Showcase - Exact screenshot matching with PC size optimization */}
        <section className="px-6 pt-6 flex justify-center">
          <AnimatePresence mode="wait">
            {latestTrack ? (
              <motion.div 
                layoutId="hero-card"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onSelectTrack(latestTrack)}
                className="relative overflow-hidden rounded-[44px] w-full max-w-4xl aspect-[21/9] sm:aspect-[16/7] group cursor-pointer shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/10 transition-shadow duration-500 will-change-transform"
              >
                {/* Background Image with Zoom Effect */}
                <div className="absolute inset-0 bg-[#0a0a0a]" />
                <motion.img 
                  src={latestTrack.albumArt} 
                  alt={latestTrack.title} 
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity"
                />
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Text Content - Positioned like screenshot */}
                <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end">
                  {/* Badge */}
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2.5 px-4 py-2 glass-high rounded-full border border-white/10 w-fit mb-4"
                  >
                    <Sparkles size={12} className="text-blue-400" />
                    <span className="text-[9px] font-black tracking-[0.3em] text-white uppercase opacity-70">Featured Drop</span>
                  </motion.div>
                  
                  <motion.h2 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl sm:text-6xl font-black font-outfit mb-1 text-white leading-none tracking-tighter"
                  >
                    {latestTrack.title}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/40 font-black text-xl mb-8 font-outfit tracking-tighter"
                  >
                    {latestTrack.artist}
                  </motion.p>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); onSelectTrack(latestTrack); }}
                    className="px-8 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-xl text-white rounded-full font-black flex items-center gap-3 w-fit border border-white/10 shadow-2xl transition-all"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Play size={18} fill="white" className="text-white" />
                    </div>
                    <span className="text-xs tracking-widest uppercase font-bold">Play Now</span>
                  </motion.button>
                </div>

                {/* Shimmer overlay */}
                <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 pointer-events-none group-hover:animate-[shimmer_3s_infinite]" />
              </motion.div>
            ) : (
               <div className="relative overflow-hidden rounded-[44px] w-full max-w-4xl aspect-[21/9] glass flex flex-col items-center justify-center border border-white/5">
                  <ListMusic size={40} className="text-white/20 mb-4" />
                  <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">Awaiting Drop</h3>
               </div>
            )}
          </AnimatePresence>
        </section>

        {/* Search Bar - Clean Dark Style */}
        <div className="px-6 mt-10 max-w-4xl mx-auto w-full">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search the MS Metaverse..."
              className="w-full h-14 bg-white/[0.02] rounded-[24px] pl-14 pr-8 outline-none border border-white/5 focus:border-white/10 focus:bg-white/[0.04] transition-all text-sm font-semibold placeholder:text-white/10"
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
            <button onClick={onSeeAll} className="px-5 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/10 hover:bg-white/5 transition-all">View All</button>
          </div>
          
          <div className="flex gap-6 overflow-x-auto px-6 pb-12 no-scrollbar snap-x snap-mandatory">
            <div className="flex gap-6 mx-auto">
              {tracks.length > 0 ? (
                tracks.map((track, idx) => (
                  <div key={track.id} className="snap-center">
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
            <DiscoverCard title="TOP CHARTS" color="from-indigo-600/40" icon={<Play size={20} />} onClick={onSeeAll} delay={0.1} />
            <DiscoverCard title="NEW DROPS" color="from-fuchsia-600/40" icon={<Sparkles size={20} />} onClick={onSeeAll} delay={0.2} />
          </div>
        </section>
      </div>
    </div>
  );
};

const DiscoverCard: React.FC<{ title: string, color: string, icon: React.ReactNode, onClick: () => void, delay: number }> = ({ title, color, icon, onClick, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6 }}
    whileHover={{ y: -5, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="glass h-36 rounded-[32px] p-6 relative overflow-hidden group cursor-pointer border border-white/10 shadow-xl"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} to-transparent opacity-10 group-hover:opacity-30 transition-opacity duration-700`} />
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="w-10 h-10 rounded-xl glass-high flex items-center justify-center text-white/80 border border-white/10 shadow-lg">
        {icon}
      </div>
      <h4 className="font-black text-lg font-outfit tracking-tighter uppercase text-white">{title}</h4>
    </div>
  </motion.div>
);

export default HomeScreen;
