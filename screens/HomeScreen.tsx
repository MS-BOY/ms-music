import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Play, ListMusic, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
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

  // Professional spacing logic
  const headerHeight = "h-[72px]";
  const safeArea = hasPlayer ? "pb-40" : "pb-24";

  return (
    <div className={`flex flex-col h-full w-full overflow-y-auto no-scrollbar bg-[#050505] text-white ${safeArea} transition-all duration-500`}>
      
      {/* --- PREMIUM HEADER --- */}
      <header className={`fixed top-0 left-0 right-0 z-[100] ${headerHeight} px-6 flex items-center justify-between backdrop-blur-2xl bg-black/60 border-b border-white/[0.05]`}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl">
              <span className="font-outfit font-black text-xl text-white">M</span>
            </div>
          </div>
          <h1 className="text-xl font-black font-outfit tracking-tighter hidden sm:block">MS MUSIC</h1>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-4 h-10 w-64 focus-within:ring-1 ring-blue-500/50 transition-all">
            <Search size={16} className="text-white/40" />
            <input className="bg-transparent border-none outline-none text-xs ml-3 w-full placeholder:text-white/20" placeholder="Search tracks..." />
          </div>
          
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors relative">
            <Bell size={20} className="text-white/70" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#050505]" />
          </button>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onNavigateProfile} 
            className="p-0.5 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ml-1"
          >
            <img src={user?.avatar || "https://picsum.photos/200"} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-black" />
          </motion.button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="mt-20 flex flex-col items-center">
        
        {/* HERO SECTION - Responsive Desktop/Mobile optimized */}
        <section className="w-full max-w-7xl px-4 sm:px-8 mt-4">
          <AnimatePresence mode="wait">
            {latestTrack ? (
              <motion.div 
                layoutId="hero-card"
                className="relative overflow-hidden rounded-[32px] sm:rounded-[48px] aspect-[16/10] sm:aspect-[21/9] group cursor-pointer border border-white/10"
                onClick={() => onSelectTrack(latestTrack)}
              >
                {/* Background Visuals */}
                <motion.img 
                  src={latestTrack.albumArt} 
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

                {/* Hero Content */}
                <div className="absolute inset-0 p-8 sm:p-16 flex flex-col justify-end items-start">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-full mb-4"
                  >
                    <Sparkles size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">New Release</span>
                  </motion.div>
                  
                  <h2 className="text-4xl sm:text-7xl font-black font-outfit mb-2 tracking-tighter leading-[0.9]">
                    {latestTrack.title}
                  </h2>
                  <p className="text-lg sm:text-2xl font-medium text-white/60 mb-8 font-outfit">
                    {latestTrack.artist}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 h-14 bg-white text-black rounded-full font-bold flex items-center gap-3 shadow-xl"
                    >
                      <Play size={20} fill="black" />
                      <span>Listen Now</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : (
               <div className="w-full aspect-[21/9] rounded-[48px] bg-white/5 animate-pulse flex items-center justify-center border border-white/5">
                  <ListMusic size={40} className="text-white/10" />
               </div>
            )}
          </AnimatePresence>
        </section>

        {/* SEARCH (Mobile Only) */}
        <div className="w-full px-6 mt-8 md:hidden">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <Search size={18} className="text-white/40" />
                <span className="text-white/20 text-sm font-medium">Search MS Music...</span>
            </div>
        </div>

        {/* --- TRENDING SECTION --- */}
        <section className="w-full mt-16 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
              <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">Trending Now</h3>
            </div>
            <button 
              onClick={onSeeAll}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              See All <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex gap-6 overflow-x-auto px-6 sm:px-8 pb-8 no-scrollbar snap-x">
             {tracks.map((track, idx) => (
                <div key={track.id} className="snap-start">
                    <MusicCard 
                        track={track} 
                        index={idx} 
                        onClick={() => onSelectTrack(track)}
                    />
                </div>
             ))}
          </div>
        </section>

        {/* --- DISCOVER GRID --- */}
        <section className="w-full max-w-7xl px-6 sm:px-8 mt-8 mb-12">
          <h3 className="text-2xl sm:text-3xl font-black mb-8 tracking-tighter uppercase">Categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DiscoverCard 
                title="Top Charts" 
                subtitle="Global top 50 tracks"
                color="from-blue-600 to-indigo-900" 
                icon={<TrendingUp size={24} />} 
                onClick={onSeeAll} 
            />
            <DiscoverCard 
                title="Curated Mix" 
                subtitle="Based on your taste"
                color="from-purple-600 to-fuchsia-900" 
                icon={<Sparkles size={24} />} 
                onClick={onSeeAll} 
            />
            <DiscoverCard 
                title="Fresh Drops" 
                subtitle="Just released today"
                color="from-emerald-600 to-teal-900" 
                icon={<Play size={24} />} 
                onClick={onSeeAll} 
            />
          </div>
        </section>

      </main>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const DiscoverCard: React.FC<{ 
    title: string, 
    subtitle: string, 
    color: string, 
    icon: React.ReactNode, 
    onClick: () => void 
}> = ({ title, subtitle, color, icon, onClick }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group relative h-44 rounded-[32px] p-8 overflow-hidden cursor-pointer border border-white/10 shadow-2xl"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
    <div className="absolute top-0 right-0 p-8 text-white/10 group-hover:text-white/20 transition-colors">
        {React.cloneElement(icon as React.ReactElement, { size: 80 })}
    </div>
    
    <div className="relative z-10 flex flex-col h-full justify-end">
      <h4 className="font-black text-2xl font-outfit tracking-tight uppercase text-white">{title}</h4>
      <p className="text-white/40 text-sm font-medium">{subtitle}</p>
    </div>
  </motion.div>
);

export default HomeScreen;
