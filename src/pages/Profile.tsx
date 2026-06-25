import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMember, getPhotos, getAllMembers } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import type { FamilyMember, Photo } from '../types';
import { getAge } from '../utils/helpers';

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    getMember(id).then(setMember);
    getPhotos(id).then(setPhotos);
    getAllMembers().then(setAllMembers);
  }, [id]);

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const parents = allMembers.filter(
    (m) => m.id === member.fatherId || m.id === member.motherId
  );
  const spouses = allMembers.filter((m) => member.spouseIds.includes(m.id));
  const children = allMembers.filter(
    (m) => m.fatherId === member.id || m.motherId === member.id
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/tree')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Tree
      </button>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-teal-500/10 relative">
          <div className="absolute -bottom-16 left-8">
            {member.photo ? (
              <img
                src={member.photo}
                alt={`${member.firstName} ${member.lastName}`}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-900 shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white font-bold text-4xl border-4 border-gray-900 shadow-xl">
                {member.firstName[0]}
              </div>
            )}
          </div>
        </div>

        <div className="pt-20 pb-6 px-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {member.firstName} {member.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                {member.isLiving ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                    Living
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                    Deceased
                  </span>
                )}
                {member.gender && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {member.gender}
                  </span>
                )}
                {member.birthDate && (
                  <span className="text-sm text-gray-400">
                    {getAge(member.birthDate, member.deathDate)} years old
                  </span>
                )}
              </div>
            </div>
            {isAdmin && (
              <Link
                to={`/dashboard?edit=${member.id}`}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mt-8">
            {member.birthDate && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Date of Birth</div>
                <div className="text-sm text-white mt-1">{member.birthDate}</div>
              </div>
            )}
            {member.deathDate && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Date of Death</div>
                <div className="text-sm text-white mt-1">{member.deathDate}</div>
              </div>
            )}
            {member.occupation && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Occupation</div>
                <div className="text-sm text-white mt-1">{member.occupation}</div>
              </div>
            )}
            {member.education && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Education</div>
                <div className="text-sm text-white mt-1">{member.education}</div>
              </div>
            )}
            {member.email && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</div>
                <div className="text-sm text-white mt-1">{member.email}</div>
              </div>
            )}
            {member.phone && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</div>
                <div className="text-sm text-white mt-1">{member.phone}</div>
              </div>
            )}
            {member.address && (
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Address</div>
                <div className="text-sm text-white mt-1">{member.address}</div>
              </div>
            )}
          </div>

          {member.notes && (
            <div className="mt-6">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Notes</div>
              <p className="text-sm text-gray-300 leading-relaxed">{member.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {parents.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Parents</h3>
            <div className="space-y-2">
              {parents.map((p) => (
                <Link
                  key={p.id}
                  to={`/profile/${p.id}`}
                  className="flex items-center gap-2 text-sm text-gray-200 hover:text-purple-300 transition-colors"
                >
                  {p.photo ? (
                    <img src={p.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-xs font-bold">
                      {p.firstName[0]}
                    </div>
                  )}
                  {p.firstName} {p.lastName}
                </Link>
              ))}
            </div>
          </div>
        )}

        {spouses.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Spouses</h3>
            <div className="space-y-2">
              {spouses.map((s) => (
                <Link
                  key={s.id}
                  to={`/profile/${s.id}`}
                  className="flex items-center gap-2 text-sm text-gray-200 hover:text-purple-300 transition-colors"
                >
                  {s.photo ? (
                    <img src={s.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-xs font-bold">
                      {s.firstName[0]}
                    </div>
                  )}
                  {s.firstName} {s.lastName}
                </Link>
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Children</h3>
            <div className="space-y-2">
              {children.map((c) => (
                <Link
                  key={c.id}
                  to={`/profile/${c.id}`}
                  className="flex items-center gap-2 text-sm text-gray-200 hover:text-purple-300 transition-colors"
                >
                  {c.photo ? (
                    <img src={c.photo} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-xs font-bold">
                      {c.firstName[0]}
                    </div>
                  )}
                  {c.firstName} {c.lastName}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Gallery</h2>
          {photos[activePhoto] && (
            <div className="mb-4">
              <img
                src={photos[activePhoto].url}
                alt=""
                className="w-full max-h-96 object-contain rounded-lg bg-black/20"
              />
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePhoto(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activePhoto ? 'border-purple-500' : 'border-transparent'
                }`}
              >
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
