
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Library, MessageSquare } from 'lucide-react';
import { Screen } from '../types';

interface Props {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const BottomNav: React.FC<Props> = ({ currentScreen, onNavigate }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'library', icon: Library, label: 'Library' },
    { id: 'chat', icon: MessageSquare, label: 'Messages' },
  ];

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-gradient-to-t from-black to-transparent pointer-events-none"
    >
      <div className="glass h-16 rounded-full max-w-md mx-auto flex items-center justify-around px-4 border border-white/10 shadow-2xl pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = currentScreen === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id as Screen)}
              className="relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors"
            >
              <motion.div
                animate={isActive ? { scale: 1.2, color: '#3B82F6' } : { scale: 1, color: 'rgba(255,255,255,0.4)' }}
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
  );
};

export default BottomNav;
