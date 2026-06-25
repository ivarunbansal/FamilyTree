// Photo handling via URLs stored in Firestore.
// No Firebase Storage needed — users provide photo URLs directly.

export function isValidPhotoUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getPhotoInitials(firstName: string, lastName: string): string {
  return (firstName[0] || '') + (lastName[0] || '');
}

export function getDefaultAvatar(name: string): string {
  const initial = name.trim()[0] || '?';
  const colors = ['from-purple-400 to-teal-400', 'from-blue-400 to-cyan-400', 'from-pink-400 to-orange-400', 'from-green-400 to-emerald-400'];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[colorIndex];
}
