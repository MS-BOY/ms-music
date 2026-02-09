
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, User, Lock, Camera, Loader2, AlertCircle, Check, ChevronLeft } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface Props {
  onLogin: () => void;
  onCancel?: () => void;
}

const AuthScreen: React.FC<Props> = ({ onLogin, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    if (!isLogin) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'profile');
    formData.append('cloud_name', 'dw3oixfbg');
    
    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dw3oixfbg/image/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Upload failed');
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary Error:", err);
      throw new Error("Failed to upload profile image.");
    }
  };

  const checkUsernameUnique = async (username: string) => {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleAuth = async () => {
    setError(null);

    // 1. Basic Validation
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!profileFile) {
        setError('Please select a profile image.');
        return;
      }
    }

    setLoading(true);

    try {
      const fakeEmail = `${username.toLowerCase().trim()}@msmusic.app`;

      if (isLogin) {
        // --- LOGIN FLOW ---
        await signInWithEmailAndPassword(auth, fakeEmail, password);
        // App.tsx handles navigation via onAuthStateChanged
      } else {
        // --- SIGNUP FLOW ---
        
        // 2. Check Username Uniqueness
        const isUnique = await checkUsernameUnique(username.trim());
        if (!isUnique) {
          throw new Error("Username is already taken.");
        }

        // 3. Upload Image to Cloudinary
        const photoURL = await uploadToCloudinary(profileFile!);

        // 4. Create Authentication User
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        const user = userCredential.user;

        // 5. Create Firestore Document
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          username: username.trim(),
          photoURL: photoURL,
          createdAt: Date.now()
        });

        // 6. Update Auth Profile
        await updateProfile(user, {
          displayName: username.trim(),
          photoURL: photoURL
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid username or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Username already taken.');
      } else {
        setError(err.message || 'An error occurred.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center h-full w-full px-6 overflow-y-auto no-scrollbar py-6">
      
      {/* Back Button */}
      {onCancel && (
        <div className="w-full flex justify-start mb-4">
          <button 
            onClick={onCancel}
            className="p-3 glass rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass w-full p-8 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col items-center">
            
            {/* Profile Image Upload */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            
            <motion.div 
              layout
              className={`mb-6 relative group ${!isLogin ? 'cursor-pointer' : ''}`}
              onClick={handleImageClick}
            >
              <motion.div 
                animate={{ 
                  width: isLogin ? 80 : 120,
                  height: isLogin ? 80 : 120,
                  borderRadius: isLogin ? 20 : 60
                }}
                className="glass flex items-center justify-center border border-white/10 shadow-xl overflow-hidden relative bg-black/20"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={isLogin ? 32 : 48} className="text-white/40" />
                )}
                
                {!isLogin && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={32} className="text-white" />
                  </div>
                )}
              </motion.div>
              {!isLogin && profileImage && (
                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-2 border-[#050505]">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </motion.div>

            <motion.h2 
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold font-outfit mb-2 text-center"
            >
              {isLogin ? 'Welcome Back' : 'Join MS Music'}
            </motion.h2>
            <p className="text-white/50 text-sm mb-8 text-center">
              {isLogin ? 'Sign in with your username.' : 'Create an account to start listening.'}
            </p>

            <div className="space-y-4 w-full">
              <AuthInput 
                icon={<User size={18} />} 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <AuthInput 
                icon={<Lock size={18} />} 
                placeholder="Password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <AuthInput 
                        icon={<Lock size={18} />} 
                        placeholder="Confirm Password" 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs font-bold"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98, y: 0 }}
              onClick={handleAuth}
              disabled={loading}
              className={`w-full mt-8 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.2)] transition-all ${
                loading ? 'bg-white/50 text-black/50 cursor-not-allowed' : 'bg-white text-black'
              }`}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isLogin ? (
                <LogIn size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              <span>{loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
            </motion.button>

            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="text-white/40 text-sm">
                {isLogin ? "New here?" : "Already have an account?"}
              </span>
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setProfileImage(null);
                  setProfileFile(null);
                  setUsername('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-white/20 text-xs font-medium tracking-[0.2em] uppercase"
        >
          MS Music © 2025
        </motion.div>
      </div>
    </div>
  );
};

const AuthInput: React.FC<{ 
  icon: React.ReactNode, 
  placeholder: string, 
  type?: string,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}> = ({ icon, placeholder, type = "text", value, onChange }) => {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors">
        {icon}
      </div>
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 outline-none focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-blue-500/50 transition-all text-white placeholder:text-white/30 font-medium"
      />
    </div>
  );
};

export default AuthScreen;
