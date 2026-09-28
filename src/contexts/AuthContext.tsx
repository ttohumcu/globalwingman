import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          // New Registration
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Anonymous Pilot',
            photoURL: currentUser.photoURL || '',
            email: currentUser.email || '',
            status: 'Looking to Fly',
            certifications: [],
            isBanned: false,
            role: currentUser.email === 'ttohumcu@gmail.com' ? 'admin' : 'user',
            createdAt: new Date()
          });

          // Log Registration
          try {
            await addDoc(collection(db, 'auditLogs'), {
              action: 'Registration',
              userId: currentUser.uid,
              userEmail: currentUser.email || 'unknown',
              userName: currentUser.displayName || 'Anonymous Pilot',
              timestamp: serverTimestamp()
            });
            
            // Send Welcome Email
            if (currentUser.email) {
              fetch('/api/email/welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: currentUser.email,
                  name: currentUser.displayName || 'Pilot'
                })
              })
              .then(async (res) => {
                if (!res.ok) {
                  const errData = await res.json().catch(() => ({}));
                  console.error('Failed to send welcome email (Server Error):', errData);
                }
              })
              .catch(err => console.error('Failed to send welcome email (Network Error):', err));
            }
          } catch (e) {
            console.error("Failed to write audit log for registration", e);
          }
        } else {
          // Auto-heal missing email for legacy test accounts
          const data = userSnap.data();
          if (!data.email && currentUser.email) {
            await setDoc(userRef, { email: currentUser.email }, { merge: true });
          }
        }

        // Listen for ban status changes
        unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().isBanned) {
            signOut(auth);
            setUser(null);
            alert("Your account has been banned.");
          } else {
            setUser(currentUser);
          }
        });
      } else {
        setUser(null);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
