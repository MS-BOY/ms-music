import React from 'react';
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

const LibraryScreen: React.FC<Props> = ({ tracks, onSelectTrack, onUploadRequest, onToggleFavorite, hasPlayer }) => {
  
  const sortedTracks = [...tracks].sort((a, b) => {
    return parseInt(b.id) - parseInt(a.id);
  });

  // Zero margin docking logic
  const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
  const contentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className={`flex flex-col h-full w-full bg-[#050505] pb-32 overflow-y-auto no-scrollbar transition-all duration-500`}>
      {/* Cinematic Background Elements */}
      <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

      {/* Header - Aligned to Anchor Card at top-[72px] */}
      <header className={`fixed left-0 right-0 z-[90] h-[72px] px-6 glass bg-[#050505]/90 backdrop-blur-[50px] border-b border-white/10 flex items-center justify-between transition-all duration-500 ${headerStickyPos}`}>
        <h1 className="text-3xl font-black font-outfit tracking-tight uppercase">Library</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onUploadRequest}
          className="w-11 h-11 glass rounded-2xl flex items-center justify-center border border-white/20 text-blue-400 shadow-2xl hover:bg-blue-500/10 transition-colors"
        >
          <Upload size={22} />
        </motion.button>
      </header>

      {/* Main Content Area */}
      <div className={`px-6 mt-8 relative z-10 transition-all duration-500 ${contentPadding}`}>
        
        <div className="mb-8">
          <div className="relative mb-8 inline-block">
             <div className="absolute -inset-4 bg-blue-500/20 rounded-2xl blur-2xl opacity-40" />
             <div className="relative border border-blue-500/40 rounded-2xl px-5 py-2.5 bg-blue-500/10 backdrop-blur-md">
                <h2 className="text-xl font-black font-outfit text-white flex items-center gap-3 uppercase tracking-tighter">
                  <Heart size={20} className="text-blue-400" />
                  My Collection
                </h2>
             </div>
          </div>

          <div className="space-y-5">
            {sortedTracks.length === 0 ? (
              <div className="glass p-16 rounded-[40px] text-center text-white/40 border border-white/10 flex flex-col items-center shadow-2xl">
                <Upload size={64} className="mb-6 opacity-10" />
                <p className="text-lg font-black uppercase tracking-[0.3em] mb-3">Void Detected</p>
                <p className="text-sm text-white/20 max-w-[240px] leading-relaxed mb-8">Your digital soundscape is currently empty. Initialize a new upload.</p>
                <button 
                  onClick={onUploadRequest} 
                  className="px-10 py-4 bg-white text-black rounded-[20px] text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_15px_30px_rgba(255,255,255,0.2)]"
                >
                  Start Upload
                </button>
              </div>
            ) : (
              sortedTracks.map((track, idx) => (
                <LibraryItem 
                  key={track.id} 
                  track={track} 
                  index={idx}
                  onSelect={() => onSelectTrack(track)}
                  onToggleFav={() => onToggleFavorite(track.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LibraryItem: React.FC<{ track: Track, index: number, onSelect: () => void, onToggleFav: () => void }> = ({ track, index, onSelect, onToggleFav }) => (
  <motion.div
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay: index * 0.05, duration: 0.6 }}
    className="group relative flex items-center gap-5 p-4 rounded-[28px] hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-white/5 shadow-lg overflow-hidden"
    onClick={onSelect}
  >
    <div className="w-16 h-16 rounded-2xl overflow-hidden relative shadow-2xl bg-white/5 shrink-0 border border-white/5">
      <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000" />
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
        <Play size={24} fill="white" className="text-white" />
      </div>
    </div>

    <div className="flex-1 min-w-0">
      <h4 className="font-black text-base text-white truncate group-hover:text-blue-400 transition-colors font-outfit uppercase tracking-tight">{track.title}</h4>
      <p className="text-xs text-white/30 truncate mt-1 font-bold uppercase tracking-widest">{track.artist}</p>
    </div>

    <div className="flex items-center gap-2">
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }} 
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${track.isFavorite ? 'text-red-500 bg-red-500/10' : 'text-white/20 hover:text-white hover:bg-white/10'}`}
      >
        <Heart size={20} fill={track.isFavorite ? 'currentColor' : 'none'} />
      </button>
      <button 
        onClick={(e) => e.stopPropagation()}
        className="w-10 h-10 flex items-center justify-center rounded-full text-white/20 hover:text-white hover:bg-white/10 transition-colors"
      >
        <MoreVertical size={20} />
      </button>
    </div>
  </motion.div>
);

export default LibraryScreen;
