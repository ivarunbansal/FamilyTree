import { useNavigate } from 'react-router-dom';
import type { FamilyMember } from '../types';

interface MemberCardProps {
  member: FamilyMember;
  scale?: number;
}

export function MemberCard({ member, scale = 1 }: MemberCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/profile/${member.id}`)}
      className="group cursor-pointer"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="w-[200px] rounded-xl border border-white/10 bg-[#0f172a] shadow-xl overflow-hidden transition-all duration-200 hover:border-purple-500/50 hover:shadow-purple-500/20 hover:-translate-y-1">
        <div className="h-28 bg-gradient-to-br from-purple-500/20 to-teal-500/10 flex items-center justify-center pt-4">
          <div className="relative">
            {member.photo ? (
              <img
                src={member.photo}
                alt={`${member.firstName} ${member.lastName}`}
                className="w-14 h-14 rounded-full object-cover border-2 border-white/60"
                loading="lazy"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white font-bold text-lg border-2 border-white/60">
                {member.firstName[0]}
              </div>
            )}
            {!member.isLiving && (
              <div className="absolute -bottom-1 -right-1 bg-gray-900 border border-gray-600 rounded-full px-1.5 py-0.5 text-[10px] text-gray-400">
                RIP
              </div>
            )}
          </div>
        </div>

        <div className="p-3 pt-2">
          <div className="text-sm font-semibold text-white truncate">
            {member.firstName} {member.lastName}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5 space-y-0.5">
            {member.birthDate && (
              <div>{member.birthDate}</div>
            )}
            {member.occupation && (
              <div className="truncate">{member.occupation}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
