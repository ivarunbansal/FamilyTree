import { useState, useRef } from 'react';
import { updateMemberPhoto } from '../firebase/firestore';
import { isValidPhotoUrl } from '../firebase/storage';

interface ImageUploadProps {
  memberId: string;
  currentPhoto: string;
  onPhotoChange: (url: string) => void;
}

export function ImageUpload({ memberId, currentPhoto, onPhotoChange }: ImageUploadProps) {
  const [url, setUrl] = useState(currentPhoto || '');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlSave = async () => {
    if (!url.trim()) return;
    if (!isValidPhotoUrl(url)) {
      setError('Invalid URL');
      return;
    }
    setError('');
    await updateMemberPhoto(memberId, url.trim());
    onPhotoChange(url.trim());
  };

  const handleFileAsBase64 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setError('Image too large. Max 500KB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setUrl(dataUrl);
      setPreview(dataUrl);
      await updateMemberPhoto(memberId, dataUrl);
      onPhotoChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const displaySrc = preview || currentPhoto || url;

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="relative">
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-purple-500/50"
            onError={() => setPreview('')}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white font-bold text-3xl border-2 border-purple-500/50">
            ?
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <div className="w-full space-y-2">
        <p className="text-xs text-gray-400 text-center">
          Paste a photo URL or upload an image (max 500KB)
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-purple-500/50"
          />
          <button
            type="button"
            onClick={handleUrlSave}
            disabled={!url.trim()}
            className="px-3 py-2 rounded-lg bg-purple-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            Set
          </button>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
          >
            Or upload from computer
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileAsBase64}
        className="hidden"
      />
    </div>
  );
}
