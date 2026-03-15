import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence for better perceived performance
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore persistence could not be enabled:", err.code);
  });
}

export const auth = getAuth(app);
export const storage = getStorage(app);
// Increase retry limits for poor network conditions
storage.maxUploadRetryTime = 600000; // 10 minutes
storage.maxOperationRetryTime = 600000; // 10 minutes

export const googleProvider = new GoogleAuthProvider();
// We'll handle the domain restriction in the app logic instead of the provider hint
// to avoid potential issues with multi-account logins.

export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);
