import { Platform } from 'react-native';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  ConfirmationResult,
  getAuth,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithCredential,
  signInWithPhoneNumber,
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
let nativeConfirmationResult: ConfirmationResult | null = null;
const WEB_RECAPTCHA_CONTAINER_ID = 'recaptcha-container';
const FIREBASE_PHONE_AUTH_ERROR_FALLBACK = 'Firebase rejected the phone verification request';

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

function validateFirebaseConfig(config: typeof firebaseConfig): boolean {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

  for (const field of requiredFields) {
    const value = config[field as keyof typeof config];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      console.error(`[Firebase] Invalid ${field}: ${value}`);
      return false;
    }
  }

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

  firebaseAppInstance = initializeApp(firebaseConfig);
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
    size: 'invisible',
    callback: () => {
      if (typeof window !== 'undefined') {
        (window as any).__webRecaptchaSolved = true;
      }
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

function clearNativePhoneVerification() {
  nativeConfirmationResult = null;
}

function tryParseJson(value: unknown): any {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractNestedFirebaseMessage(payload: any): string | undefined {
  if (!payload) {
    return undefined;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload?.error?.message === 'string') {
    return payload.error.message;
  }

  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  return undefined;
}

function getFirebasePhoneAuthErrorDetails(error: any): { code?: string; rawMessage: string } {
  const candidates = [
    error?.customData?._serverResponse,
    error?.customData?.serverResponse,
    error?.customData?._tokenResponse,
    error?.response?._bodyText,
    error?.message,
  ];

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    const message = extractNestedFirebaseMessage(parsed);
    if (message) {
      return {
        code: error?.code,
        rawMessage: message,
      };
    }
  }

  return {
    code: error?.code,
    rawMessage: error?.message ?? FIREBASE_PHONE_AUTH_ERROR_FALLBACK,
  };
}

function isTrackerRestrictedBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Edg\/|Firefox\/|Brave\//i.test(navigator.userAgent);
}

function isGoogleHtmlFallbackMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('requested url') &&
    normalized.includes('accounts:sendverificationcode') &&
    normalized.includes('not found on this server')
  );
}

export const firebasePhoneAuth = {
  sendOTP: async (phoneNumber: string, verifier?: any): Promise<{ verificationId: string }> => {
    try {
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      const locationContext = getWebLocationContext();
      const auth = getAuth(getFirebaseApp());
      auth.languageCode = 'en';

      if (!isValidE164PhoneNumber(normalizedPhoneNumber)) {
        throw new Error('Phone number must use international E.164 format like +919876543210');
      }

      let recaptchaVerifier: any;

      if (Platform.OS !== 'web') {
        if (!verifier) {
          throw new Error(
            'Phone authentication requires the Expo reCAPTCHA verifier on native platforms. Please wait for the verification modal to finish loading and try again.'
          );
        }
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
        throw new Error('Phone authentication requires a verifier on this platform');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhoneNumber, recaptchaVerifier);
      if (typeof window !== 'undefined') {
        window.confirmationResult = confirmationResult;
        webConfirmationResult = confirmationResult;
      } else {
        nativeConfirmationResult = confirmationResult;
      }

      return { verificationId: confirmationResult.verificationId };
    } catch (error: any) {
      if (typeof window !== 'undefined' && !verifier) {
        clearWebRecaptchaVerifier();
      }

      const locationContext = getWebLocationContext();
      const { code, rawMessage } = getFirebasePhoneAuthErrorDetails(error);
      const normalizedMessage = rawMessage.toUpperCase();
      let hint = '';

      if (code === 'auth/invalid-phone-number' || normalizedMessage.includes('INVALID_PHONE_NUMBER')) {
        hint = ' Use international format like +919876543210.';
      } else if (code === 'auth/operation-not-allowed' || normalizedMessage.includes('OPERATION_NOT_ALLOWED')) {
        hint = ' Enable Phone provider in Firebase Console > Authentication > Sign-in method.';
      } else if (code === 'auth/quota-exceeded' || normalizedMessage.includes('QUOTA_EXCEEDED')) {
        hint = ' SMS quota exceeded for this Firebase project. Try again later or use Firebase test phone numbers while developing.';
      } else if (code === 'auth/too-many-requests' || normalizedMessage.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
        hint = ' Too many attempts. Wait and retry later.';
      } else if (
        rawMessage.toLowerCase().includes('recaptcha') ||
        rawMessage.toLowerCase().includes('captcha') ||
        code === 'auth/invalid-app-credential' ||
        code === 'auth/captcha-check-failed' ||
        normalizedMessage.includes('INVALID_APP_CREDENTIAL') ||
        normalizedMessage.includes('CAPTCHA_CHECK_FAILED')
      ) {
        const host = locationContext?.host ?? 'this host';
        const origin = locationContext?.origin;
        const insecureOriginWarning =
          locationContext && !isFirebasePhoneAuthSecureOrigin(locationContext.host, locationContext.protocol)
            ? ` Also switch to HTTPS because "${origin}" is not a secure origin for Firebase phone auth.`
            : '';
        const trackerHint =
          typeof window !== 'undefined' && isTrackerRestrictedBrowser()
            ? ' Your browser privacy protection may be blocking Google reCAPTCHA storage. Allow third-party storage/cookies for Google reCAPTCHA or retry in Chrome.'
            : '';
        hint = ` Check Firebase Console > Authentication > Settings > Authorized domains and make sure "${host}" is listed.${insecureOriginWarning}${trackerHint}`;
      } else if (normalizedMessage.includes('APP_NOT_AUTHORIZED') || normalizedMessage.includes('UNAUTHORIZED_DOMAIN')) {
        const host = locationContext?.host ?? 'this host';
        hint = ` The current host "${host}" is not authorized for Firebase Authentication. Add it in Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (isGoogleHtmlFallbackMessage(rawMessage)) {
        const host = locationContext?.host ?? 'this host';
        const browserHint =
          typeof window !== 'undefined' && isTrackerRestrictedBrowser()
            ? ' Your browser privacy protection is also a likely cause here. Allow third-party cookies/storage for Google services on this site or retry in Chrome.'
            : '';
        hint = ` The request is being intercepted before Firebase can return its normal JSON error. Check that "${host}" is listed in Firebase Console > Authentication > Settings > Authorized domains, disable ad-block/privacy blocking for Google reCAPTCHA, and retry.${browserHint}`;
      } else if (rawMessage.toLowerCase().includes('network error')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this host';
        hint = ` Verify that "${host}" is added in Firebase Console > Authentication > Settings > Authorized domains, then retry without tracker-blocking extensions for the reCAPTCHA step.`;
      } else if (rawMessage.toLowerCase().includes('billing') || normalizedMessage.includes('BILLING')) {
        hint = ' Verify your Firebase project billing/quota settings for phone authentication.';
      }

      throw new Error(`Failed to send OTP${code ? ` (${code})` : ''}: ${rawMessage}.${hint}`);
    }
  },

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

      if (Platform.OS !== 'web' && nativeConfirmationResult) {
        const result = await nativeConfirmationResult.confirm(sanitizedOtpCode);
        clearNativePhoneVerification();
        return result;
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
  },
};

export default firebaseConfig;
