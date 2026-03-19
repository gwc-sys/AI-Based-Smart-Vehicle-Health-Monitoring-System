import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

// declare modules without type definitions to silence TS errors
declare module 'expo-image-picker';

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export {};
