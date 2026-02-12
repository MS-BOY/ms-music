import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Upload, Heart, Play, MoreVertical } from 'lucide-react';
import { Track } from '../types';

interface Props {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onUploadRequest: () => void;
  onToggleFavorite: (id: string) => void;
  hasPlayer?: boolean;
}

// 1. Memoize the Individual Item to prevent massive re-renders when one track changes
const LibraryItem = memo(({ track, index, onSelect, onToggleFav }: { 
  track: Track, 
  index: number, 
  onSelect: () => void, 
  onToggleFav: () => void 
}) => {
  return (
    <motion.div
      // Use simple opacity for low-end devices to save GPU cycles
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }} 
      className="group relative flex items-center gap-4 p-3 rounded-[24px] bg-white/[0.03] active:bg-white/[0.1] transition-colors cursor-pointer border border-white/[0.05] overflow-hidden"
      onClick={onSelect}
      // GPU Acceleration hint
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden relative shadow-lg bg-white/5 shrink-0 border border-white/5">
        <img 
          src={track.albumArt} 
          alt="" 
          loading="lazy" // Native lazy loading for 2GB RAM efficiency
          className="w-full h-full object-cover transform-gpu" 
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} fill="white" className="text-white" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-white truncate font-outfit uppercase tracking-tight">
          {track.title}
        </h4>
        <p className="text-[10px] text-white/40 truncate mt-0.5 font-bold uppercase tracking-widest">
          {track.artist}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }} 
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
            track.isFavorite ? 'text-red-500 bg-red-500/10' : 'text-white/20'
          }`}
        >
          <Heart size={18} fill={track.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/10"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </motion.div>
  );
});

const LibraryScreen: React.FC<Props> = ({ tracks, onSelectTrack, onUploadRequest, onToggleFavorite, hasPlayer }) => {
  
  // 2. Memoize sorting logic so it doesn't run on every single render
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [tracks]);

  // 3. Static style calculations
  const headerStickyPos = hasPlayer ? '72px' : '0px';
  const contentPaddingTop = hasPlayer ? '144px' : '72px';

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] overflow-y-auto no-scrollbar selection:bg-blue-500/30">
      {/* Optimized Background: Radial gradient is cheaper than Blur filters */}
      <div className="fixed top-0 inset-x-0 h-64 bg-[radial-gradient(circle_at_top,rgba(30,58,138,0.15)_0%,transparent_100%)] pointer-events-none" />

      {/* Optimized Header: Removed Backdrop-blur (performance killer on 2GB RAM) */}
      <header 
        style={{ top: headerStickyPos }}
        className="fixed left-0 right-0 z-[90] h-[72px] px-6 bg-[#050505] border-b border-white/[0.08] flex items-center justify-between"
      >
        <h1 className="text-2xl font-black font-outfit tracking-tight uppercase text-white">Library</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onUploadRequest}
          className="w-10 h-10 bg-white/[0.05] rounded-xl flex items-center justify-center border border-white/10 text-blue-400 active:bg-blue-500/20 transition-colors"
        >
          <Upload size={20} />
        </motion.button>
      </header>

      {/* Main Content Area */}
      <main 
        style={{ paddingTop: contentPaddingTop }}
        className="px-6 pb-32 relative z-10"
      >
        <div className="mb-6 mt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
            <Heart size={16} className="text-blue-400" />
            <h2 className="text-sm font-black font-outfit text-white uppercase tracking-tighter">
              My Collection
            </h2>
          </div>

          {/* 4. Optimized List Rendering */}
          <div className="grid grid-cols-1 gap-3" style={{ contentVisibility: 'auto' }}>
            {sortedTracks.length === 0 ? (
              <div className="p-12 rounded-[32px] text-center text-white/20 border border-dashed border-white/10 flex flex-col items-center">
                <Upload size={48} className="mb-4 opacity-10" />
                <p className="text-xs font-black uppercase tracking-widest">Library Empty</p>
              </div>
            ) : (
              sortedTracks.map((track, idx) => (
                <LibraryItem 
                  key={track.id} 
                  track={track} 
                  index={idx}
                  onSelect={onSelectTrack}
                  onToggleFav={onToggleFavorite}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default memo(LibraryScreen);
