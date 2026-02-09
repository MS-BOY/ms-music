import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Upload, X, ChevronLeft, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Track } from '../types';

interface Props {
  onUploadSuccess: (track: Track) => void;
  onCancel: () => void;
  hasPlayer?: boolean;
}

// NOTE: In a production app, these should be in environment variables
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/dw3oixfbg/auto/upload";
const CLOUDINARY_PRESET = "profile"; 

const UploadMusicScreen: React.FC<Props> = ({ onUploadSuccess, onCancel, hasPlayer }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [albumArtFile, setAlbumArtFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const artInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.includes('audio')) {
        setErrorMsg('Please select a valid audio file (MP3/WAV)');
        return;
      }
      setFile(selectedFile);
      setErrorMsg('');
      
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName);
    }
  };

  const handleArtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setAlbumArtFile(selectedFile);
      setAlbumArt(URL.createObjectURL(selectedFile));
    }
  };

  const uploadToCloudinary = async (fileToUpload: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_UPLOAD_URL, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          if (fileToUpload.type.includes('audio')) {
             setProgress(percentComplete);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error?.message || 'Cloudinary upload failed'));
          } catch (e) {
            reject(new Error('Cloudinary upload failed'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    
    const user = auth.currentUser;
    if (!user) {
      setErrorMsg("You must be logged in to upload music.");
      return;
    }

    setUploading(true);
    setStatus('uploading');
    setProgress(0);

    try {
      let finalArtUrl = albumArt || `https://picsum.photos/seed/${Date.now()}/500/500`;
      if (albumArtFile) {
        finalArtUrl = await uploadToCloudinary(albumArtFile);
      }

      const audioUrl = await uploadToCloudinary(file);

      const trackData = {
        title,
        artist: artist || user.displayName || 'Unknown Artist',
        description,
        albumArt: finalArtUrl,
        audioUrl,
        uploadedBy: user.uid,
        uploaderName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        duration: 0,
        likes: [],
        playCount: 0
      };

      const docRef = await addDoc(collection(db, "tracks"), trackData);

      const newTrack: Track = {
        id: docRef.id,
        title: trackData.title,
        artist: trackData.artist,
        albumArt: trackData.albumArt,
        audioUrl: trackData.audioUrl,
        duration: 0,
        isFavorite: false,
        lastPlayed: Date.now()
      };

      setStatus('success');
      setTimeout(() => {
        onUploadSuccess(newTrack);
      }, 1500);

    } catch (err: any) {
      console.error("Upload Error:", err);
      setStatus('error');
      setErrorMsg(err.message || 'Upload failed. Check your internet connection.');
      setUploading(false);
    }
  };

  // Zero margin docking logic
  const headerStickyTop = hasPlayer ? 'top-[72px]' : 'top-0';
  const mainContentPadding = hasPlayer ? 'pt-[144px]' : 'pt-[72px]';

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] overflow-y-auto no-scrollbar">
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />

      {/* Fixed Header positioned relative to Anchor Card at top-[72px] */}
      <header className={`fixed left-0 right-0 h-[72px] z-[90] glass bg-black/60 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-[40px] transition-all duration-500 ${headerStickyTop}`}>
        <button onClick={onCancel} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-black font-outfit uppercase tracking-tighter">Upload Music</h1>
        <div className="w-10" />
      </header>

      {/* Main content with dynamic padding */}
      <main className={`relative z-10 px-6 pb-32 transition-all duration-500 ${mainContentPadding}`}>
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass rounded-[40px] p-8 border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 blur-[80px] rounded-full" />
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] mb-4">
              <Music size={36} className="text-white drop-shadow-glow" />
            </div>
            <h2 className="text-2xl font-black font-outfit">MS Studio</h2>
            <p className="text-white/40 text-sm mt-1">Publish your beats to the world</p>
          </div>

          <div className="space-y-8">
            <div 
              onClick={() => audioInputRef.current?.click()}
              className={`relative group cursor-pointer border-2 border-dashed transition-all duration-300 rounded-[32px] p-10 flex flex-col items-center justify-center text-center
                ${file ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
              `}
            >
              <input 
                type="file" 
                ref={audioInputRef} 
                onChange={handleFileSelect} 
                accept="audio/*" 
                className="hidden" 
              />
              
              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.div 
                    key="idle"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                  >
                    <div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload size={28} className="text-white/60 group-hover:text-white" />
                    </div>
                    <p className="font-bold text-white/60">Tap or Drag Audio File</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/20 mt-2">MP3, WAV up to 20MB</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="selected"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={28} className="text-blue-400" />
                    </div>
                    <p className="font-bold text-blue-400 truncate max-w-[200px]">{file.name}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); }}
                      className="mt-4 px-4 py-1.5 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors"
                    >
                      Change File
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2 block">Music Title</label>
                <div className="glass rounded-2xl border border-white/5 p-1 group-focus-within:border-blue-500/50 transition-all">
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g. Midnight City"
                    className="w-full h-12 bg-transparent px-4 outline-none text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2 block">Artist Name</label>
                <div className="glass rounded-2xl border border-white/5 p-1 group-focus-within:border-blue-500/50 transition-all">
                  <input 
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder={auth.currentUser?.displayName || "Unknown Artist"}
                    className="w-full h-12 bg-transparent px-4 outline-none text-white placeholder:text-white/20"
                  />
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2 block">Album Art</label>
                  <div 
                    onClick={() => artInputRef.current?.click()}
                    className="aspect-square glass rounded-3xl border border-white/5 overflow-hidden group cursor-pointer relative"
                  >
                    <input 
                      type="file" 
                      ref={artInputRef} 
                      onChange={handleArtSelect} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    {albumArt ? (
                      <img src={albumArt} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                        <ImageIcon size={32} />
                        <span className="text-[10px] font-bold mt-2 uppercase">Select Art</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Plus size={24} />
                    </div>
                  </div>
                </div>
                <div className="flex-[2]">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2 block">Description</label>
                   <div className="glass rounded-3xl border border-white/5 p-4 min-h-[140px]">
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us about your masterpiece..."
                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/20 resize-none h-24"
                      />
                   </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3"
                >
                  <AlertCircle size={20} className="text-red-500" />
                  <p className="text-xs font-bold text-red-500">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-4">
              <AnimatePresence mode="wait">
                {status === 'idle' || status === 'error' ? (
                  <motion.button
                    key="btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!file || !title}
                    onClick={handleUpload}
                    className={`w-full h-16 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all
                      ${(!file || !title) ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white text-black shadow-[0_15px_35px_rgba(255,255,255,0.2)]'}
                    `}
                  >
                    <Upload size={24} />
                    Publish Track
                  </motion.button>
                ) : status === 'uploading' ? (
                  <motion.div 
                    key="progress"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/40">
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                        Uploading to Cloud...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                      />
                    </div>
                    <div className="flex justify-center">
                       <button onClick={() => setStatus('idle')} className="text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors">Cancel Upload</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="success"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/20 border border-emerald-500/40 p-6 rounded-[32px] flex flex-col items-center gap-2"
                  >
                    <CheckCircle size={40} className="text-emerald-400" />
                    <p className="font-black text-emerald-400">Track Published Successfully!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default UploadMusicScreen;