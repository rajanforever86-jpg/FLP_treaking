import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  referralCode: string;
  rank: string;
  logoUrl: string;
}

interface AuthContextType {
  user: (FirebaseUser & { id: string }) | null;
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
      console.log("Auth state changed:", fUser?.email);
      setFirebaseUser(fUser);
      
      if (fUser) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', fUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile({ id: fUser.uid, ...userData } as User);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile sync error:", err);
          setProfile(null);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setProfile(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const authValue = firebaseUser ? Object.assign(firebaseUser, { id: firebaseUser.uid }) : null;

  return (
    <AuthContext.Provider value={{ 
      user: authValue as any, 
      firebaseUser, 
      profile, 
      loading, 
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
