import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Log Login action
    try {
      await addDoc(collection(db, 'auditLogs'), {
        action: 'Login',
        userId: user.uid,
        userEmail: user.email || 'unknown',
        userName: user.displayName || 'Anonymous Pilot',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to write audit log for login", e);
    }
    
    return result;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    if (error.code === 'auth/unauthorized-domain') {
      alert("This domain is not authorized in the Firebase Console. Please add '" + window.location.hostname + "' to your authorized domains in the Firebase Authentication settings.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      // User closed the popup, usually no alert needed
    } else if (error.code === 'auth/cancelled-popup-request') {
      // Another popup was opened
    } else {
      alert("Sign-in error: " + error.message);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
