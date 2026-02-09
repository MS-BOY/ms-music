
export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  audioUrl: string;
  duration: number;
  isFavorite?: boolean;
  lastPlayed?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  reactions?: string[];
  type: 'text' | 'image' | 'audio' | 'music' | 'video' | 'image-grid';
  attachments?: string[]; // For multiple images
  isUnsent?: boolean;
  isEdited?: boolean;
  uploadProgress?: number; // 0 to 100
  status?: 'sending' | 'sent' | 'error';
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    type?: 'text' | 'image' | 'audio' | 'music' | 'video' | 'image-grid';
  };
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
}

export interface Group {
  id: string;
  name: string;
  photo: string;
  description: string;
  members: User[];
  admins: string[];
}

export type Screen = 'splash' | 'auth' | 'home' | 'library' | 'chat' | 'settings' | 'profile' | 'upload';
