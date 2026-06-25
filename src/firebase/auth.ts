import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { auth } from './config';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { UserProfile } from '../types';

const googleProvider = new GoogleAuthProvider();

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(result.user);
  return result.user;
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const existing = await getUserProfile(result.user.uid);
  if (!existing) {
    await createUserProfile(result.user);
  }
  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function createUserProfile(user: User): Promise<void> {
  const docRef = doc(db, 'users', user.uid);
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL || '',
    role: 'member',
    approved: false,
    createdAt: new Date().toISOString(),
  };
  await setDoc(docRef, profile);
}

export async function updateUserRole(uid: string, role: 'admin' | 'member'): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await setDoc(docRef, { role }, { merge: true });
}

export async function approveUser(uid: string): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await setDoc(docRef, { approved: true }, { merge: true });
}
