import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";

const googleProvider = new GoogleAuthProvider();

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  // Email sign-up has no name of its own (Google's does), so store the one
  // the user typed on their Firebase profile.
  await updateProfile(result.user, { displayName: name.trim() });
  return result.user;
}

// For accounts without a name yet (older email sign-ups).
export async function updateDisplayName(name: string) {
  if (!auth.currentUser) throw new Error("Not signed in.");
  await updateProfile(auth.currentUser, { displayName: name.trim() });
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  await signOut(auth);
}
