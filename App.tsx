import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

/* -------------------- GPU SAFE SCREEN ANIMATION -------------------- */
const screenVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 1.02,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
  }
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [targetScreen, setTargetScreen] = useState<Screen | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  const [shuffleMode, setShuffleMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(new Audio());

  /* -------------------- AUTH -------------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) {
        setCurrentUser(null);
        setCurrentScreen('home');
        return;
      }

      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists()) return;

      const data = snap.data();
      setCurrentUser({
        id: user.uid,
        name: data.username,
        avatar: data.photoURL || 'https://picsum.photos/200',
        bio: data.bio || 'Music lover'
      });

      setCurrentScreen(targetScreen ?? 'home');
      setTargetScreen(null);
    });
  }, [targetScreen]);

  /* -------------------- TRACKS -------------------- */
  useEffect(() => {
    const q = query(collection(db, 'tracks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setUserTracks(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          isFavorite: false
        })) as Track[]
      );
    });
  }, []);

  /* -------------------- AUDIO ENGINE -------------------- */
  useEffect(() => {
    const audio = audioRef.current;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextTrack();
      }
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;

    audio.pause();
    audio.src = currentTrack.audioUrl;
    audio.load();

    if (isPlaying) audio.play().catch(() => {});
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    isPlaying ? audio.play().catch(() => {}) : audio.pause();
  }, [isPlaying]);

  /* -------------------- CONTROLS -------------------- */
  const nextTrack = useCallback(() => {
    if (!userTracks.length) return;
    const index = currentTrack
      ? userTracks.findIndex(t => t.id === currentTrack.id)
      : 0;

    const next = shuffleMode
      ? Math.floor(Math.random() * userTracks.length)
      : (index + 1) % userTracks.length;

    setCurrentTrack(userTracks[next]);
    setIsPlaying(true);
  }, [currentTrack, userTracks, shuffleMode]);

  const prevTrack = useCallback(() => {
    if (!currentTrack) return;
    const index = userTracks.findIndex(t => t.id === currentTrack.id);
    setCurrentTrack(userTracks[(index - 1 + userTracks.length) % userTracks.length]);
    setIsPlaying(true);
  }, [currentTrack, userTracks]);

  const navigateTo = useCallback(
    (screen: Screen) => {
      if (!currentUser && ['chat', 'profile', 'upload', 'settings'].includes(screen)) {
        setTargetScreen(screen);
        setCurrentScreen('auth');
      } else {
        setCurrentScreen(screen);
      }
    },
    [currentUser]
  );

  const showMiniPlayer =
    Boolean(currentTrack) && !isPlayerExpanded && !['auth', 'splash'].includes(currentScreen);
  const showBottomNav = ['home', 'library'].includes(currentScreen);

  /* -------------------- RENDER -------------------- */
  return (
    <div className="relative w-full min-h-[100dvh] bg-[#020202] text-white overflow-hidden">
      {/* STATIC BACKGROUND (NO ANIMATION = NO LAG) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[30%] -left-[20%] w-[120vw] h-[120vw] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_60%)] blur-[120px]" />
        <div className="absolute top-[20%] -right-[30%] w-[100vw] h-[100vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_60%)] blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative z-10 w-full min-h-[100dvh]"
        >
          {{
            splash: <SplashScreen onFinish={() => setCurrentScreen('home')} />,
            auth: <AuthScreen onLogin={() => {}} onCancel={() => setCurrentScreen('home')} />,
            home: (
              <HomeScreen
                tracks={userTracks}
                user={currentUser}
                onSelectTrack={setCurrentTrack}
                onNavigateProfile={() => navigateTo('profile')}
                onSeeAll={() => navigateTo('library')}
                hasPlayer={showMiniPlayer}
              />
            ),
            library: (
              <LibraryScreen
                tracks={userTracks}
                onSelectTrack={setCurrentTrack}
                onUploadRequest={() => navigateTo('upload')}
                hasPlayer={showMiniPlayer}
              />
            ),
            upload: (
              <UploadMusicScreen
                onUploadSuccess={() => setCurrentScreen('library')}
                onCancel={() => navigateTo('library')}
                hasPlayer={showMiniPlayer}
              />
            ),
            chat: (
              <ChatScreen
                tracks={userTracks}
                onSelectTrack={setCurrentTrack}
                onBack={() => setCurrentScreen('home')}
                onSettings={() => navigateTo('settings')}
                hasPlayer={showMiniPlayer}
              />
            ),
            profile: (
              <ProfileScreen
                user={currentUser}
                onBack={() => setCurrentScreen('home')}
                onLogout={() => signOut(auth)}
                hasPlayer={showMiniPlayer}
              />
            ),
            settings: (
              <SettingsScreen
                onBack={() => setCurrentScreen('chat')}
                onLogout={() => signOut(auth)}
                hasPlayer={showMiniPlayer}
              />
            )
          }[currentScreen]}
        </motion.div>
      </AnimatePresence>

      {showMiniPlayer && (
        <MiniPlayer
          track={currentTrack!}
          isPlaying={isPlaying}
          onToggle={() => setIsPlaying(p => !p)}
          onExpand={() => setIsPlayerExpanded(true)}
          onNext={nextTrack}
          onPrev={prevTrack}
          progress={duration ? (currentTime / duration) * 100 : 0}
        />
      )}

      {showBottomNav && !isPlayerExpanded && (
        <BottomNav currentScreen={currentScreen} onNavigate={navigateTo} />
      )}

      {isPlayerExpanded && currentTrack && (
        <FullPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          shuffleMode={shuffleMode}
          repeatMode={repeatMode}
          tracks={userTracks}
          onToggle={() => setIsPlaying(p => !p)}
          onNext={nextTrack}
          onPrev={prevTrack}
          onSeek={t => (audioRef.current.currentTime = t)}
          onToggleShuffle={() => setShuffleMode(p => !p)}
          onToggleRepeat={() =>
            setRepeatMode(m => (m === 'none' ? 'one' : m === 'one' ? 'all' : 'none'))
          }
          onClose={() => setIsPlayerExpanded(false)}
          onSelectTrack={setCurrentTrack}
        />
      )}
    </div>
  );
};

export default App;
