import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence, type Variants } from 'framer-motion';
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

/* -------------------- FPS DETECTOR -------------------- */
function useLowEndDevice() {
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    let frames = 0;
    let start = performance.now();

    const measure = () => {
      frames++;
      if (performance.now() - start < 1000) {
        requestAnimationFrame(measure);
      } else {
        setLowEnd(frames < 50);
      }
    };

    requestAnimationFrame(measure);
  }, []);

  return lowEnd;
}

/* -------------------- GPU SAFE ANIMATION -------------------- */
const screenVariants: Variants = {
  initial: (lowEnd: boolean) => ({
    opacity: 0,
    y: lowEnd ? 8 : 16
  }),
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 }
  }
};

const App: React.FC = () => {
  const lowEnd = useLowEndDevice();

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

  /* -------------------- AUTH -------------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
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
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(audio.duration || 0);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    audio.addEventListener('ended', () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrack();
      }
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [repeatMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.pause();
    audio.src = currentTrack.audioUrl;
    audio.load();
    if (isPlaying) audio.play().catch(() => {});
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
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

  const navigateTo = useCallback((screen: Screen) => {
    if (!currentUser && ['chat', 'profile', 'upload', 'settings'].includes(screen)) {
      setTargetScreen(screen);
      setCurrentScreen('auth');
    } else {
      setCurrentScreen(screen);
    }
  }, [currentUser]);

  const showBottomNav = ['home', 'library'].includes(currentScreen);
  const showMiniPlayer =
    Boolean(currentTrack && !isPlayerExpanded && !['auth', 'splash'].includes(currentScreen));

  /* -------------------- RENDER -------------------- */
  return (
    <LazyMotion features={domAnimation}>
      <div className="relative w-full min-h-[100dvh] bg-[#020202] text-white overflow-x-hidden">
        {/* BACKGROUND (LOW END SAFE) */}
        {!lowEnd && (
          <div className="pointer-events-none fixed inset-0 z-0">
            <div className="absolute -top-[30%] -left-[20%] w-[120vw] h-[120vw] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_60%)] blur-[120px]" />
            <div className="absolute top-[20%] -right-[30%] w-[100vw] h-[100vw] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.1)_0%,transparent_60%)] blur-[120px]" />
          </div>
        )}

        <AnimatePresence mode="wait">
          <m.div
            key={currentScreen}
            variants={screenVariants}
            custom={lowEnd}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
            className="relative z-10 w-full min-h-[100dvh]"
          >
            {{
              splash: <SplashScreen onFinish={() => setCurrentScreen('home')} />,
              auth: <AuthScreen onLogin={() => {}} onCancel={() => setCurrentScreen('home')} />,
              home: <HomeScreen tracks={userTracks} user={currentUser} onSelectTrack={setCurrentTrack} onNavigateProfile={() => navigateTo('profile')} onSeeAll={() => navigateTo('library')} hasPlayer={showMiniPlayer} />,
              library: <LibraryScreen tracks={userTracks} onSelectTrack={setCurrentTrack} onUploadRequest={() => navigateTo('upload')} hasPlayer={showMiniPlayer} />,
              upload: <UploadMusicScreen onUploadSuccess={() => setCurrentScreen('library')} onCancel={() => navigateTo('library')} hasPlayer={showMiniPlayer} />,
              chat: <ChatScreen tracks={userTracks} onSelectTrack={setCurrentTrack} onBack={() => setCurrentScreen('home')} onSettings={() => navigateTo('settings')} hasPlayer={showMiniPlayer} />,
              profile: <ProfileScreen user={currentUser} onBack={() => setCurrentScreen('home')} onLogout={() => signOut(auth)} hasPlayer={showMiniPlayer} />,
              settings: <SettingsScreen onBack={() => setCurrentScreen('chat')} onLogout={() => signOut(auth)} hasPlayer={showMiniPlayer} />
            }[currentScreen]}
          </m.div>
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
            onSeek={t => audioRef.current && (audioRef.current.currentTime = t)}
            onToggleShuffle={() => setShuffleMode(p => !p)}
            onToggleRepeat={() =>
              setRepeatMode(m => (m === 'none' ? 'one' : m === 'one' ? 'all' : 'none'))
            }
            onClose={() => setIsPlayerExpanded(false)}
            onSelectTrack={setCurrentTrack}
          />
        )}
      </div>
    </LazyMotion>
  );
};

export default App;
