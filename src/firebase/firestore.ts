import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { FamilyMember, MemberFormData, UserProfile, Photo } from '../types';
import { generateId } from '../utils/helpers';

const MEMBERS_COL = 'members';
const USERS_COL = 'users';
const PHOTOS_COL = 'photos';

const PAGE_SIZE = 50;

export async function getMembers(
  lastDoc?: DocumentSnapshot,
  pageSize: number = PAGE_SIZE
): Promise<{ members: FamilyMember[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const q = query(collection(db, MEMBERS_COL), ...constraints);
  const snap = await getDocs(q);
  const members = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FamilyMember));
  return { members, lastDoc: snap.docs[snap.docs.length - 1] || null };
}

export async function getAllMembers(): Promise<FamilyMember[]> {
  const q = query(collection(db, MEMBERS_COL), orderBy('firstName', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FamilyMember));
}

export function subscribeMembers(callback: (members: FamilyMember[]) => void): () => void {
  const q = query(collection(db, MEMBERS_COL), orderBy('firstName', 'asc'));
  return onSnapshot(q, (snap) => {
    const members = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FamilyMember));
    callback(members);
  });
}

export async function getMember(id: string): Promise<FamilyMember | null> {
  const snap = await getDoc(doc(db, MEMBERS_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FamilyMember;
}

export async function addMember(
  data: MemberFormData,
  userId: string
): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();
  const member: FamilyMember = {
    id,
    ...data,
    childrenIds: [],
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };
  await setDoc(doc(db, MEMBERS_COL, id), member);

  if (data.fatherId) {
    const fatherRef = doc(db, MEMBERS_COL, data.fatherId);
    const fatherSnap = await getDoc(fatherRef);
    if (fatherSnap.exists()) {
      const childrenIds = fatherSnap.data().childrenIds || [];
      if (!childrenIds.includes(id)) {
        await updateDoc(fatherRef, { childrenIds: [...childrenIds, id] });
      }
    }
  }

  if (data.motherId) {
    const motherRef = doc(db, MEMBERS_COL, data.motherId);
    const motherSnap = await getDoc(motherRef);
    if (motherSnap.exists()) {
      const childrenIds = motherSnap.data().childrenIds || [];
      if (!childrenIds.includes(id)) {
        await updateDoc(motherRef, { childrenIds: [...childrenIds, id] });
      }
    }
  }

  for (const spouseId of data.spouseIds) {
    const spouseRef = doc(db, MEMBERS_COL, spouseId);
    const spouseSnap = await getDoc(spouseRef);
    if (spouseSnap.exists()) {
      const spouseIds = spouseSnap.data().spouseIds || [];
      if (!spouseIds.includes(id)) {
        await updateDoc(spouseRef, { spouseIds: [...spouseIds, id] });
      }
    }
  }

  return id;
}

export async function updateMember(
  id: string,
  data: Partial<MemberFormData>
): Promise<void> {
  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await updateDoc(doc(db, MEMBERS_COL, id), updateData);
}

export async function deleteMember(id: string): Promise<void> {
  const memberSnap = await getDoc(doc(db, MEMBERS_COL, id));
  if (!memberSnap.exists()) return;
  const member = memberSnap.data() as FamilyMember;

  const batch = writeBatch(db);

  if (member.fatherId) {
    const fatherRef = doc(db, MEMBERS_COL, member.fatherId);
    const fatherSnap = await getDoc(fatherRef);
    if (fatherSnap.exists()) {
      const childrenIds = (fatherSnap.data().childrenIds || []).filter(
        (cid: string) => cid !== id
      );
      batch.update(fatherRef, { childrenIds });
    }
  }

  if (member.motherId) {
    const motherRef = doc(db, MEMBERS_COL, member.motherId);
    const motherSnap = await getDoc(motherRef);
    if (motherSnap.exists()) {
      const childrenIds = (motherSnap.data().childrenIds || []).filter(
        (cid: string) => cid !== id
      );
      batch.update(motherRef, { childrenIds });
    }
  }

  for (const spouseId of member.spouseIds) {
    const spouseRef = doc(db, MEMBERS_COL, spouseId);
    const spouseSnap = await getDoc(spouseRef);
    if (spouseSnap.exists()) {
      const spouseIds = (spouseSnap.data().spouseIds || []).filter(
        (sid: string) => sid !== id
      );
      batch.update(spouseRef, { spouseIds });
    }
  }

  batch.delete(doc(db, MEMBERS_COL, id));
  await batch.commit();
}

export async function getUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, USERS_COL));
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS_COL, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function addPhoto(
  memberId: string,
  url: string,
  name: string,
  userId: string
): Promise<string> {
  const id = generateId();
  const photo: Photo = {
    id,
    memberId,
    url,
    name,
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
  };
  await setDoc(doc(db, PHOTOS_COL, id), photo);
  return id;
}

export async function getPhotos(memberId: string): Promise<Photo[]> {
  const q = query(
    collection(db, PHOTOS_COL),
    orderBy('uploadedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Photo).filter((p) => p.memberId === memberId);
}

export async function deletePhoto(photoId: string): Promise<void> {
  await deleteDoc(doc(db, PHOTOS_COL, photoId));
}

export async function searchMembers(queryStr: string): Promise<FamilyMember[]> {
  const q = query(
    collection(db, MEMBERS_COL),
    orderBy('firstName', 'asc')
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FamilyMember));
  const lower = queryStr.toLowerCase();
  return all.filter(
    (m) =>
      m.firstName.toLowerCase().includes(lower) ||
      m.lastName.toLowerCase().includes(lower) ||
      m.phone?.toLowerCase().includes(lower) ||
      m.email?.toLowerCase().includes(lower) ||
      m.occupation?.toLowerCase().includes(lower)
  );
}

export async function updateMemberPhoto(memberId: string, photoUrl: string): Promise<void> {
  await updateDoc(doc(db, MEMBERS_COL, memberId), {
    photo: photoUrl,
    updatedAt: new Date().toISOString(),
  });
}
