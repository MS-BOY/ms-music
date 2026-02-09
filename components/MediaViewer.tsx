import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Download } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface Props {
  items: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const MediaViewer: React.FC<Props> = ({ items, initialIndex, isOpen, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);

  // Move hooks to top level to avoid React Error #310 (Hook mismatch)
  const dragY = useMotionValue(0);
  const opacity = useTransform(dragY, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(dragY, [-200, 0, 200], [0.9, 1, 0.9]);

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index < items.length - 1) setIndex(index + 1);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (index > 0) setIndex(index - 1);
  };

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.y) > 150) {
      onClose();
    }
  };

  // Safe access to media
  const currentMedia = items && items.length > 0 ? items[index] : null;

  return (
    <AnimatePresence>
      {isOpen && currentMedia && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
          onClick={() => setShowControls(!showControls)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ y: dragY, opacity, scale }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              className="relative w-full h-full flex items-center justify-center touch-none"
            >
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  autoPlay
                  loop
                  controls
                  className="max-w-full max-h-screen object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={currentMedia.url}
                  alt="Preview"
                  className="max-w-full max-h-screen object-contain select-none"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {showControls && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 pointer-events-none"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white pointer-events-auto transition-colors"
                  >
                    <X size={24} />
                  </button>
                  <div className="flex gap-3 pointer-events-auto">
                    <button className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors">
                      <Download size={20} />
                    </button>
                  </div>
                </motion.div>

                {items.length > 1 && (
                  <>
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: index > 0 ? 1 : 0, x: 0 }}
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white"
                      style={{ pointerEvents: index > 0 ? 'auto' : 'none' }}
                    >
                      <ChevronLeft size={32} />
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: index < items.length - 1 ? 1 : 0, x: 0 }}
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white"
                      style={{ pointerEvents: index < items.length - 1 ? 'auto' : 'none' }}
                    >
                      <ChevronRight size={32} />
                    </motion.button>
                  </>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-10 inset-x-0 flex justify-center pointer-events-none"
                >
                   <span className="px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-white/80">
                    {index + 1} / {items.length}
                   </span>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaViewer;