import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Screen, Track, User } from './types';
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import LibraryScreen from './screens/LibraryScreen';
import UploadMusicScreen from './screens/UploadMusicScreen';
import MiniPlayer from './components/MiniPlayer';
import FullPlayer from './components/FullPlayer';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [targetScreen, setTargetScreen] = useState<Screen | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [userTracks, setUserTracks] = useState<Track[]>([]);

  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  /* ---------------- NEXT / PREV TRACK ---------------- */
  const nextTrack = useCallback(() => {
    if (!userTracks.length) return;
    let nextIndex = 0;
    if (currentTrack) {
      const currentIndex = userTracks.findIndex((t) => t.id === currentTrack.id);
      nextIndex = shuffleMode ? Math.floor(Math.random() * userTracks.length) : (currentIndex + 1) % userTracks.length;
    }
    setCurrentTrack(userTracks[nextIndex]);
    setIsPlaying(true);
  }, [currentTrack, userTracks, shuffleMode]);

  const prevTrack = useCallback(() => {
    if (!currentTrack || !userTracks.length) return;
    const currentIndex = userTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + userTracks.length) % userTracks.length;
    setCurrentTrack(userTracks[prevIndex]);
    setIsPlaying(true);
  }, [currentTrack, userTracks]);

  /* ---------------- AUTH LISTENER ---------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser({
              id: user.uid,
              name: data.username,
              avatar: data.photoURL || 'https://picsum.photos/200',
              bio: data.bio || 'Music enthusiast',
            });
            if (targetScreen) {
              setCurrentScreen(targetScreen);
              setTargetScreen(null);
            } else if (currentScreen === 'auth' || currentScreen === 'splash') {
              setCurrentScreen('home');
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [targetScreen, currentScreen]);

  /* ---------------- FETCH TRACKS ---------------- */
  useEffect(() => {
    const q = query(collection(db, 'tracks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tracks: Track[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            artist: data.artist,
            albumArt: data.albumArt,
            audioUrl: data.audioUrl,
            duration: data.duration || 0,
            isFavorite: false,
          };
        });
        setUserTracks(tracks);
      },
      (err) => console.error('Error fetching tracks:', err)
    );
    return () => unsubscribe();
  }, []);

  /* ---------------- AUDIO SETUP ---------------- */
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.crossOrigin = 'anonymous';

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else nextTrack();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, nextTrack]);

  /* ---------------- SYNC PLAYBACK ---------------- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const syncAudio = async () => {
      if (audio.src !== currentTrack.audioUrl) {
        audio.pause();
        audio.src = currentTrack.audioUrl;
        audio.load();
      }
      if (isPlaying) {
        try {
          playPromiseRef.current = audio.play();
          await playPromiseRef.current;
        } catch (err: any) {
          if (err.name !== 'AbortError') console.warn('Playback error:', err);
        }
      } else {
        audio.pause();
      }
    };
    syncAudio();
  }, [currentTrack, isPlaying]);

  /* ---------------- USER ACTIONS ---------------- */
  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const seek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFavorite = (trackId: string) => {
    setUserTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
    if (currentTrack?.id === trackId) setCurrentTrack((prev) => prev && { ...prev, isFavorite: !prev.isFavorite });
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsPlayerExpanded(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setTargetScreen(null);
    setCurrentScreen('home');
  };

  const navigateTo = useCallback(
    (screen: Screen) => {
      const protectedScreens: Screen[] = ['chat', 'profile', 'upload', 'settings'];
      if (protectedScreens.includes(screen) && !currentUser) {
        setTargetScreen(screen);
        setCurrentScreen('auth');
      } else setCurrentScreen(screen);
    },
    [currentUser]
  );

  /* ---------------- SCREEN ANIMATION ---------------- */
  const screenVariants: Variants = {
    initial: { opacity: 0, scale: 0.96, filter: 'blur(8px)', y: 10 },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 1.04, filter: 'blur(8px)', y: -10, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  const showBottomNav = ['home', 'library'].includes(currentScreen);
  const showMiniPlayer = Boolean(currentTrack && !['splash', 'auth'].includes(currentScreen) && !isPlayerExpanded);

  /* ---------------- RENDER ---------------- */
  return (
    <div className="relative h-screen w-full bg-[#020202] overflow-hidden text-white font-inter selection:bg-blue-500/30">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-[30%] -left-[20%] w-[120vw] h-[120vw] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_60%)] blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.2, 1], rotate: [0, -45, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: 2 }}
          className="absolute top-[20%] -right-[30%] w-[100vw] h-[100vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_60%)] blur-[120px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Screens */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative z-10 w-full h-full transform-style-3d will-change-transform"
        >
          {(() => {
            switch (currentScreen) {
              case 'splash': return <SplashScreen onFinish={() => setCurrentScreen('home')} />;
              case 'auth': return <AuthScreen onLogin={() => {}} onCancel={() => { setTargetScreen(null); setCurrentScreen('home'); }} />;
              case 'home': return <HomeScreen tracks={userTracks} user={currentUser} onSelectTrack={handleTrackSelect} onNavigateProfile={() => navigateTo('profile')} onSeeAll={() => navigateTo('library')} hasPlayer={showMiniPlayer} />;
              case 'library': return <LibraryScreen tracks={userTracks} onSelectTrack={handleTrackSelect} onUploadRequest={() => navigateTo('upload')} onToggleFavorite={toggleFavorite} hasPlayer={showMiniPlayer} />;
              case 'upload': return <UploadMusicScreen onUploadSuccess={() => navigateTo('library')} onCancel={() => navigateTo('library')} hasPlayer={showMiniPlayer} />;
              case 'chat': return <ChatScreen tracks={userTracks} onSelectTrack={handleTrackSelect} onBack={() => setCurrentScreen('home')} onSettings={() => navigateTo('settings')} hasPlayer={showMiniPlayer} />;
              case 'profile': return <ProfileScreen user={currentUser} onBack={() => setCurrentScreen('home')} onLogout={handleLogout} hasPlayer={showMiniPlayer} />;
              case 'settings': return <SettingsScreen onBack={() => setCurrentScreen('chat')} onLogout={handleLogout} hasPlayer={showMiniPlayer} />;
              default: return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {showMiniPlayer && currentTrack && (
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            onToggle={togglePlay}
            onExpand={() => setIsPlayerExpanded(true)}
            onNext={nextTrack}
            onPrev={prevTrack}
            progress={duration > 0 ? (currentTime / duration) * 100 : 0}
          />
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <AnimatePresence>
        {showBottomNav && !isPlayerExpanded && <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />}
      </AnimatePresence>

      {/* Full Player */}
      <AnimatePresence>
        {isPlayerExpanded && currentTrack && (
          <FullPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            shuffleMode={shuffleMode}
            repeatMode={repeatMode}
            tracks={userTracks}
            onToggle={togglePlay}
            onNext={nextTrack}
            onPrev={prevTrack}
            onSeek={seek}
            onToggleShuffle={() => setShuffleMode(!shuffleMode)}
            onToggleRepeat={() => setRepeatMode(['none', 'one', 'all'][( ['none', 'one', 'all'].indexOf(repeatMode) + 1) % 3])}
            onToggleFavorite={() => toggleFavorite(currentTrack.id)}
            onClose={() => setIsPlayerExpanded(false)}
            onSelectTrack={(t) => { setCurrentTrack(t); setIsPlaying(true); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
