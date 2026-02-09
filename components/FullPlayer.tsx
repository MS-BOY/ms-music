
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
  tracks: Track[]; // Added tracks prop to show the queue
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
  onSelectTrack: (track: Track) => void; // Added handler for queue selection
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const FullPlayer: React.FC<Props> = ({ 
  track, isPlaying, currentTime, duration, shuffleMode, repeatMode, tracks,
  onToggle, onNext, onPrev, onSeek, onToggleShuffle, onToggleRepeat, onClose, onSelectTrack
}) => {
  const [showQueue, setShowQueue] = useState(false);

  return (
    <motion.div
      initial={{ y: '100%', scale: 0.95, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: '100%', scale: 0.95, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      className="fixed inset-0 z-[120] bg-[#020202] flex flex-col perspective-1200 overflow-hidden transform-style-3d h-[100dvh]"
    >
      {/* Cinematic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.img 
          key={track.id}
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 0.4, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          src={track.albumArt} 
          alt="" 
          className="w-full h-full object-cover blur-[100px] scale-150" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-[#020202]" />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 px-6 pt-safe-top mt-4 flex items-center justify-between shrink-0 h-16"
      >
        <motion.button 
          whileTap={{ scale: 0.9 }} 
          onClick={onClose} 
          className="w-12 h-12 glass rounded-full flex items-center justify-center hover:bg-white/10 border border-white/20 shadow-lg"
        >
          <ChevronDown size={28} className="text-white" />
        </motion.button>
        <div className="flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.4em] font-black text-blue-400 opacity-80">
            {showQueue ? 'Upcoming Queue' : 'Now Playing'}
          </p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowQueue(!showQueue)}
          className={`w-12 h-12 glass rounded-full flex items-center justify-center transition-all border shadow-lg ${showQueue ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'hover:bg-white/10 border-white/20 text-white'}`}
        >
          <ListMusic size={24} />
        </motion.button>
      </motion.header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-evenly px-6 py-4 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!showQueue ? (
            <motion.div
              key="player-main"
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
              transition={{ type: "spring", damping: 25 }}
              className="flex flex-col items-center justify-center w-full transform-style-3d"
            >
              {/* Album Art - Rotating Vinyl */}
              <motion.div
                animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                transition={isPlaying ? { duration: 30, repeat: Infinity, ease: 'linear' } : { duration: 1.5 }}
                className="relative w-[70vw] h-[70vw] max-w-[320px] max-h-[320px] aspect-square flex-shrink-0"
              >
                <div className="absolute -inset-8 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 rounded-full blur-[60px] animate-pulse" />
                
                <div className="relative w-full h-full rounded-full p-2 bg-gradient-to-br from-white/10 to-transparent shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 ring-1 ring-white/5">
                  <div className="absolute inset-0 rounded-full bg-[#0a0a0a] border-[8px] border-white/5 overflow-hidden">
                     <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 vinyl-shine opacity-50 mix-blend-overlay" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] h-[25%] bg-[#050505] rounded-full border-2 border-white/5 shadow-inner" />
                </div>
              </motion.div>

              {/* Track Info */}
              <div className="w-full text-center space-y-2 mt-12">
                <motion.h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-outfit tracking-tight text-white uppercase drop-shadow-xl line-clamp-2">
                  {track.title}
                </motion.h2>
                <motion.p className="text-lg sm:text-xl text-blue-400 font-black uppercase tracking-[0.2em] font-outfit opacity-90 truncate px-4">
                  {track.artist}
                </motion.p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="player-queue"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full h-full max-w-lg glass rounded-[40px] border border-white/10 flex flex-col overflow-hidden shadow-2xl backdrop-blur-3xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black font-outfit uppercase tracking-tighter flex items-center gap-3">
                   <Music size={20} className="text-blue-500" />
                   Up Next
                </h3>
                <button onClick={() => setShowQueue(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} className="text-white/40" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {tracks.map((t, idx) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => {
                      onSelectTrack(t);
                      setShowQueue(false);
                    }}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer ${t.id === track.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <img src={t.albumArt} alt={t.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-black font-outfit uppercase tracking-tight truncate ${t.id === track.id ? 'text-blue-400' : 'text-white'}`}>
                        {t.title}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate">
                        {t.artist}
                      </p>
                    </div>
                    {t.id === track.id && isPlaying && (
                      <div className="flex gap-0.5 items-end h-3 mb-1">
                        {[1, 2, 3].map(i => (
                          <motion.div
                            key={i}
                            animate={{ height: ['20%', '100%', '20%'] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                            className="w-0.5 bg-blue-500"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Area */}
      <div className="relative z-10 px-6 pb-safe-bottom w-full max-w-lg mx-auto mb-8 shrink-0">
        
        {/* Progress Bar */}
        <div className="group relative mb-8">
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <input 
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-4 -top-1 opacity-0 cursor-pointer z-20"
          />
          <div className="flex justify-between mt-2 text-[10px] font-bold text-white/40 tracking-widest font-outfit uppercase">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onToggleShuffle} 
            className={`p-3 rounded-2xl transition-all ${shuffleMode ? 'text-blue-400 bg-blue-500/10' : 'text-white/30'}`}
          >
             <Shuffle size={22} />
          </motion.button>

          <div className="flex items-center gap-6 sm:gap-10">
            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={onPrev} 
              className="text-white/80 hover:text-white transition-colors"
            >
              <SkipBack size={36} fill="currentColor" />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggle}
              className="w-20 h-20 rounded-[30px] glass-high text-white flex items-center justify-center border border-white/20 shadow-[0_10px_40px_rgba(59,130,246,0.3)] bg-gradient-to-br from-white/10 to-transparent"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.85 }} 
              onClick={onNext} 
              className="text-white/80 hover:text-white transition-colors"
            >
              <SkipForward size={36} fill="currentColor" />
            </motion.button>
          </div>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onToggleRepeat} 
            className={`p-3 rounded-2xl relative transition-all ${repeatMode !== 'none' ? 'text-purple-400 bg-purple-500/10' : 'text-white/30'}`}
          >
             <Repeat size={22} />
             {repeatMode === 'one' && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-purple-500 rounded-full" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default FullPlayer;
