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

const LibraryScreen: React.FC<Props> = ({
  tracks,
  onSelectTrack,
  onUploadRequest,
  onToggleFavorite,
  hasPlayer
}) => {

  // ✅ Memoized sorting (prevents re-sort every render)
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [tracks]);

  const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
  const contentPadding = hasPlayer ? 'pt-[120px]' : 'pt-[72px]';

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] pb-32 overflow-y-auto no-scrollbar">

      {/* Lightweight gradient */}
      <div className="fixed top-0 inset-x-0 h-72 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none" />

      {/* Optimized Header */}
      <header
        className={`fixed left-0 right-0 z-50 h-[72px] px-6 bg-[#050505]/95 border-b border-white/5 flex items-center justify-between ${headerStickyPos}`}
      >
        <h1 className="text-2xl font-bold uppercase tracking-tight">
          Library
        </h1>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onUploadRequest}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 text-blue-400 hover:bg-blue-500/10 transition"
        >
          <Upload size={20} />
        </motion.button>
      </header>

      {/* Content */}
      <div className={`px-6 relative z-10 ${contentPadding}`}>

        <div className="mb-6">
          <div className="mb-6 border border-blue-500/20 rounded-xl px-4 py-2 bg-blue-500/5 inline-flex items-center gap-2">
            <Heart size={18} className="text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              My Collection
            </h2>
          </div>

          <div className="space-y-3">

            {sortedTracks.length === 0 ? (
              <div className="p-12 rounded-2xl text-center text-white/40 border border-white/5 flex flex-col items-center">
                <Upload size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest mb-2">
                  No Tracks Yet
                </p>
                <button
                  onClick={onUploadRequest}
                  className="mt-4 px-6 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:scale-105 transition"
                >
                  Upload
                </button>
              </div>
            ) : (
              sortedTracks.map((track) => (
                <LibraryItem
                  key={track.id}
                  track={track}
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





// ✅ Memoized Item (Prevents unnecessary re-renders)
const LibraryItem: React.FC<{
  track: Track;
  onSelect: () => void;
  onToggleFav: () => void;
}> = memo(({ track, onSelect, onToggleFav }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    whileHover={{ scale: 1.01 }}
    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition cursor-pointer border border-transparent hover:border-white/5"
    onClick={onSelect}
  >
    <div className="w-14 h-14 rounded-xl overflow-hidden relative bg-white/5 shrink-0">
      <img
        src={track.albumArt}
        alt={track.title}
        loading="lazy"   // ✅ Lazy loading
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 will-change-transform"
      />

      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
        <Play size={20} fill="white" />
      </div>
    </div>

    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-sm text-white truncate group-hover:text-blue-400 transition">
        {track.title}
      </h4>
      <p className="text-xs text-white/40 truncate mt-1">
        {track.artist}
      </p>
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className={`w-9 h-9 flex items-center justify-center rounded-full transition ${
          track.isFavorite
            ? 'text-red-500'
            : 'text-white/30 hover:text-white'
        }`}
      >
        <Heart size={18} fill={track.isFavorite ? 'currentColor' : 'none'} />
      </button>

      <button
        onClick={(e) => e.stopPropagation()}
        className="w-9 h-9 flex items-center justify-center rounded-full text-white/30 hover:text-white transition"
      >
        <MoreVertical size={18} />
      </button>
    </div>
  </motion.div>
));

export default LibraryScreen;
