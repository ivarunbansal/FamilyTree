import type { FamilyMember, MemberFormData } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateMember(
  data: MemberFormData,
  existingMembers: FamilyMember[],
  editingId?: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (!data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const duplicate = existingMembers.find(
    (m) => getFullName(m) === fullName && m.id !== editingId
  );
  if (duplicate) {
    errors.push({ field: 'firstName', message: 'A member with this name already exists' });
  }

  if (data.fatherId && data.fatherId === editingId) {
    errors.push({ field: 'fatherId', message: 'A person cannot be their own father' });
  }

  if (data.motherId && data.motherId === editingId) {
    errors.push({ field: 'motherId', message: 'A person cannot be their own mother' });
  }

  if (data.spouseIds.includes(editingId || '')) {
    errors.push({ field: 'spouseIds', message: 'A person cannot be their own spouse' });
  }

  if (data.fatherId && data.motherId && data.fatherId === data.motherId) {
    errors.push({ field: 'motherId', message: 'Father and mother cannot be the same person' });
  }

  if (data.fatherId) {
    const father = existingMembers.find((m) => m.id === data.fatherId);
    if (father && father.gender === 'Female') {
      errors.push({ field: 'fatherId', message: 'Father must be male' });
    }
  }

  if (data.motherId) {
    const mother = existingMembers.find((m) => m.id === data.motherId);
    if (mother && mother.gender === 'Male') {
      errors.push({ field: 'motherId', message: 'Mother must be female' });
    }
  }

  if (data.spouseIds.length > 0) {
    for (const spouseId of data.spouseIds) {
      const spouse = existingMembers.find((m) => m.id === spouseId);
      if (spouse && spouse.gender === data.gender) {
        errors.push({ field: 'spouseIds', message: 'Spouse must be of opposite gender' });
        break;
      }
    }
  }

  if (data.birthDate && data.deathDate && data.isLiving) {
    errors.push({ field: 'isLiving', message: 'Living members cannot have a death date' });
  }

  return errors;
}

export function checkCircularRelationship(
  memberId: string,
  parentId: string,
  members: FamilyMember[]
): boolean {
  let current = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === memberId) return true;
    if (visited.has(current)) break;
    visited.add(current);
    const parent = members.find((m) => m.id === current);
    if (!parent) break;
    if (visited.has(parent.fatherId)) break;
    current = parent.fatherId || parent.motherId || '';
  }
  return false;
}

function getFullName(member: FamilyMember): string {
  return `${member.firstName} ${member.lastName}`.trim();
}
