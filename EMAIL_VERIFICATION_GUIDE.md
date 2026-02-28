# Email Verification Implementation Guide

## Overview
This guide explains how to implement email verification in your AI Vehicle Health Monitoring App using Firebase Authentication.

## Current Implementation
The app currently uses a **mock implementation** with AsyncStorage for testing. The workflow is:

1. **User Registers** → Account created with `emailVerified: false`
2. **Verification Email Sent** → Mock token generated and logged to console
3. **User Verifies Email** → Token validated and `emailVerified` set to `true`
4. **User Can Login** → Login blocked until email is verified

## Firebase Integration Steps

### Step 1: Install Firebase (if not already installed)
```bash
npm install @react-native-firebase/app @react-native-firebase/auth
# or
yarn add @react-native-firebase/app @react-native-firebase/auth
```

### Step 2: Update useAuth.tsx with Firebase

Replace the mock API with Firebase calls:

```typescript
import { getAuth } from 'firebase/auth';
# use the Firebase Web SDK for auth operations

const firebaseApi = {
  register: async (name: string, email: string, password: string): Promise<User> => {
    try {
      // Create Firebase user
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      // Send verification email
      await firebaseUser.sendEmailVerification();
      
      // Create user profile in Firestore (optional)
      const newUser: User = {
        id: firebaseUser.uid,
        name,
        email,
        emailVerified: false,
        createdAt: new Date().toISOString()
      };
      
      return newUser;
    } catch (err: any) {
      throw new Error(err.message);
    }
  },
  
  login: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      // Check if email is verified
      if (!firebaseUser.emailVerified) {
        // Send verification email again
        await firebaseUser.sendEmailVerification();
        throw new Error('Please verify your email address. Check your inbox for verification link.');
      }
      
      const user: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        emailVerified: firebaseUser.emailVerified,
        createdAt: firebaseUser.metadata?.creationTime?.toISOString()
      };
      
      return user;
    } catch (err: any) {
      throw new Error(err.message);
    }
  },
  
  sendVerificationEmail: async (email: string): Promise<void> => {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.sendEmailVerification();
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  },
  
  verifyEmail: async (): Promise<void> => {
    try {
      const user = auth().currentUser;
      if (user) {
        await user.reload();
        if (!user.emailVerified) {
          throw new Error('Email not verified yet');
        }
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  }
};
```

### Step 3: Setup Deep Linking (Optional)

To automatically verify email when user clicks the link:

#### For Expo:
Add to `app.json`:
```json
{
  "expo": {
    "scheme": "youravehicleapp",
    "plugins": [
      [
        "expo-dynamic-links",
        {
          "appleTeamId": "YOUR_APPLE_TEAM_ID",
          "bundleIdentifier": "com.yourdomain.vehicleapp"
        }
      ]
    ]
  }
}
```

#### For React Native (bare project):
Follow [React Navigation Deep Linking Guide](https://reactnavigation.org/docs/deep-linking-with-state/)

### Step 4: Handle Email Verification Link

In your navigation, add the EmailVerificationScreen route:

```typescript
// In your navigation setup
<Stack.Screen 
  name="EmailVerification" 
  component={EmailVerificationScreen}
  options={{
    headerShown: false,
    cardStyle: { backgroundColor: 'white' }
  }}
/>
```

### Step 5: Configure Dynamic Link (Firebase Console)

1. Go to Firebase Console
2. Navigate to "Authentication" → "Templates"
3. Enable "Email Link Sign-in"
4. Set the verification link template to direct to your app:
```
youravehicleapp://verify?email={email}&token={token}
```

## Mock Implementation Details

### Mock Verification Token
In the current mock implementation, tokens are stored in AsyncStorage with expiry:

```
Email: user@example.com
Token: a1b2c3d4e5f6
Expires: 24 hours from creation
```

### How to Get Mock Token for Testing

In the console output, you'll see:
```
[MOCK] Verification link: verify://user@example.com/a1b2c3d4e5f6
```

Copy the token and paste it into the verification screen.

## Testing the Workflow

### Mobile/Expo Testing:
1. Run the app
2. Register a new account
3. Check console for mock token
4. Enter token in the verification screen
5. Verify that login now works

### With Firebase:
1. Register with a real email
2. Check your inbox for verification link
3. Click the link (or use the custom token)
4. Login with verified email

## Security Considerations

1. **Token Expiration**: Verify emails must be verified within 24 hours
2. **Rate Limiting**: Limit password reset/verification email sends
3. **HTTPS Only**: Always use HTTPS for verification links
4. **Email Validation**: Validate email format server-side
5. **Token Storage**: Don't store tokens in insecure locations

## Troubleshooting

### Token Expired
- User must request a new verification email
- Tokens expire after 24 hours

### Email Not Received
- Check spam/junk folder
- Resend verification email from the app
- Ensure Firebase email settings are configured

### Deep Link Not Working
- Verify bundleId matches Firebase config
- Check Dynamic Links setup in Firebase Console
- Test with universal links (iOS) and intent filters (Android)

## References

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Email Verification](https://firebase.google.com/docs/auth/custom-email-handler)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking-with-state/)

## Next Steps

1. Replace mock API with Firebase implementation
2. Setup Firebase project and configure Dynamic Links
3. Test email verification workflow end-to-end
4. Add resend email limit (max 3 times per hour)
5. Implement forgot password functionality
