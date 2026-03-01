import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    applyActionCode,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { firebaseEmailVerification, initFirebase } from '../services/firebaseConfig';

// helper to convert Firebase user to our local User type
function mapFirebaseUser(fu: any): User {
  return {
    id: fu.uid,
    name: fu.displayName || '',
    email: fu.email || '',
    emailVerified: fu.emailVerified,
    createdAt: fu.metadata?.creationTime,
  };
}

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  createdAt?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error?: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserPreferences: (prefs: any) => Promise<void>;
  sendVerificationEmail: (email?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// initialize Firebase (important for web builds)
const { initialized } = initFirebase();
if (initialized) {
  console.log('[AuthContext] firebase initialized');
} else {
  console.warn('[AuthContext] firebase not initialized; auth operations may fail');
}

// Note: we no longer use a mock API. All operations use Firebase Auth.

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // restore session from AsyncStorage or firebase auth state
    const restore = async () => {
      try {
        initFirebase();
        const auth = getAuth();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const mapped = mapFirebaseUser(firebaseUser);
          setUser(mapped);
          await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
        } else {
          const saved = await AsyncStorage.getItem('currentUser');
          if (saved) setUser(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };
    restore();

    // also listen to auth state changes to keep currentUser in sync
    initFirebase();
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fu: any) => {
      if (fu) {
        const mapped = mapFirebaseUser(fu);
        setUser(mapped);
        await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
      } else {
        setUser(null);
        await AsyncStorage.removeItem('currentUser');
      }
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      initFirebase();
      const auth = getAuth();
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = credential.user;
      // check email verified
      if (firebaseUser && !firebaseUser.emailVerified) {
        throw new Error('Please verify your email address before logging in');
      }
      if (firebaseUser) {
        const mapped = mapFirebaseUser(firebaseUser);
        await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
        setUser(mapped);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      initFirebase();
      const auth = getAuth();
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!name.trim() || !email.trim() || !password) throw new Error('All fields are required');
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');
      if (!email.includes('@') || !email.includes('.')) throw new Error('Please enter a valid email address');
      initFirebase();
      const auth = getAuth();
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = credential.user;
      if (firebaseUser) {
        await firebaseUser.updateProfile({ displayName: name.trim() });
      }
      // send verification link
      await firebaseEmailVerification.sendVerificationEmail();
      // clear current user so they must sign in after verifying
      await auth().signOut();
      setUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    initFirebase();
    const auth = getAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('No user logged in');
    if (userData.name) await updateProfile(firebaseUser, { displayName: userData.name });
    // reload and update local state
    await firebaseUser.reload();
    const mapped = mapFirebaseUser(firebaseUser);
    setUser(mapped);
    await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
  };

  const updateUserProfile = async (data: Partial<User>) => {
    // simply reuse updateUser for profile changes
    return updateUser(data);
  };

  const updateUserPreferences = async (prefs: any) => {
    // store preferences locally; backend logic could be added here
    try {
      await AsyncStorage.setItem('userPreferences', JSON.stringify(prefs));
    } catch (err) {
      console.error('Failed to save user preferences:', err);
    }
  };

  const sendVerificationEmail = async (email?: string) => {
    setLoading(true);
    setError(null);
    try {
      await firebaseEmailVerification.sendVerificationEmail();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      // token is expected to be the Firebase action code (oobCode)
      initFirebase();
      const auth = getAuth();
      if (token) {
        await applyActionCode(auth, token);
        // reload user to reflect verified status
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          await firebaseUser.reload();
          const mapped = mapFirebaseUser(firebaseUser);
          setUser(mapped);
          await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Email verification failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
        signUp,
        updateUser,
        updateUserProfile,
        updateUserPreferences,
        sendVerificationEmail,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export default AuthContext;
