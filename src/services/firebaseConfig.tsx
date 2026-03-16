// Firebase configuration - values are pulled from environment variables when
// available, with fallbacks to the hard‑coded credentials shown below.  This
// lets you run the app without a .env file during development, while still
// allowing production builds to override via EXPO_FIREBASE_* vars.
import { getApps, initializeApp } from 'firebase/app';

/**
 * Firebase Authentication API
 * These functions handle authentication with Firebase Authentication
 *
 * NOTE: These use the Firebase Web SDK (`firebase/auth`).
 * Ensure you have `firebase` installed (e.g. `npm install firebase`).
 */
import {
    ConfirmationResult,
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_FIREBASE_API_KEY ?? 'AIzaSyC8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8',
  authDomain: process.env.EXPO_FIREBASE_AUTH_DOMAIN ?? 'ai-based-smart-vehicle-health.firebaseapp.com',
  projectId: process.env.EXPO_FIREBASE_PROJECT_ID ?? 'ai-based-smart-vehicle-health',
  storageBucket: process.env.EXPO_FIREBASE_STORAGE_BUCKET ?? 'ai-based-smart-vehicle-health.firebasestorage.app',
  messagingSenderId: process.env.EXPO_FIREBASE_MESSAGING_SENDER_ID ?? '728879810111',
  appId: process.env.EXPO_FIREBASE_APP_ID ?? '1:728879810111:web:eeff691ca1defdac66da8a',
};

export function initFirebase(): { initialized: boolean; config: typeof firebaseConfig } {
  // When running on Expo web (or any JS environment) we need to
  // explicitly initialize the Firebase JS SDK. The native
  // @react-native-firebase modules initialise themselves via the
  // `google-services.json` / `GoogleService-Info.plist` files, so
  // we guard this call by checking `getApps()`.
  const apps = getApps();
  if (apps.length === 0) {
    console.log('[Firebase] Attempting initialization. API Key present:', !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'AIzaSyC8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8');
    if (!firebaseConfig.apiKey) {
      console.warn('[Firebase] apiKey missing, attempting initialization anyway');
    }
    console.log('[Firebase] No apps detected, initializing with config:', {
      apiKey: firebaseConfig.apiKey ? '***' : 'missing',
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

export const firebasePhoneAuth = {
  /**
   * Send OTP to phone number
   * @param phoneNumber - Phone number in international format (e.g., +1234567890)
   * @param verifier - Optional verifier for reCAPTCHA (for mobile)
   * @returns Promise<ConfirmationResult>
   * @example
   * const confirmationResult = await firebasePhoneAuth.sendOTP('+1234567890', verifier);
   */
  sendOTP: async (phoneNumber: string, verifier?: any): Promise<ConfirmationResult> => {
    try {
      initFirebase();
      const auth = getAuth();

      let recaptchaVerifier: any;

      if (verifier) {
        // Use provided verifier (for mobile)
        recaptchaVerifier = verifier;
      } else if (typeof window !== 'undefined') {
        // For web, create reCAPTCHA verifier
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response: any) => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
      } else {
        throw new Error('Phone authentication requires a verifier on mobile platforms');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (error: any) {
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  },

  /**
   * Verify OTP code
   * @param confirmationResult - The confirmation result from sendOTP
   * @param otpCode - The 6-digit OTP code
   * @returns Promise<any> - User credential
   * @example
   * const userCredential = await firebasePhoneAuth.verifyOTP(confirmationResult, '123456');
   */
  verifyOTP: async (confirmationResult: ConfirmationResult, otpCode: string): Promise<any> => {
    try {
      const result = await confirmationResult.confirm(otpCode);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }
};

export default firebaseConfig;
