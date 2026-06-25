export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  birthDate: string;
  deathDate: string;
  isLiving: boolean;
  photo: string;
  fatherId: string;
  motherId: string;
  spouseIds: string[];
  childrenIds: string[];
  phone: string;
  email: string;
  address: string;
  occupation: string;
  education: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MemberFormData {
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  birthDate: string;
  deathDate: string;
  isLiving: boolean;
  fatherId: string;
  motherId: string;
  spouseIds: string[];
  phone: string;
  email: string;
  address: string;
  occupation: string;
  education: string;
  notes: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'member';
  approved: boolean;
  createdAt: string;
}

export interface TreeCouple {
  id: string;
  persons: FamilyMember[];
  children: TreeCouple[];
  parent: TreeCouple | null;
  gen: number;
  virt?: boolean;
}

export interface Photo {
  id: string;
  memberId: string;
  url: string;
  name: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AppStats {
  totalMembers: number;
  totalGenerations: number;
  totalCities: number;
  totalSurnames: number;
  maleCount: number;
  femaleCount: number;
  livingCount: number;
  deceasedCount: number;
}
