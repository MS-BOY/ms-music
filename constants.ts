
import { Track, User, Group } from './types';

export const COLORS = {
  primary: '#3B82F6', // Blue
  secondary: '#A855F7', // Purple
  accent: '#22D3EE', // Cyan
  background: '#050505',
  glass: 'rgba(255, 255, 255, 0.05)',
};

export const SAMPLE_TRACKS: Track[] = [];

export const CURRENT_USER: User = {
  id: 'user-1',
  name: 'Alex Rivera',
  avatar: 'https://picsum.photos/seed/alex/200/200',
  bio: 'Music enthusiast & tech explorer.'
};

export const MS_GROUP: Group = {
  id: 'group-1',
  name: 'MS Music Global',
  photo: 'https://picsum.photos/seed/group/400/400',
  description: 'The official MS Music community for sharing beats and vibes.',
  members: [
    CURRENT_USER,
    { id: 'u2', name: 'Sarah J.', avatar: 'https://picsum.photos/seed/sarah/200/200' },
    { id: 'u3', name: 'Marco V.', avatar: 'https://picsum.photos/seed/marco/200/200' },
    { id: 'u4', name: 'Lena K.', avatar: 'https://picsum.photos/seed/lena/200/200' },
  ],
  admins: ['user-1']
};
