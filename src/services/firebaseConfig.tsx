// Firebase configuration - values are pulled from environment variables when
// available, with fallbacks to the hard‑coded credentials shown below.  This
// lets you run the app without a .env file during development, while still
// allowing production builds to override via EXPO_FIREBASE_* vars.
export const firebaseConfig = {
  apiKey:
    process.env.EXPO_FIREBASE_API_KEY ??
    'AIzaSyBm2l-pdj8_WljQJ8KlwEj2jNh-xZHaU0w',
  authDomain:
    process.env.EXPO_FIREBASE_AUTH_DOMAIN ??
    'ai-based-smart-vehicle-health.firebaseapp.com',
  projectId:
    process.env.EXPO_FIREBASE_PROJECT_ID ??
    'ai-based-smart-vehicle-health',
  storageBucket:
    process.env.EXPO_FIREBASE_STORAGE_BUCKET ??
    'ai-based-smart-vehicle-health.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_FIREBASE_MESSAGING_SENDER_ID ??
    '728879810111',
  appId:
    process.env.EXPO_FIREBASE_APP_ID ??
    '1:728879810111:web:eeff691ca1defdac66da8a',
};

import { getApps, initializeApp } from 'firebase/app';

export function initFirebase(): { initialized: boolean; config: typeof firebaseConfig } {
  // When running on Expo web (or any JS environment) we need to
  // explicitly initialize the Firebase JS SDK. The native
  // @react-native-firebase modules initialise themselves via the
  // `google-services.json` / `GoogleService-Info.plist` files, so
  // we guard this call by checking `getApps()`.
  const apps = getApps();
  if (apps.length === 0) {
    if (!firebaseConfig.apiKey) {
      console.warn('[Firebase] apiKey missing, attempting initialization anyway');
    }
    console.log('[Firebase] No apps detected, initializing with config:', {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
    });
    try {
      initializeApp(firebaseConfig);
      console.log('[Firebase] initialization successful');
      return { initialized: true, config: firebaseConfig };
    } catch (err) {
      console.error('[Firebase] initialization error:', err);
      return { initialized: false, config: firebaseConfig };
    }
  } else {
    console.log('[Firebase] already initialized');
    return { initialized: true, config: firebaseConfig };
  }
}

/**
 * Firebase Email Verification API
 * These functions handle email verification with Firebase Authentication
 * 
 * NOTE: These use the Firebase Web SDK (`firebase/auth`).
 * Ensure you have `firebase` installed (e.g. `npm install firebase`).
 */
import { getAuth, isSignInWithEmailLink, sendEmailVerification } from 'firebase/auth';

export const firebaseEmailVerification = {
  /**
   * Send verification email to current user
   * @example
   * await firebaseEmailVerification.sendVerificationEmail();
   */
  sendVerificationEmail: async (): Promise<void> => {
    try {
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user currently signed in');
      }
      // choose appropriate deep link / web URL for verification
      const actionUrl =
        process.env.EXPO_APP_DEEP_LINK_URI ||
        process.env.EXPO_EMAIL_VERIFICATION_WEB_URL ||
        process.env.EXPO_FIREBASE_VERIFICATION_URL ||
        `${firebaseConfig.authDomain}`;

      await sendEmailVerification(user, {
        handleCodeInApp: true,
        url: actionUrl,
      });
      console.log('Verification email sent to:', user.email);
    } catch (error: any) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  },

  /**
   * Check if current user's email is verified
   * @returns {Promise<boolean>} true if email is verified
   */
  isEmailVerified: async (): Promise<boolean> => {
    try {
      initFirebase();
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return false;
      // Reload user to get latest emailVerified status
      await user.reload();
      return user.emailVerified;
    } catch (error: any) {
      console.error('Error checking email verification:', error);
      return false;
    }
  },

  /**
   * Handle email verification with link
   * Call this when user clicks verification link from email
   * @param link The verification link from email
   * @example
   * await firebaseEmailVerification.handleEmailVerificationLink(deepLinkUrl);
   */
  handleEmailVerificationLink: async (link: string): Promise<void> => {
    try {
      initFirebase();
      const auth = getAuth();
      if (!isSignInWithEmailLink(auth, link)) {
        throw new Error('Invalid verification link');
      }
      
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user signed in');
      }
      
      await user.reload();
      if (user.emailVerified) {
        console.log('Email already verified');
        return;
      }
      
      throw new Error('Email verification link is invalid or expired');
    } catch (error: any) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  },

  /**
   * Configure email verification settings in Firebase
   */
  configureEmailVerification: async (): Promise<void> => {
    try {
      const actionCodeSettings = {
        url: `${firebaseConfig.authDomain}/`,
        handleCodeInApp: true,
        iOS: {
          bundleId: process.env.EXPO_IOS_BUNDLE_ID,
        },
        android: {
          packageName: process.env.EXPO_ANDROID_PACKAGE_NAME,
          installApp: true,
          minimumVersion: '12',
        },
        // dynamic links no longer required; leaving value if still set
      dynamicLinkDomain: process.env.EXPO_FIREBASE_DYNAMIC_LINK_DOMAIN,
      };
      console.log('Email verification configured with:', actionCodeSettings);
    } catch (error: any) {
      throw new Error(`Configuration failed: ${error.message}`);
    }
  },
};

export default firebaseConfig;
