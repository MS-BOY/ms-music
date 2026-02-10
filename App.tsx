import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  // -------------------
  // AUTH STATE
  // -------------------
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
              bio: data.bio || 'Music enthusiast'
            });
            if (targetScreen) {
              setCurrentScreen(targetScreen);
              setTargetScreen(null);
            } else if (currentScreen === 'auth' || currentScreen === 'splash') {
              setCurrentScreen('home');
            }
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [targetScreen, currentScreen]);

  // -------------------
  // FETCH TRACKS
  // -------------------
  useEffect(() => {
    const q = query(collection(db, 'tracks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tracks: Track[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          artist: data.artist,
          albumArt: data.albumArt,
          audioUrl: data.audioUrl,
          duration: data.duration || 0,
          isFavorite: false
        };
      });
      setUserTracks(tracks);
    });
    return () => unsubscribe();
  }, []);

  // -------------------
  // AUDIO PLAYBACK
  // -------------------
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous";

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
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
  }, [repeatMode]);

  const nextTrack = useCallback(() => {
    if (!userTracks.length) return;
    let nextIndex = 0;
    if (currentTrack) {
      const idx = userTracks.findIndex(t => t.id === currentTrack.id);
      nextIndex = shuffleMode ? Math.floor(Math.random() * userTracks.length) : (idx + 1) % userTracks.length;
    }
    setCurrentTrack(userTracks[nextIndex]);
    setIsPlaying(true);
  }, [currentTrack, shuffleMode, userTracks]);

  const prevTrack = useCallback(() => {
    if (!currentTrack || !userTracks.length) return;
    const idx = userTracks.findIndex(t => t.id === currentTrack.id);
    setCurrentTrack(userTracks[(idx - 1 + userTracks.length) % userTracks.length]);
    setIsPlaying(true);
  }, [currentTrack, userTracks]);

  // -------------------
  // PLAY / PAUSE
  // -------------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (audio.src !== currentTrack.audioUrl) {
      audio.pause();
      audio.src = currentTrack.audioUrl;
      audio.load();
    }

    if (isPlaying) {
      playPromiseRef.current = audio.play().catch(err => {
        if (err.name !== 'AbortError') console.warn(err);
      });
    } else audio.pause();
  }, [currentTrack, isPlaying]);

  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);

  const seek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // -------------------
  // FAVORITES & NAV
  // -------------------
  const toggleFavorite = (trackId: string) => {
    setUserTracks(prev => prev.map(t => t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t));
    if (currentTrack?.id === trackId) setCurrentTrack(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
  };

  const navigateTo = useCallback((screen: Screen) => {
    const protectedScreens: Screen[] = ['chat', 'profile', 'upload', 'settings'];
    if (!currentUser && protectedScreens.includes(screen)) {
      setTargetScreen(screen);
      setCurrentScreen('auth');
    } else setCurrentScreen(screen);
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    setTargetScreen(null);
    setCurrentScreen('home');
  };

  // -------------------
  // SCREEN TRANSITIONS (LIGHTWEIGHT)
  // -------------------
  const screenVariants: Variants = {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.25, ease: 'easeIn' } }
  };

  const showBottomNav = ['home', 'library'].includes(currentScreen);
  const showMiniPlayer = Boolean(currentTrack && !['splash', 'auth'].includes(currentScreen) && !isPlayerExpanded);

  // -------------------
  // PERFORMANCE OPTIMIZED BACKGROUND
  // -------------------
  const bgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.01; // slow rotation
      if (bgRef.current) bgRef.current.style.transform = `rotate(${t}rad)`;
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  // -------------------
  // RENDER
  // -------------------
  return (
    <div className="relative h-screen w-full bg-[#020202] overflow-hidden text-white font-inter selection:bg-blue-500/30">
      {/* Optimized background */}
      <div ref={bgRef} className="absolute inset-0 bg-gradient-to-br from-blue-800/10 via-purple-800/10 to-pink-800/10 pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div key={currentScreen} variants={screenVariants} initial="initial" animate="animate" exit="exit" className="relative z-10 w-full h-full">
          {(() => {
            switch (currentScreen) {
              case 'splash': return <SplashScreen onFinish={() => setCurrentScreen('home')} />;
              case 'auth': return <AuthScreen onLogin={() => {}} onCancel={() => { setTargetScreen(null); setCurrentScreen('home'); }} />;
              case 'home': return <HomeScreen tracks={userTracks} user={currentUser} onSelectTrack={(t) => { setCurrentTrack(t); setIsPlaying(true); setIsPlayerExpanded(false); }} onNavigateProfile={() => navigateTo('profile')} onSeeAll={() => navigateTo('library')} hasPlayer={showMiniPlayer} />;
              case 'library': return <LibraryScreen tracks={userTracks} onSelectTrack={(t) => { setCurrentTrack(t); setIsPlaying(true); setIsPlayerExpanded(false); }} onUploadRequest={() => navigateTo('upload')} onToggleFavorite={toggleFavorite} hasPlayer={showMiniPlayer} />;
              case 'upload': return <UploadMusicScreen onUploadSuccess={() => navigateTo('library')} onCancel={() => navigateTo('library')} hasPlayer={showMiniPlayer} />;
              case 'chat': return <ChatScreen tracks={userTracks} onSelectTrack={(t) => { setCurrentTrack(t); setIsPlaying(true); setIsPlayerExpanded(false); }} onBack={() => setCurrentScreen('home')} onSettings={() => navigateTo('settings')} hasPlayer={showMiniPlayer} />;
              case 'profile': return <ProfileScreen user={currentUser} onBack={() => setCurrentScreen('home')} onLogout={handleLogout} hasPlayer={showMiniPlayer} />;
              case 'settings': return <SettingsScreen onBack={() => setCurrentScreen('chat')} onLogout={handleLogout} hasPlayer={showMiniPlayer} />;
              default: return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>

      {showMiniPlayer && <MiniPlayer track={currentTrack!} isPlaying={isPlaying} onToggle={togglePlay} onExpand={() => setIsPlayerExpanded(true)} onNext={nextTrack} onPrev={prevTrack} progress={duration > 0 ? (currentTime / duration) * 100 : 0} />}

      {showBottomNav && !isPlayerExpanded && <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />}

      {isPlayerExpanded && currentTrack && <FullPlayer track={currentTrack} isPlaying={isPlaying} currentTime={currentTime} duration={duration} shuffleMode={shuffleMode} repeatMode={repeatMode} tracks={userTracks} onToggle={togglePlay} onNext={nextTrack} onPrev={prevTrack} onSeek={seek} onToggleShuffle={() => setShuffleMode(prev => !prev)} onToggleRepeat={() => { const modes: Array<'none' | 'one' | 'all'> = ['none','one','all']; setRepeatMode(modes[(modes.indexOf(repeatMode)+1)%3]); }} onToggleFavorite={() => toggleFavorite(currentTrack.id)} onClose={() => setIsPlayerExpanded(false)} onSelectTrack={(t) => { setCurrentTrack(t); setIsPlaying(true); }} />}
    </div>
  );
};

export default App;
