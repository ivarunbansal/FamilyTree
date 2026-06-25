import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMembers } from '../firebase/firestore';
import type { FamilyMember } from '../types';
import { debounce } from '../utils/helpers';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FamilyMember[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const doSearch = debounce(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const res = await searchMembers(q);
    setResults(res);
    setOpen(true);
  }, 300);

  useEffect(() => {
    doSearch(query);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectMember = (id: string) => {
    setOpen(false);
    setQuery('');
    navigate(`/profile/${id}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search by name, phone, email, occupation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
          {results.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMember(m.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              {m.photo ? (
                <img
                  src={m.photo}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-xs font-bold">
                  {m.firstName[0]}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-white">
                  {m.firstName} {m.lastName}
                </div>
                <div className="text-xs text-gray-400">
                  {m.occupation || m.email || m.phone || 'Family Member'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
