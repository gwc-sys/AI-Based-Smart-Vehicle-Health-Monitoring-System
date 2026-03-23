# Android and Web Auth Setup

This project now uses:

- Android phone OTP: native `@react-native-firebase/auth`
- Web phone OTP: Firebase web auth + reCAPTCHA
- Android Google sign-in: native Google Sign-In + Firebase credential
- Web Google/Apple sign-in: Firebase web popup auth

## Android SHA fingerprints

Current local debug keystore:

- File: `android/app/debug.keystore`
- Alias: `androiddebugkey`

Fingerprints from this machine:

- SHA-1: `0F:4F:38:77:F1:15:1B:B2:8A:CD:FB:C8:4B:90:42:C1:81:A5:2C:5A`
- SHA-256: `78:6E:CE:02:A9:56:17:E1:07:D5:9D:D8:80:1E:44:F8:9C:19:12:C5:9A:BA:00:96:C3:94:DC:B4:05:F4:7D:07`

## Current Firebase status

The checked-in `google-services.json` now matches the local debug SHA-1:

- `0F:4F:38:77:F1:15:1B:B2:8A:CD:FB:C8:4B:90:42:C1:81:A5:2C:5A`

For Android phone OTP on real devices, Firebase also needs the matching SHA-256 fingerprint saved in the Firebase Console. If SHA-256 is missing or the installed APK is signed with a different keystore, phone auth can fail with `auth/app-not-authorized`, `invalid app info`, or `play_integrity_token`.

## Firebase Console steps

1. Open Firebase Console.
2. Select project `ai-based-smart-vehicle-h-b714b`.
3. Open Project settings.
4. Under Your apps, open Android app `com.aivehicle.smarthealth`.
5. Add both fingerprints above:
   - SHA-1
   - SHA-256
6. Save.
7. Download a fresh `google-services.json`.
8. Replace both repo files with the new one:
   - `google-services.json`
   - `android/app/google-services.json`
9. In Firebase Authentication > Sign-in method:
   - Enable `Phone`
   - Enable `Google`
   - Enable `Apple` if you want Apple sign-in on web
10. In Firebase Authentication > Settings > Authorized domains:
   - Add your web host if needed
   - `localhost` should be present for local web testing

## Rebuild after config changes

After replacing `google-services.json`, rebuild Android:

```bash
npm run android
```

You can also verify the local setup before rebuilding:

```bash
npm run firebase:doctor
```

## Notes

- Apple sign-in is not shown on Android because it is not configured there.
- Apple sign-in on web still requires Apple provider setup in Firebase and Apple Developer configuration.
- Web phone OTP requires HTTPS or localhost because Firebase reCAPTCHA enforces a secure origin.
