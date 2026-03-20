# AI Vehicle Health Monitoring App

## Project Overview

This project is an Expo CLI + React Native application for monitoring vehicle health, managing user authentication, and preparing vehicle-related insights inside a mobile and web-friendly interface.

The app currently includes:

- Email/password authentication with Firebase
- Phone number OTP verification with Firebase Authentication
- A tab-based authenticated app area
- Vehicle state management through context
- Placeholder service layers for API, AI, and notification integrations

## Tech Stack

- Expo
- React Native
- React Navigation
- Firebase Web SDK
- AsyncStorage
- TypeScript

## Main Entry Flow

The app starts from [`App.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/App.tsx), which initializes Firebase, mounts the providers, and renders the React Navigation tree.

Once Firebase is ready:

- `AuthProvider` restores the user session
- `VehicleProvider` loads vehicle data
- `AppNavigator` decides whether to show auth screens or the main app

## Folder Structure

### `src/navigation`

- `AppNavigator.tsx`: Switches between authenticated and unauthenticated flows
- `AuthNavigator.tsx`: Holds login, register, and OTP screens
- `BottomTabNavigator.tsx`: Main app tabs after login

### `src/context`

- `AuthContext.tsx`: Firebase auth state, sign in, sign up, OTP send/verify logic
- `VehicleContext.tsx`: Vehicle list state and selection logic

### `src/screens`

Contains UI screens such as:

- `LoginScreen.tsx`
- `RegisterScreen.tsx`
- `PhoneOTPScreen.tsx`
- `DashboardScreen.tsx`
- `AlertsScreen.tsx`
- `PredictionScreen.tsx`
- `ProfileScreen.tsx`
- `SettingsScreen.tsx`

### `src/services`

- `firebaseConfig.tsx`: Firebase app config, web reCAPTCHA, OTP send/verify helpers
- `api.tsx`: Shared API client
- `vehicleService.tsx`: Vehicle CRUD service
- `aiService.tsx`: AI-related service layer
- `notificationService.tsx`: Notification-related service layer

### `src/utils`

- `phoneAuth.ts`: Shared phone normalization, validation, and OTP sanitation helpers
- `helpers.tsx`, `validators.tsx`, `constants.tsx`: Common utilities

## Authentication Flow

Authentication is managed in [`src/context/AuthContext.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/context/AuthContext.tsx).

### Email Login

1. User enters email and password on `LoginScreen`
2. `signIn()` calls Firebase Auth
3. Auth state updates and the user is stored in AsyncStorage
4. `AppNavigator` switches to the main app

### Registration with Phone Verification

1. User enters registration details on `RegisterScreen`
2. App navigates to `PhoneOTPScreen`
3. OTP is sent to the provided phone number
4. User enters the 6-digit code
5. Account is created with email/password
6. Phone credential is linked to the Firebase user

### Phone Login / OTP Verification

1. User enters a phone number in international format
2. `PhoneOTPScreen` sends OTP using Firebase phone auth
3. User enters the OTP
4. The verification code is confirmed with Firebase

## OTP and Firebase Working

The OTP flow is implemented mainly in [`src/services/firebaseConfig.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/services/firebaseConfig.tsx) and [`src/screens/PhoneOTPScreen.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/screens/PhoneOTPScreen.tsx).

### Web OTP Flow

- The app creates an invisible Firebase `RecaptchaVerifier`
- The verifier is attached to the `recaptcha-container` in `PhoneOTPScreen`
- `signInWithPhoneNumber()` sends the verification SMS
- The browser stores the `confirmationResult` temporarily for OTP confirmation

### Mobile OTP Flow

- The app uses `FirebaseRecaptchaVerifierModal` from `expo-firebase-recaptcha`
- The native verifier instance is passed into the Firebase OTP send helper

### Improvements Already Applied

- Shared phone number normalization
- Strict E.164 validation such as `+919876543210`
- OTP digit sanitization
- Duplicate initial OTP request prevention
- Better Firebase error messages for OTP failures
- Better web focus handling around alerts and screen changes

## Firebase Configuration

Firebase config is loaded from:

- `process.env.EXPO_PUBLIC_*`
- `expo.extra` values in [`app.json`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/app.json)
- Hardcoded fallback values in `firebaseConfig.tsx`

Current Firebase-related values are defined in `app.json` under `expo.extra`.

Important Firebase requirements for OTP to work correctly:

- Phone Authentication must be enabled in Firebase Console
- The current host must be added to Firebase Authorized Domains
- Test phone numbers should be configured for safe development when needed
- The Firebase project must have valid SMS quota and app verification support

## Running the Project

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

Platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

Run lint:

```bash
npm run lint
```

## Current Functional Notes

- Firebase initialization is active and happens at app startup
- Auth session restore is implemented with AsyncStorage
- Vehicle list fetching currently returns an empty array in development in [`src/services/vehicleService.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/services/vehicleService.tsx)
- The app includes generated Data Connect output under `src/dataconnect-generated`, but it is not yet wired into the visible flow

## Known Development Caveats

- OTP can still fail if Firebase Console settings are incomplete even when the app code is correct
- Web may show accessibility or touch warnings from React Native Web internals; those are separate from OTP success/failure
- Firebase config currently includes fallback values, so initialization can succeed even if environment variables are missing

## Recommended Next Improvements

- Move Firebase secrets and runtime values fully to environment variables
- Replace fallback Firebase config with strict required env validation
- Add a dedicated OTP error UI instead of only `Alert.alert`
- Add automated tests for auth validation helpers
- Connect vehicle services to a real backend or Firebase data source

## Important Files

- [`App.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/App.tsx)
- [`src/navigation/AppNavigator.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/navigation/AppNavigator.tsx)
- [`src/context/AuthContext.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/context/AuthContext.tsx)
- [`src/context/VehicleContext.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/context/VehicleContext.tsx)
- [`src/services/firebaseConfig.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/services/firebaseConfig.tsx)
- [`src/screens/PhoneOTPScreen.tsx`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/screens/PhoneOTPScreen.tsx)
- [`src/utils/phoneAuth.ts`](/d:/college%20Project/IOT%20Application/AI-Vehicle-Health-Monitoring-App/src/utils/phoneAuth.ts)

## Summary

This project is structured around Firebase-backed authentication and a React Navigation-based app shell. The OTP flow now has stronger validation and safer request handling, and the app is set up to grow into a fuller vehicle monitoring platform as backend services are connected.
