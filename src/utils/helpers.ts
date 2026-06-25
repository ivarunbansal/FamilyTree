import type { FamilyMember, TreeCouple } from '../types';

export function getFullName(member: FamilyMember): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

export function getSurname(name: string): string {
  return name.trim().split(/\s+/).pop() || '';
}

export function getAge(birthDate: string, deathDate?: string): number {
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function shortestPath(
  startId: string,
  endId: string,
  members: FamilyMember[]
): string[] {
  const graph = new Map<string, Set<string>>();
  members.forEach((m) => {
    if (!graph.has(m.id)) graph.set(m.id, new Set());
    if (m.fatherId && graph.has(m.fatherId)) {
      graph.get(m.id)!.add(m.fatherId);
      graph.get(m.fatherId)!.add(m.id);
    } else if (m.fatherId) {
      graph.set(m.fatherId, new Set([m.id]));
      graph.get(m.id)!.add(m.fatherId);
    }
    if (m.motherId && graph.has(m.motherId)) {
      graph.get(m.id)!.add(m.motherId);
      graph.get(m.motherId)!.add(m.id);
    } else if (m.motherId) {
      graph.set(m.motherId, new Set([m.id]));
      graph.get(m.id)!.add(m.motherId);
    }
    m.spouseIds.forEach((spouseId) => {
      if (graph.has(spouseId)) {
        graph.get(m.id)!.add(spouseId);
        graph.get(spouseId)!.add(m.id);
      } else {
        graph.set(spouseId, new Set([m.id]));
        graph.get(m.id)!.add(spouseId);
      }
    });
  });

  const queue: string[][] = [[startId]];
  const seen = new Set([startId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last === endId) return path;

    const neighbors = graph.get(last);
    if (neighbors) {
      for (const next of neighbors) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push([...path, next]);
        }
      }
    }
  }
  return [];
}

export function buildCouples(members: FamilyMember[]): TreeCouple[] {
  const used = new Set<string>();
  const couples: TreeCouple[] = [];

  members.forEach((m) => {
    if (used.has(m.id)) return;
    if (m.spouseIds.length > 0) {
      const spouse = members.find((s) => m.spouseIds.includes(s.id));
      if (spouse && !used.has(spouse.id)) {
        used.add(m.id);
        used.add(spouse.id);
        couples.push({
          id: `${m.id}_${spouse.id}`,
          persons: [m, spouse],
          children: [],
          parent: null,
          gen: 0,
        });
        return;
      }
    }
    used.add(m.id);
    couples.push({
      id: m.id,
      persons: [m],
      children: [],
      parent: null,
      gen: 0,
    });
  });

  couples.forEach((couple) => {
    couple.persons.forEach((parent) => {
      members.forEach((child) => {
        if (child.fatherId !== parent.id && child.motherId !== parent.id) return;
        const cc = couples.find((c) =>
          c.persons.some((p) => p.id === child.id)
        );
        if (cc && !couple.children.includes(cc)) {
          couple.children.push(cc);
          cc.parent = couple;
        }
      });
    });
  });

  return couples;
}

export function assignGenerations(couples: TreeCouple[]): void {
  const roots = couples.filter((c) => !c.parent);
  const q = roots.map((c) => ({ c, d: 0 }));
  const seen = new Set<string>();

  while (q.length > 0) {
    const item = q.shift()!;
    if (seen.has(item.c.id)) continue;
    seen.add(item.c.id);
    item.c.gen = item.d;
    item.c.children.forEach((ch) => q.push({ c: ch, d: item.d + 1 }));
  }
}

export function getGenerationNumber(member: FamilyMember, members: FamilyMember[]): number {
  let gen = 1;
  let currentId = member.id;
  const visited = new Set<string>();
  while (true) {
    const m = members.find((x) => x.id === currentId);
    if (!m) break;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    if (m.fatherId) {
      currentId = m.fatherId;
      gen++;
    } else if (m.motherId) {
      currentId = m.motherId;
      gen++;
    } else {
      break;
    }
  }
  return gen;
}

export function getRelationship(member: FamilyMember, members: FamilyMember[]): string {
  if (!member.fatherId && !member.motherId) {
    return member.spouseIds.length > 0 ? 'Root Couple' : 'Family Member';
  }
  return 'Child';
}
