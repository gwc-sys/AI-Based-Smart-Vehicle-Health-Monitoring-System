import Constants from 'expo-constants';

const manifest = Constants.expoConfig ?? (Constants.manifest as any) ?? {};

export type AppEnv = {
  API_URL: string;
  EXPO_PUBLIC_API_URL?: string;
  GOOGLE_WEB_CLIENT_ID?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_DATABASE_URL?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  FIREBASE_MESSAGING_SENDER_ID?: string;
  FIREBASE_APP_ID?: string;
};

export const Env: AppEnv = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? (manifest.extra?.apiUrl ?? 'https://api.example.com'),
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? manifest.extra?.apiUrl,
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? manifest.extra?.googleWebClientId,
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? manifest.extra?.firebaseApiKey,
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? manifest.extra?.firebaseProjectId,
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? manifest.extra?.firebaseAuthDomain,
  FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? manifest.extra?.firebaseDatabaseUrl,
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? manifest.extra?.firebaseStorageBucket,
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? manifest.extra?.firebaseMessagingSenderId,
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? manifest.extra?.firebaseAppId,
};

export function getEnv<K extends keyof AppEnv>(key: K): AppEnv[K] {
  return Env[key];
}

export default Env;
