// Firebase configuration - values are pulled from environment variables when
// available, with fallbacks to the hard‑coded credentials shown below.  This
// lets you run the app without a .env file during development, while still
// allowing production builds to override via EXPO_PUBLIC_FIREBASE_* vars.
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

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
import { Env } from '../config/env';

const firebaseConfig = {
  apiKey: Env.FIREBASE_API_KEY ?? 'AIzaSyDowbCOXreWmH7FS_4mKgVWkMVJUiiCTXQ',
  authDomain: Env.FIREBASE_AUTH_DOMAIN ?? 'ai-based-smart-vehicle-h-b714b.firebaseapp.com',
  projectId: Env.FIREBASE_PROJECT_ID ?? 'ai-based-smart-vehicle-h-b714b',
  storageBucket: Env.FIREBASE_STORAGE_BUCKET ?? 'ai-based-smart-vehicle-h-b714b.firebasestorage.app',
  messagingSenderId: Env.FIREBASE_MESSAGING_SENDER_ID ?? '414445888340',
  appId: Env.FIREBASE_APP_ID ?? '1:414445888340:web:bdff515ff0415d4a6b9ec1',
};

let firebaseAppInstance: FirebaseApp | null = null;
let webRecaptchaVerifier: RecaptchaVerifier | null = null;
const WEB_RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';

/**
 * Validates Firebase configuration
 */
function validateFirebaseConfig(config: typeof firebaseConfig): boolean {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

  for (const field of requiredFields) {
    const value = config[field as keyof typeof config];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      console.error(`[Firebase] Invalid ${field}: ${value}`);
      return false;
    }
  }

  // Check for placeholder API key
  if (config.apiKey === 'AIzaSyC8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8') {
    console.error('[Firebase] API key is still placeholder - environment variables not loaded');
    return false;
  }

  return true;
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseAppInstance) {
    return firebaseAppInstance;
  }

  const apps = getApps();
  if (apps.length > 0) {
    firebaseAppInstance = getApp();
    return firebaseAppInstance;
  }

  if (!validateFirebaseConfig(firebaseConfig)) {
    throw new Error('Firebase configuration validation failed');
  }

  console.log('[Firebase] Attempting initialization. API Key present:', !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'AIzaSyC8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8r8');
  console.log('[Firebase] No apps detected, initializing with config:', {
    apiKey: firebaseConfig.apiKey ? '***' : 'missing',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  });

  firebaseAppInstance = initializeApp(firebaseConfig);
  console.log('[Firebase] initialization successful');
  return firebaseAppInstance;
}

export function initFirebase(): { initialized: boolean; config: typeof firebaseConfig } {
  try {
    getFirebaseApp();
    return { initialized: true, config: firebaseConfig };
  } catch (err) {
    console.error('[Firebase] initialization error:', err);
    return { initialized: false, config: firebaseConfig };
  }
}

function getWebRecaptchaContainer(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('reCAPTCHA container is only available on web');
  }

  let container = document.getElementById(WEB_RECAPTCHA_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = WEB_RECAPTCHA_CONTAINER_ID;
    container.style.position = 'fixed';
    container.style.bottom = '16px';
    container.style.right = '16px';
    container.style.zIndex = '2147483647';
    document.body.appendChild(container);
  }

  return container;
}

async function getWebRecaptchaVerifier() {
  const auth = getAuth(getFirebaseApp());

  if (webRecaptchaVerifier) {
    try {
      webRecaptchaVerifier.clear();
    } catch (error) {
      console.warn('[Firebase] Failed to clear existing reCAPTCHA verifier', error);
    }
    webRecaptchaVerifier = null;
  }

  const container = getWebRecaptchaContainer();
  container.innerHTML = '';

  webRecaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
    callback: () => {
      console.log('[Firebase] reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.warn('[Firebase] reCAPTCHA expired');
      try {
        webRecaptchaVerifier?.clear();
      } catch (error) {
        console.warn('[Firebase] Failed to clear expired reCAPTCHA verifier', error);
      }
      webRecaptchaVerifier = null;
    },
  });

  await webRecaptchaVerifier.render();
  return webRecaptchaVerifier;
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
      const auth = getAuth(getFirebaseApp());

      let recaptchaVerifier: any;

      if (verifier) {
        // Use provided verifier (for mobile)
        recaptchaVerifier = verifier;
      } else if (typeof window !== 'undefined') {
        recaptchaVerifier = await getWebRecaptchaVerifier();
      } else {
        throw new Error('Phone authentication requires a verifier on mobile platforms');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (error: any) {
      if (typeof window !== 'undefined' && !verifier) {
        try {
          webRecaptchaVerifier?.clear();
        } catch (clearError) {
          console.warn('[Firebase] Failed to clear reCAPTCHA verifier after send failure', clearError);
        }
        webRecaptchaVerifier = null;
      }
      const code = error?.code as string | undefined;
      const rawMessage = error?.message ?? 'Unknown Firebase error';
      let hint = '';

      if (code === 'auth/invalid-phone-number') {
        hint = ' Use international format like +919876543210.';
      } else if (code === 'auth/too-many-requests') {
        hint = ' Too many attempts. Wait and retry later.';
      } else if (code === 'auth/operation-not-allowed') {
        hint = ' Enable Phone provider in Firebase Console > Authentication > Sign-in method.';
      } else if (code === 'auth/invalid-app-credential' || code === 'auth/captcha-check-failed') {
        hint = ' Check Authorized Domains in Firebase Console and make sure this web host is listed.';
      }

      throw new Error(`Failed to send OTP${code ? ` (${code})` : ''}: ${rawMessage}.${hint}`);
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
