import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAdditionalUserInfo,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Platform } from 'react-native';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { firebasePhoneAuth, getFirebaseAuth } from '../services/firebaseConfig';

function mapFirebaseUser(fu: any): User {
  const name = fu.displayName || '';

  return {
    id: fu.uid,
    name,
    email: fu.email || '',
    phone: fu.phoneNumber || '',
    createdAt: fu.metadata?.creationTime,
    profileComplete: !!name.trim(),
  };
}

type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  profileComplete: boolean;
};

type PhoneVerificationResult = {
  isNewUser: boolean;
  user: User;
};

type OAuthProviderName = 'google' | 'apple';

type OAuthSignInResult = {
  isNewUser: boolean;
  user: User;
};

type AuthContextType = {
  user: User | null;
  initializing: boolean;
  loading: boolean;
  error?: string | null;
  signOut: () => Promise<void>;
  completePhoneProfile: (name: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserPreferences: (prefs: any) => Promise<void>;
  sendPhoneOTP: (phoneNumber: string, verifier?: any) => Promise<{ verificationId: string }>;
  verifyPhoneOTP: (verificationId: string, otpCode: string) => Promise<PhoneVerificationResult>;
  signInWithOAuth: (providerName: OAuthProviderName) => Promise<OAuthSignInResult>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const auth = getFirebaseAuth();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const mapped = mapFirebaseUser(firebaseUser);
          setUser(mapped);
          await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
        } else {
          const saved = await AsyncStorage.getItem('currentUser');
          if (saved) {
            setUser(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setInitializing(false);
      }
    };

    restore();

    const unsubscribe =
      onAuthStateChanged(getFirebaseAuth(), async (fu: any) => {
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

  const signOut = async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await auth.signOut();
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    const trimmedName = userData.name?.trim();
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error('No user logged in');
    }

    if (trimmedName) {
      await updateProfile(firebaseUser, { displayName: trimmedName });
    }

    await firebaseUser.reload();

    const refreshedUser = auth.currentUser;
    if (!refreshedUser) {
      throw new Error('Failed to refresh user profile');
    }

    const mapped = mapFirebaseUser(refreshedUser);
    setUser(mapped);
    await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
  };

  const completePhoneProfile = async (name: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error('Full name is required');
      }

      await updateUser({ name: name.trim() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete profile';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    return updateUser(data);
  };

  const updateUserPreferences = async (prefs: any) => {
    try {
      await AsyncStorage.setItem('userPreferences', JSON.stringify(prefs));
    } catch (err) {
      console.error('Failed to save user preferences:', err);
    }
  };

  const signInWithOAuth = async (providerName: OAuthProviderName): Promise<OAuthSignInResult> => {
    setLoading(true);
    setError(null);

    try {
      if (Platform.OS !== 'web') {
        throw new Error('Google and Apple sign-in are currently available on web only in this app.');
      }

      const auth = getFirebaseAuth();
      let provider: GoogleAuthProvider | OAuthProvider;

      switch (providerName) {
        case 'google':
          provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          break;
        case 'apple':
          provider = new OAuthProvider('apple.com');
          provider.addScope('email');
          provider.addScope('name');
          break;
        default:
          throw new Error('Unsupported OAuth provider');
      }

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser) {
        throw new Error('OAuth sign-in succeeded but no Firebase user was returned');
      }

      const mapped = mapFirebaseUser(firebaseUser);
      await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
      setUser(mapped);

      return {
        isNewUser: !!getAdditionalUserInfo(result)?.isNewUser,
        user: mapped,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OAuth sign-in failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOTP = async (phoneNumber: string, verifier?: any) => {
    setLoading(true);
    setError(null);

    try {
      return await firebasePhoneAuth.sendOTP(phoneNumber, verifier);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async (verificationId: string, otpCode: string): Promise<PhoneVerificationResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await firebasePhoneAuth.verifyOTP(verificationId, otpCode);
      const firebaseUser = result.user;

      if (!firebaseUser) {
        throw new Error('Phone verification succeeded but no Firebase user was returned');
      }

      const mapped = mapFirebaseUser(firebaseUser);
      await AsyncStorage.setItem('currentUser', JSON.stringify(mapped));
      setUser(mapped);

      return {
        isNewUser:
          Platform.OS === 'web'
            ? !!(result?.additionalUserInfo?.isNewUser ?? getAdditionalUserInfo(result as any)?.isNewUser)
            : !!result?.additionalUserInfo?.isNewUser,
        user: mapped,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OTP verification failed';
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
        initializing,
        loading,
        error,
        signOut,
        completePhoneProfile,
        updateUser,
        updateUserProfile,
        updateUserPreferences,
        sendPhoneOTP,
        verifyPhoneOTP,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
