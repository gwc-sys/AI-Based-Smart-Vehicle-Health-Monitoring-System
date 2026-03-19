import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    getAuth,
    linkWithCredential,
    onAuthStateChanged,
    PhoneAuthProvider,
    signInWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { firebasePhoneAuth, getFirebaseApp } from '../services/firebaseConfig';

// helper to convert Firebase user to our local User type
function mapFirebaseUser(fu: any): User {
  return {
    id: fu.uid,
    name: fu.displayName || '',
    email: fu.email || '',
    phone: fu.phoneNumber || '',
    createdAt: fu.metadata?.creationTime,
  };
}

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
};

type AuthContextType = {
  user: User | null;
  initializing: boolean;
  loading: boolean;
  error?: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signUpWithPhoneVerification: (
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    verificationId: string,
    otpCode: string
  ) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserPreferences: (prefs: any) => Promise<void>;
  sendPhoneOTP: (phoneNumber: string, verifier?: any) => Promise<{ verificationId: string }>;
  verifyPhoneOTP: (verificationId: string, otpCode: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Note: Firebase initialization moved to AuthProvider to ensure proper timing
// and avoid module-level initialization issues

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Firebase is already initialized in the root _layout.tsx
    // Here we just restore session and listen to auth state changes
    const restore = async () => {
      try {
        const auth = getAuth(getFirebaseApp());
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
        setInitializing(false);
      }
    };

    restore();

    // Listen to auth state changes to keep currentUser in sync
    const auth = getAuth(getFirebaseApp());
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
      // Firebase already initialized in root _layout.tsx
      const auth = getAuth(getFirebaseApp());
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = credential.user;
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
      // Firebase already initialized in root _layout.tsx
      const auth = getAuth(getFirebaseApp());
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
      // Firebase already initialized in root _layout.tsx
      const auth = getAuth(getFirebaseApp());
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = credential.user;
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name.trim() });
        // update local user state and persist
        const mapped = mapFirebaseUser(firebaseUser);
        setUser(mapped);
        await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithPhoneVerification = async (
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    verificationId: string,
    otpCode: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (!name.trim() || !email.trim() || !password || !phoneNumber.trim()) {
        throw new Error('All fields are required');
      }
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');
      if (!email.includes('@') || !email.includes('.')) throw new Error('Please enter a valid email address');

      // Firebase already initialized in root _layout.tsx
      const auth = getAuth(getFirebaseApp());

      // Create user account with email/password first
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = credential.user;

      // Link the phone number to the newly created account using the OTP verification
      const phoneCredential = PhoneAuthProvider.credential(verificationId, otpCode);
      await linkWithCredential(firebaseUser, phoneCredential);

      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name.trim() });
        const mapped = mapFirebaseUser(firebaseUser);
        setUser(mapped);
        await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    // Firebase already initialized in root _layout.tsx
    const auth = getAuth(getFirebaseApp());
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

  const sendPhoneOTP = async (phoneNumber: string, verifier?: any) => {
    setLoading(true);
    setError(null);
    try {
      const confirmationResult = await firebasePhoneAuth.sendOTP(phoneNumber, verifier);
      return confirmationResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async (verificationId: string, otpCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await firebasePhoneAuth.verifyOTP(verificationId, otpCode);
      const firebaseUser = result.user;
      if (firebaseUser) {
        const mapped = mapFirebaseUser(firebaseUser);
        await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
        setUser(mapped);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OTP verification failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Authentication is ready once the session is restored
  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        loading,
        error,
        signIn,
        signOut,
        signUp,
        signUpWithPhoneVerification,
        updateUser,
        updateUserProfile,
        updateUserPreferences,
        sendPhoneOTP,
        verifyPhoneOTP,
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
