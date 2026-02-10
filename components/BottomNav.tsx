import React, { useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Home, Library, MessageSquare } from 'lucide-react';
import { Screen } from '../types';
import { useDrag } from '@use-gesture/react';

interface Props {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<Props> = ({ currentScreen, onNavigate }) => {
  const tabs: Array<{ id: Screen; icon: any; label: string }> = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'chat', icon: MessageSquare, label: 'Messages' },
  ];

  const controls = useAnimation();
  const navRef = useRef<HTMLDivElement>(null);

  // Swipe left/right gesture to navigate
  useDrag(
    ({ movement: [mx], direction: [dx], velocity, active }) => {
      if (!active && Math.abs(mx) > 50 && velocity > 0.2) {
        const currentIndex = tabs.findIndex((t) => t.id === currentScreen);
        if (dx < 0) {
          // Swipe left → next tab
          const nextIndex = (currentIndex + 1) % tabs.length;
          onNavigate(tabs[nextIndex].id);
        } else if (dx > 0) {
          // Swipe right → prev tab
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          onNavigate(tabs[prevIndex].id);
        }
      }
    },
    {
      target: navRef,
      axis: 'x',
      pointer: { touch: true },
    }
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={navRef}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 150 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe-bottom pt-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"
      >
        <div className="glass h-16 rounded-full max-w-md mx-auto flex items-center justify-around px-4 border border-white/10 shadow-2xl pointer-events-auto">
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-transform"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.2 : 1,
                    color: isActive ? '#3B82F6' : 'rgba(255,255,255,0.4)',
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <Icon size={24} />
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_#3B82F6]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BottomNav;
