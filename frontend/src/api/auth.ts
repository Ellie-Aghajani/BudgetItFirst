import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
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

// isNewUser: true the first time this Google account signs in here.
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return {
    user: result.user,
    isNewUser: getAdditionalUserInfo(result)?.isNewUser ?? false,
  };
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  await signOut(auth);
}

// "password" for email sign-ups, "google.com" for Google.
export function getSignInMethod(): "password" | "google.com" | null {
  const providerId = auth.currentUser?.providerData[0]?.providerId;
  return providerId === "password" || providerId === "google.com"
    ? providerId
    : null;
}

// Confirms it's really the user before something irreversible: password
// accounts re-enter their password, Google accounts go through Google again.
// Then forces a fresh ID token, so the server sees the new sign-in time.
export async function reauthenticate(password?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  if (getSignInMethod() === "password") {
    if (!user.email || !password) throw new Error("Enter your password.");
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
  } else {
    await reauthenticateWithPopup(user, googleProvider);
  }
  await user.getIdToken(true);
}
