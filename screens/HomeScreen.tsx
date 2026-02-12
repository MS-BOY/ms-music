import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
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
const HomeScreen: React.FC<Props> = ({
tracks,
user,
onSelectTrack,
onNavigateProfile,
onSeeAll,
hasPlayer
}) => {
const latestTrack = useMemo(() => tracks[0] || null, [tracks]);
const headerStickyPos = hasPlayer ? 'top-[72px]' : 'top-0';
const contentPadding = hasPlayer ? 'pt-[120px]' : 'pt-[72px]';
return (
<div className="flex flex-col h-full w-full pb-28 overflow-y-auto no-scrollbar bg-[#050505]">
code
Code
{/* Lightweight Header */}
  <header className={`fixed left-0 right-0 z-50 h-[72px] px-6 flex items-center justify-between bg-black/80 border-b border-white/5 ${headerStickyPos}`}>

    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <span className="font-bold text-white text-sm">M</span>
      </div>
      <h1 className="text-sm font-bold uppercase tracking-wide text-white">
        MS MUSIC
      </h1>
    </div>

    <div className="flex items-center gap-2">
      <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition">
        <Search size={18} className="text-white/60" />
      </button>

      <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition relative">
        <Bell size={18} className="text-white/60" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
      </button>

      <button
        onClick={onNavigateProfile}
        className="w-8 h-8 rounded-lg overflow-hidden border border-white/10"
      >
        <img
          src={user?.avatar || "https://picsum.photos/200"}
          alt="Avatar"
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </button>
    </div>
  </header>

  <div className={contentPadding}>

    {/* Hero Section */}
    <section className="px-6 pt-6 flex justify-center">
      {latestTrack ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => onSelectTrack(latestTrack)}
          className="relative overflow-hidden rounded-3xl w-full max-w-4xl aspect-[16/7] cursor-pointer border border-white/5"
        >
          <img
            src={latestTrack.albumArt}
            alt={latestTrack.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-500 hover:scale-105 will-change-transform"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

          <div className="absolute bottom-8 left-8">
            <div className="flex items-center gap-2 mb-3 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} />
              Featured
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {latestTrack.title}
            </h2>

            <p className="text-white/50 text-sm mt-1">
              {latestTrack.artist}
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectTrack(latestTrack);
              }}
              className="mt-4 px-6 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center gap-2 text-xs font-semibold uppercase transition"
            >
              <Play size={16} fill="white" />
              Play
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-3xl w-full max-w-4xl aspect-[16/7] flex flex-col items-center justify-center border border-white/5">
          <ListMusic size={32} className="text-white/20 mb-2" />
          <h3 className="text-sm font-bold text-white/30 uppercase">
            No Music Yet
          </h3>
        </div>
      )}
    </section>

    {/* Search */}
    <div className="px-6 mt-8 max-w-4xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
        <input
          type="text"
          placeholder="Search music..."
          className="w-full h-12 bg-white/5 rounded-xl pl-12 pr-4 border border-white/5 focus:border-white/10 outline-none text-sm transition"
        />
      </div>
    </div>

    {/* Trending */}
    <section className="mt-10">
      <div className="px-6 mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" />
          <h3 className="text-lg font-bold uppercase text-white">
            Trending
          </h3>
        </div>

        <button
          onClick={onSeeAll}
          className="text-xs font-semibold uppercase text-white/40 hover:text-white transition"
        >
          View All
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-6 pb-10 no-scrollbar">
        {tracks.length > 0 ? (
          tracks.map((track, idx) => (
            <MusicCard
              key={track.id}
              track={track}
              index={idx}
              onClick={() => onSelectTrack(track)}
            />
          ))
        ) : (
          <div className="px-4 text-white/20 text-xs uppercase py-10">
            Loading...
          </div>
        )}
      </div>
    </section>

    {/* Discover */}
    <section className="mt-6 px-6 mb-20 max-w-4xl mx-auto">
      <h3 className="text-lg font-bold mb-6 uppercase text-white">
        Discover
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <DiscoverCard title="Top Charts" onClick={onSeeAll} />
        <DiscoverCard title="New Drops" onClick={onSeeAll} />
      </div>
    </section>
  </div>
</div>
);
};
const DiscoverCard: React.FC<{ title: string; onClick: () => void }> = ({ title, onClick }) => (
<motion.div
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
transition={{ duration: 0.2 }}
onClick={onClick}
className="h-32 rounded-2xl p-5 cursor-pointer border border-white/5 bg-white/5 hover:bg-white/10 transition"
code
Code
<h4 className="font-bold text-sm uppercase text-white">
  {title}
</h4>
</motion.div>
);
export default HomeScreen;
