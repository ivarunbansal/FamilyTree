export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const FIRESTORE_COLLECTIONS = {
  MEMBERS: 'members',
  USERS: 'users',
  PHOTOS: 'photos',
} as const;

export const CACHE_KEYS = {
  MEMBERS: 'family-tree-members',
  THEME: 'family-tree-theme',
} as const;

export const APP_NAME = 'Bansal Family Tree';

export const EMPTY_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%239f7aea'/%3E%3Cstop offset='1' stop-color='%232dd4bf'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='160' height='160' rx='80' fill='url(%23g)'/%3E%3Ccircle cx='80' cy='62' r='28' fill='white' fill-opacity='.88'/%3E%3Cpath d='M38 132c8-28 27-43 42-43s34 15 42 43' fill='white' fill-opacity='.88'/%3E%3C/svg%3E";

export const DEFAULT_AVATARS = [
  'from-purple-400 to-teal-400',
  'from-blue-400 to-cyan-400',
  'from-pink-400 to-orange-400',
  'from-green-400 to-emerald-400',
  'from-yellow-400 to-red-400',
  'from-indigo-400 to-purple-400',
];
