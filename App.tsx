import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Screen, Track, User } from './types';

// Screens
import SplashScreen from './screens/SplashScreen';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import LibraryScreen from './screens/LibraryScreen';
import UploadMusicScreen from './screens/UploadMusicScreen';

// Components
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

  // -------------------
  // AUTH & DATA (Optimized)
  // -------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [targetScreen, currentScreen]);

  useEffect(() => {
    const q = query(collection(db, 'tracks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setUserTracks(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isFavorite: false
      } as Track)));
    });
  }, []);

  // -------------------
  // AUDIO LOGIC (Stable Callbacks)
  // -------------------
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

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => repeatMode === 'one' ? (audio.currentTime = 0, audio.play()) : nextTrack();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeatMode, nextTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      audio.load();
    }
    isPlaying ? audio.play().catch(() => {}) : audio.pause();
  }, [currentTrack, isPlaying]);

  // -------------------
  // NAVIGATION & ACTIONS
  // -------------------
  const navigateTo = useCallback((screen: Screen) => {
    const protectedScreens: Screen[] = ['chat', 'profile', 'upload', 'settings'];
    if (!currentUser && protectedScreens.includes(screen)) {
      setTargetScreen(screen);
      setCurrentScreen('auth');
    } else {
      setCurrentScreen(screen);
    }
  }, [currentUser]);

  const toggleFavorite = useCallback((trackId: string) => {
    setUserTracks(prev => prev.map(t => t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t));
  }, []);

  const handleSelectTrack = useCallback((t: Track) => {
    setCurrentTrack(t);
    setIsPlaying(true);
    setIsPlayerExpanded(false);
  }, []);

  // -------------------
  // PERFORMANCE: MEMOIZED SCREEN SWITCHER
  // -------------------
  // This prevents the active screen from re-rendering when 'currentTime' changes!
  const renderedScreen = useMemo(() => {
    const hasPlayer = Boolean(currentTrack && !['splash', 'auth'].includes(currentScreen) && !isPlayerExpanded);
    
    switch (currentScreen) {
      case 'splash': return <SplashScreen onFinish={() => setCurrentScreen('home')} />;
      case 'auth': return <AuthScreen onLogin={() => {}} onCancel={() => { setTargetScreen(null); setCurrentScreen('home'); }} />;
      case 'home': return <HomeScreen tracks={userTracks} user={currentUser} onSelectTrack={handleSelectTrack} onNavigateProfile={() => navigateTo('profile')} onSeeAll={() => navigateTo('library')} hasPlayer={hasPlayer} />;
      case 'library': return <LibraryScreen tracks={userTracks} onSelectTrack={handleSelectTrack} onUploadRequest={() => navigateTo('upload')} onToggleFavorite={toggleFavorite} hasPlayer={hasPlayer} />;
      case 'upload': return <UploadMusicScreen onUploadSuccess={() => navigateTo('library')} onCancel={() => navigateTo('library')} hasPlayer={hasPlayer} />;
      case 'chat': return <ChatScreen tracks={userTracks} onSelectTrack={handleSelectTrack} onBack={() => setCurrentScreen('home')} onSettings={() => navigateTo('settings')} hasPlayer={hasPlayer} />;
      case 'profile': return <ProfileScreen user={currentUser} onBack={() => setCurrentScreen('home')} onLogout={() => signOut(auth)} hasPlayer={hasPlayer} />;
      case 'settings': return <SettingsScreen onBack={() => setCurrentScreen('chat')} onLogout={() => signOut(auth)} hasPlayer={hasPlayer} />;
      default: return null;
    }
  }, [currentScreen, userTracks, currentUser, currentTrack, isPlayerExpanded, handleSelectTrack, navigateTo, toggleFavorite]);

  const showBottomNav = ['home', 'library'].includes(currentScreen);
  const showMiniPlayer = Boolean(currentTrack && !['splash', 'auth'].includes(currentScreen) && !isPlayerExpanded);

  return (
    <div className="relative h-screen w-full bg-[#020202] overflow-hidden text-white transform-gpu">
      {/* Optimized Background: CSS Animations are smoother than requestAnimationFrame for simple rotations */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20 animate-slow-spin pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div 
          key={currentScreen} 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full h-full"
        >
          {renderedScreen}
        </motion.div>
      </AnimatePresence>

      {showMiniPlayer && (
        <MiniPlayer 
          track={currentTrack!} 
          isPlaying={isPlaying} 
          onToggle={togglePlay} 
          onExpand={() => setIsPlayerExpanded(true)} 
          onNext={nextTrack} 
          onPrev={prevTrack} 
          progress={duration > 0 ? (currentTime / duration) * 100 : 0} 
        />
      )}

      {showBottomNav && !isPlayerExpanded && (
        <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
      )}

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
            onSeek={(t) => { if(audioRef.current) audioRef.current.currentTime = t; }} 
            onToggleShuffle={() => setShuffleMode(s => !s)} 
            onToggleRepeat={() => {
              const modes: Array<'none' | 'one' | 'all'> = ['none','one','all'];
              setRepeatMode(modes[(modes.indexOf(repeatMode)+1)%3]);
            }} 
            onToggleFavorite={() => toggleFavorite(currentTrack.id)} 
            onClose={() => setIsPlayerExpanded(false)} 
            onSelectTrack={handleSelectTrack} 
          />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slow-spin {
          from { transform: rotate(0deg) scale(1.5); }
          to { transform: rotate(360deg) scale(1.5); }
        }
        .animate-slow-spin {
          animation: slow-spin 30s linear infinite;
        }
      `}} />
    </div>
  );
};

export default App;
