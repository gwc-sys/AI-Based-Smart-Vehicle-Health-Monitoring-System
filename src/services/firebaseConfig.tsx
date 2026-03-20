
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  ConfirmationResult,
  getAuth,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential,
  signInWithPhoneNumber
} from 'firebase/auth';
import { Env } from '../config/env';
import { isValidE164PhoneNumber, normalizePhoneNumber, sanitizeOtpCode } from '../utils/phoneAuth';

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
let webConfirmationResult: ConfirmationResult | null = null;
const WEB_RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

function getWebLocationContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  return {
    host: window.location.hostname,
    origin: window.location.origin,
    protocol: window.location.protocol,
  };
}

function isFirebasePhoneAuthSecureOrigin(host: string, protocol: string): boolean {
  if (protocol === 'https:') {
    return true;
  }

  return host === 'localhost' || host === '127.0.0.1';
}

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

  const container = document.getElementById(WEB_RECAPTCHA_CONTAINER_ID);
  if (!container) {
    throw new Error('reCAPTCHA container is missing. Open the OTP screen before sending the verification code.');
  }

  return container;
}

async function getWebRecaptchaVerifier() {
  const auth = getAuth(getFirebaseApp());
  auth.languageCode = 'en';

  if (webRecaptchaVerifier) {
    const existingContainer = document.getElementById(WEB_RECAPTCHA_CONTAINER_ID);
    if (!existingContainer || !existingContainer.isConnected) {
      clearWebRecaptchaVerifier();
    }
  }

  if (webRecaptchaVerifier) {
    if (window.recaptchaVerifier === webRecaptchaVerifier) {
      return webRecaptchaVerifier;
    }

    try {
      webRecaptchaVerifier.clear();
    } catch (error) {
      console.warn('[Firebase] Failed to clear existing reCAPTCHA verifier', error);
    }
    webRecaptchaVerifier = null;
  }

  const container = getWebRecaptchaContainer();
  container.innerHTML = '';
  if (typeof window !== 'undefined') {
    (window as any).__webRecaptchaSolved = false;
  }

  webRecaptchaVerifier = new RecaptchaVerifier(auth, container, {
    size: 'normal',
    callback: () => {
      if (typeof window !== 'undefined') {
        (window as any).__webRecaptchaSolved = true;
      }
      console.log('[Firebase] reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.warn('[Firebase] reCAPTCHA expired');
      if (typeof window !== 'undefined') {
        (window as any).__webRecaptchaSolved = false;
      }
      try {
        webRecaptchaVerifier?.clear();
      } catch (error) {
        console.warn('[Firebase] Failed to clear expired reCAPTCHA verifier', error);
      }
      webRecaptchaVerifier = null;
    },
  });

  await webRecaptchaVerifier.render();
  window.recaptchaVerifier = webRecaptchaVerifier;
  return webRecaptchaVerifier;
}

export async function prepareWebRecaptchaVerifier(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  await getWebRecaptchaVerifier();
}

export function isWebRecaptchaSolved(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!(window as any).__webRecaptchaSolved;
}

function clearWebRecaptchaVerifier() {
  if (typeof window !== 'undefined') {
    window.recaptchaVerifier = undefined;
    window.confirmationResult = undefined;
    (window as any).__webRecaptchaSolved = false;
  }

  webConfirmationResult = null;

  if (!webRecaptchaVerifier) {
    return;
  }

  try {
    webRecaptchaVerifier.clear();
  } catch (error) {
    console.warn('[Firebase] Failed to clear reCAPTCHA verifier', error);
  }

  webRecaptchaVerifier = null;
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
  sendOTP: async (phoneNumber: string, verifier?: any): Promise<{ verificationId: string }> => {
    try {
      const auth = getAuth(getFirebaseApp());
      auth.languageCode = 'en';
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      const locationContext = getWebLocationContext();

      if (!isValidE164PhoneNumber(normalizedPhoneNumber)) {
        throw new Error('Phone number must use international E.164 format like +919876543210');
      }

      let recaptchaVerifier: any;

      if (verifier) {
        // Use provided verifier (for mobile)
        recaptchaVerifier = verifier;
      } else if (typeof window !== 'undefined') {
        if (
          locationContext &&
          !isFirebasePhoneAuthSecureOrigin(locationContext.host, locationContext.protocol)
        ) {
          throw new Error(
            `Web phone authentication requires HTTPS. Current origin "${locationContext.origin}" is not allowed for reCAPTCHA. Use HTTPS or localhost during development.`
          );
        }

        recaptchaVerifier = await getWebRecaptchaVerifier();
      } else {
        throw new Error('Phone authentication requires a verifier on mobile platforms');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhoneNumber, recaptchaVerifier);
      if (typeof window !== 'undefined') {
        window.confirmationResult = confirmationResult;
        webConfirmationResult = confirmationResult;
      }
      return { verificationId: confirmationResult.verificationId };
    } catch (error: any) {
      if (typeof window !== 'undefined' && !verifier) {
        clearWebRecaptchaVerifier();
      }
      const code = error?.code as string | undefined;
      const rawMessage = error?.message ?? 'Unknown Firebase error';
      let hint = '';

      if (code === 'auth/invalid-phone-number') {
        hint = ' Use international format like +919876543210.';
      } else if (rawMessage.toLowerCase().includes('recaptcha') || rawMessage.toLowerCase().includes('captcha')) {
        hint = ' Complete the visible reCAPTCHA challenge on the page, then try sending the OTP again.';
      } else if (code === 'auth/too-many-requests') {
        hint = ' Too many attempts. Wait and retry later.';
      } else if (code === 'auth/operation-not-allowed') {
        hint = ' Enable Phone provider in Firebase Console > Authentication > Sign-in method.';
      } else if (code === 'auth/quota-exceeded') {
        hint = ' SMS quota exceeded for this Firebase project. Try again later or use Firebase test phone numbers while developing.';
      } else if (code === 'auth/invalid-app-credential' || code === 'auth/captcha-check-failed') {
        const host = locationContext?.host ?? 'this host';
        const origin = locationContext?.origin;
        const insecureOriginWarning =
          locationContext && !isFirebasePhoneAuthSecureOrigin(locationContext.host, locationContext.protocol)
            ? ` Also switch to HTTPS because "${origin}" is not a secure origin for Firebase phone auth.`
            : '';
        hint = ` Check Firebase Console > Authentication > Settings > Authorized domains and make sure "${host}" is listed.${insecureOriginWarning} Disable ad-block/tracker-blocking extensions and retry the reCAPTCHA challenge.`;
      } else if (rawMessage.toLowerCase().includes('network error')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this host';
        hint = ` Verify that "${host}" is added in Firebase Console > Authentication > Settings > Authorized domains, then retry without tracker-blocking extensions for the reCAPTCHA step.`;
      } else if (rawMessage.toLowerCase().includes('billing')) {
        hint = ' Verify your Firebase project billing/quota settings for phone authentication.';
      }

      throw new Error(`Failed to send OTP${code ? ` (${code})` : ''}: ${rawMessage}.${hint}`);
    }
  },

  /**
   * Verify OTP code
   * @param verificationId - The verification id returned from sendOTP
   * @param otpCode - The 6-digit OTP code
   * @returns Promise<any> - User credential
   * @example
   * const userCredential = await firebasePhoneAuth.verifyOTP(verificationId, '123456');
   */
  verifyOTP: async (verificationId: string, otpCode: string): Promise<any> => {
    try {
      const sanitizedOtpCode = sanitizeOtpCode(otpCode);

      if (sanitizedOtpCode.length !== 6) {
        throw new Error('OTP code must be exactly 6 digits');
      }

      if (typeof window !== 'undefined') {
        const confirmationResult = window.confirmationResult ?? webConfirmationResult;
        if (confirmationResult) {
          const result = await confirmationResult.confirm(sanitizedOtpCode);
          clearWebRecaptchaVerifier();
          return result;
        }
      }

      const auth = getAuth(getFirebaseApp());
      const credential = PhoneAuthProvider.credential(verificationId, sanitizedOtpCode);
      const result = await signInWithCredential(auth, credential);
      if (typeof window !== 'undefined') {
        clearWebRecaptchaVerifier();
      }
      return result;
    } catch (error: any) {
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }
};

export default firebaseConfig;
