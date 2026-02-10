import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, ListMusic, X, Music } from 'lucide-react';
import { Track } from '../types';

interface Props {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffleMode: boolean;
  repeatMode: 'none' | 'one' | 'all';
  tracks: Track[];
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
  onSelectTrack: (track: Track) => void;
}

const formatTime = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

const FullPlayer: React.FC<Props> = ({
  track, isPlaying, currentTime, duration, shuffleMode, repeatMode, tracks,
  onToggle, onNext, onPrev, onSeek, onToggleShuffle, onToggleRepeat, onClose, onSelectTrack
}) => {
  const [showQueue, setShowQueue] = useState(false);

  // Minimal spring for screens
  const screenVariants = {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  return (
    <motion.div
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-[120] bg-[#020202] flex flex-col overflow-hidden"
    >
      {/* Static Background Blur */}
      <div className="absolute inset-0 pointer-events-none">
        <img src={track.albumArt} alt="" className="w-full h-full object-cover opacity-20 blur-[30px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-[#020202]" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-safe-top mt-4 flex items-center justify-between h-16">
        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <ChevronDown size={28} className="text-white" />
        </button>
        <p className="text-[10px] uppercase tracking-[0.4em] font-black text-blue-400 opacity-80">
          {showQueue ? 'Upcoming Queue' : 'Now Playing'}
        </p>
        <button onClick={() => setShowQueue(!showQueue)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <ListMusic size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!showQueue ? (
            <motion.div
              key="player-main"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center w-full"
            >
              {/* Album Art */}
              <div
                className="relative w-[70vw] h-[70vw] max-w-[320px] max-h-[320px] rounded-full overflow-hidden"
                style={{ transform: isPlaying ? 'rotate(0deg)' : 'rotate(0deg)' }}
              >
                <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover rounded-full" />
              </div>

              {/* Track Info */}
              <div className="w-full text-center mt-8 space-y-2">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase line-clamp-2">
                  {track.title}
                </h2>
                <p className="text-lg sm:text-xl text-blue-400 font-black uppercase tracking-[0.2em] truncate px-4">
                  {track.artist}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="player-queue"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full max-w-lg mx-auto flex flex-col overflow-hidden bg-[#111111] rounded-3xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-black uppercase flex items-center gap-2">
                  <Music size={18} className="text-blue-400" /> Up Next
                </h3>
                <button onClick={() => setShowQueue(false)} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={20} className="text-white/40" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {tracks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => { onSelectTrack(t); setShowQueue(false); }}
                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${t.id === track.id ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}
                  >
                    <img src={t.albumArt} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-black truncate ${t.id === track.id ? 'text-blue-400' : 'text-white'}`}>
                        {t.title}
                      </h4>
                      <p className="text-[10px] text-white/40 truncate">{t.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="relative z-10 px-6 pb-6 w-full max-w-lg mx-auto">
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400" style={{ width: `${(currentTime / (duration||1)) * 100}%` }} />
          <input type="range" min={0} max={duration||100} value={currentTime} onChange={e => onSeek(parseFloat(e.target.value))} className="absolute inset-0 opacity-0 w-full cursor-pointer" />
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mb-4">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={onToggleShuffle} className={`p-2 rounded-xl ${shuffleMode ? 'text-blue-400' : 'text-white/30'}`}><Shuffle size={20} /></button>
          <div className="flex items-center gap-6">
            <button onClick={onPrev} className="text-white/80 hover:text-white"><SkipBack size={28} /></button>
            <button onClick={onToggle} className="w-16 h-16 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20">
              {isPlaying ? <Pause size={24}/> : <Play size={24}/>}
            </button>
            <button onClick={onNext} className="text-white/80 hover:text-white"><SkipForward size={28} /></button>
          </div>
          <button onClick={onToggleRepeat} className={`p-2 rounded-xl ${repeatMode !== 'none' ? 'text-purple-400' : 'text-white/30'}`}><Repeat size={20} /></button>
        </div>
      </div>
    </motion.div>
  );
};

export default FullPlayer;
