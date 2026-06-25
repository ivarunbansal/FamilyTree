import { useState, useEffect, useCallback } from 'react';
import type { FamilyMember, AppStats } from '../types';
import { subscribeMembers } from '../firebase/firestore';
import { getAge, getSurname } from '../utils/helpers';

export function useMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AppStats>({
    totalMembers: 0,
    totalGenerations: 0,
    totalCities: 0,
    totalSurnames: 0,
    maleCount: 0,
    femaleCount: 0,
    livingCount: 0,
    deceasedCount: 0,
  });

  useEffect(() => {
    const unsub = subscribeMembers((data) => {
      setMembers(data);
      computeStats(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const computeStats = useCallback((data: FamilyMember[]) => {
    const cities = new Set(data.map((m) => m.address).filter(Boolean));
    const surnames = new Set(data.map((m) => getSurname(m.lastName)).filter(Boolean));
    const generations = new Set(
      data.map((m) => {
        if (!m.fatherId && !m.motherId) return 1;
        let gen = 1;
        let currentId = m.fatherId || m.motherId;
        const visited = new Set<string>();
        while (currentId) {
          const parent = data.find((x) => x.id === currentId);
          if (!parent || visited.has(currentId)) break;
          visited.add(currentId);
          gen++;
          currentId = parent.fatherId || parent.motherId || '';
        }
        return gen;
      })
    );

    setStats({
      totalMembers: data.length,
      totalGenerations: generations.size,
      totalCities: cities.size,
      totalSurnames: surnames.size,
      maleCount: data.filter((m) => m.gender === 'Male').length,
      femaleCount: data.filter((m) => m.gender === 'Female').length,
      livingCount: data.filter((m) => m.isLiving).length,
      deceasedCount: data.filter((m) => !m.isLiving).length,
    });
  }, []);

  const getMember = useCallback(
    (id: string) => members.find((m) => m.id === id) || null,
    [members]
  );

  const getParents = useCallback(
    (memberId: string) =>
      members.filter((m) => {
        const member = members.find((x) => x.id === memberId);
        return member && (m.id === member.fatherId || m.id === member.motherId);
      }),
    [members]
  );

  const getChildren = useCallback(
    (memberId: string) =>
      members.filter(
        (m) => m.fatherId === memberId || m.motherId === memberId
      ),
    [members]
  );

  const getSpouses = useCallback(
    (memberId: string) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return [];
      return members.filter((m) => member.spouseIds.includes(m.id));
    },
    [members]
  );

  return {
    members,
    loading,
    stats,
    getMember,
    getParents,
    getChildren,
    getSpouses,
  };
}
