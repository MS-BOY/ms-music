import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Search, Bell, Play, TrendingUp, Sparkles, 
  Clock, ChevronRight, Home, Compass, 
  Library, Mic2, Heart, MoreHorizontal 
} from 'lucide-react';
import { Track, User } from '../types';

interface Props {
  tracks: Track[];
  user: User | null;
  onSelectTrack: (track: Track) => void;
  onNavigateProfile: () => void;
}

// Optimized Animation Configs
const SPRING_UI = { type: "spring", stiffness: 400, damping: 33, mass: 1 };
const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const ITEM_UP = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: SPRING_UI }
};

const HomeScreen: React.FC<Props> = ({ tracks, user, onSelectTrack, onNavigateProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Performance: Data memoization
  const sections = useMemo(() => ({
    featured: tracks[0],
    trending: tracks.slice(1, 7),
    recent: tracks.slice(7, 15)
  }), [tracks]);

  return (
    <div className="flex h-full w-full bg-[#050505] text-white overflow-hidden">
      
      {/* 1. RESPONSIVE SIDEBAR (Hidden on Mobile) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/[0.03] bg-black/20 p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black">M</div>
          <span className="font-black tracking-tighter text-xl">MVIBE</span>
        </div>
        
        <nav className="space-y-6">
          <div className="space-y-1">
            <NavItem icon={<Home size={20}/>} label="Home" active />
            <NavItem icon={<Compass size={20}/>} label="Discover" />
            <NavItem icon={<Mic2 size={20}/>} label="Artists" />
          </div>
          
          <div className="pt-6 border-t border-white/[0.03] space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Library</p>
            <NavItem icon={<Library size={20}/>} label="Recent" />
            <NavItem icon={<Heart size={20}/>} label="Favorites" />
          </div>
        </nav>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* STICKY HEADER */}
        <header className="sticky top-0 z-[100] h-16 md:h-20 px-6 flex items-center justify-between bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.03]">
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search artists, tracks..."
                className="w-full h-11 bg-white/[0.03] border border-white/[0.05] rounded-xl pl-12 pr-4 outline-none focus:bg-white/[0.07] focus:border-blue-500/50 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 text-white/40 hover:text-white transition-colors"><Bell size={22}/></button>
            <div 
              onClick={onNavigateProfile}
              className="w-9 h-9 rounded-full border border-white/10 overflow-hidden cursor-pointer active:scale-90 transition-transform bg-zinc-900"
            >
              <img src={user?.avatar || "https://picsum.photos/100"} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-32 transform-gpu">
          <LayoutGroup>
            <motion.div 
              variants={STAGGER_CONTAINER}
              initial="hidden"
              animate="show"
              className="p-6 max-w-7xl mx-auto w-full space-y-12"
            >
              
              {/* HERO SECTION - Responsive Aspect Ratio */}
              <motion.section variants={ITEM_UP} className="relative group">
                {sections.featured && (
                  <div 
                    onClick={() => onSelectTrack(sections.featured)}
                    className="relative aspect-[16/9] md:aspect-[21/8] w-full rounded-[32px] overflow-hidden cursor-pointer bg-zinc-900 shadow-2xl will-change-transform active:scale-[0.99] transition-transform"
                  >
                    <img src={sections.featured.albumArt} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2s]" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">New Release</span>
                        <div className="h-px w-12 bg-white/20" />
                      </div>
                      <h2 className="text-3xl md:text-6xl font-black mb-2 tracking-tighter leading-none">{sections.featured.title}</h2>
                      <p className="text-white/50 text-lg mb-8 font-medium italic">{sections.featured.artist}</p>
                      <button className="flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl w-fit">
                        <Play size={16} fill="currentColor" /> Listen Now
                      </button>
                    </div>
                  </div>
                )}
              </motion.section>

              {/* TRENDING SECTION - CSS Scroll Snap */}
              <motion.section variants={ITEM_UP} style={{ contain: 'content' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                    <TrendingUp className="text-blue-500" /> Trending Drops
                  </h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white flex items-center gap-1">View All <ChevronRight size={14}/></button>
                </div>

                <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x touch-pan-x pb-4">
                  {sections.trending.map((track) => (
                    <motion.div 
                      key={track.id} 
                      whileHover={{ y: -8 }}
                      onClick={() => onSelectTrack(track)}
                      className="snap-start shrink-0 w-[160px] md:w-[200px] cursor-pointer group"
                    >
                      <div className="aspect-square rounded-2xl bg-zinc-900 border border-white/5 overflow-hidden mb-4 relative shadow-lg">
                        <img src={track.albumArt} className="w-full h-full object-cover" alt="" loading="lazy" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black translate-y-4 group-hover:translate-y-0 transition-transform">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-sm truncate mb-1">{track.title}</p>
                      <p className="text-xs text-white/30 truncate font-medium">{track.artist}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* DISCOVER GRID - Responsive Grid (1 col Mobile, 4 col Desktop) */}
              <motion.section variants={ITEM_UP}>
                <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <Sparkles className="text-amber-400" size={20} /> For Your Vibes
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {sections.recent.map((track) => (
                    <TrackCard key={track.id} track={track} onSelect={() => onSelectTrack(track)} />
                  ))}
                </div>
              </motion.section>

            </motion.div>
          </LayoutGroup>
        </div>
      </main>
    </div>
  );
};

/* --- SUB-COMPONENTS (Performance Optimized) --- */

const NavItem = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <button className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
    {icon}
    <span className="text-sm font-bold">{label}</span>
  </button>
);

const TrackCard = memo(({ track, onSelect }: { track: Track, onSelect: () => void }) => (
  <motion.div 
    layout
    onClick={onSelect}
    className="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.06] active:scale-[0.98] transition-all cursor-pointer group"
  >
    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md">
      <img src={track.albumArt} className="w-full h-full object-cover" alt="" loading="lazy" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-sm truncate group-hover:text-blue-400 transition-colors">{track.title}</p>
      <p className="text-[10px] text-white/30 uppercase font-black tracking-widest truncate">{track.artist}</p>
    </div>
    <button className="text-white/20 hover:text-white p-2 transition-colors">
      <MoreHorizontal size={18} />
    </button>
  </motion.div>
));

export default memo(HomeScreen);
