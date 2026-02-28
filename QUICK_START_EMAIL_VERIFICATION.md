# Email Verification - Quick Start Guide

## ✅ What's Implemented

Your app now has a complete email verification workflow:

### 1. **User Registration** (`RegisterScreen.tsx`)
- User fills in full name, email, password
- Account created with `emailVerified: false`
- Automatically sends verification email

### 2. **Email Verification** (`EmailVerificationScreen.tsx`)
- Displays email verification status
- Shows steps to verify email
- Allows manual token entry for testing
- Supports resending verification emails

### 3. **Login Protection** (Updated in `useAuth.tsx`)
- Login blocked until email is verified
- Helpful error message: "Please verify your email address before logging in"
- Automatic resend of verification email on login attempt

### 4. **Mock Implementation**
- Uses AsyncStorage for testing (no Firebase needed yet)
- Generates verification tokens with 24-hour expiry
- Tokens logged to console for easy access

## 🚀 Testing the Workflow

### Step 1: Register
1. Open app and navigate to Register
2. Fill in details:
   - Full Name: `John Doe`
   - Email: `test@example.com`
   - Password: `Password123` (min 8 chars)
3. Tap **Sign Up**
4. You'll see verification screen

### Step 2: Get Verification Token
Open your browser console or terminal running the emulator and look for:
```
[MOCK] Verification link: verify://test@example.com/a1b2c3d4e5f6g7h8
```

Copy the token after the last `/`: `a1b2c3d4e5f6g7h8`

### Step 3: Verify Email
1. On the verification screen, paste the token in the **Verification Token** field
2. Tap **Verify Email**
3. Success! You'll see "Email verified successfully!"

### Step 4: Login
1. Tap **Back to Login** or navigate to Login screen
2. Enter your credentials:
   - Email: `test@example.com`
   - Password: `Password123`
3. You can now login successfully!

## 📱 File Structure

```
src/
├── hooks/
│   └── useAuth.tsx                 # Authentication logic with Email verification
├── screens/
│   ├── RegisterScreen.tsx          # Registration with verification flow
│   ├── LoginScreen.tsx             # Login with email verification check
│   └── EmailVerificationScreen.tsx # Email verification UI
├── services/
│   └── firebaseConfig.tsx          # Firebase setup + email verification helpers
└── context/
    └── AuthContext.tsx             # Auth context provider
```

## 🔧 Key Functions in useAuth.tsx

### `signUp(name, email, password)`
- Creates new user with `emailVerified: false`
- Sends verification email automatically
- Does NOT log user in yet

### `verifyEmail(email, token)`
- Validates verification token
- Checks token expiry (24 hours)
- Sets `emailVerified: true` on success
- Clears token from storage

### `sendVerificationEmail(email)`  
- Resends verification email
- Generates new token (expires in 24 hours)
- Used when "Resend" clicked

### `signIn(email, password)`
- Checks if email is verified first
- Blocks login if `emailVerified: false`
- Returns user object if verified

## 🔐 Security Features

✅ **Token Expiration** - 24 hour limit  
✅ **Email Validation** - Format checked  
✅ **Password Requirements** - Min 8 characters  
✅ **Email Uniqueness** - Can't register twice with same email  
✅ **One-Time Tokens** - Token deleted after use  
✅ **Session Persistence** - Uses AsyncStorage for mock

## 🚨 Common Issues & Solutions

### Q: Can't find verification token in console
**A:** Check:
1. Browser console (Ctrl+Shift+J on Windows)
2. Metro bundler terminal output
3. Look for `[MOCK]` prefix in logs

### Q: Token expired error
**A:** 
- Get a new token by resending verification email
- Tokens are valid for 24 hours
- Check system time isn't off

### Q: "Please verify your email" on login
**A:**
- You're using unverified account
- Check verification token in console
- Go back to verification screen and enter token

### Q: Can login without verifying (mock only)
**A:** This is expected behavior in mock mode. Firebase will enforce verification required.

## 🔄 Switching to Firebase

When ready to use real Firebase:

1. **Install Firebase packages:**
   ```bash
   npm install firebase  # use Web SDK
   ```

2. **Update `useAuth.tsx`** - Replace `mockApi` with `firebaseApi` (see EMAIL_VERIFICATION_GUIDE.md)

3. **Replace mock functions** in these methods:
   - `signUp()` - use `auth().createUserWithEmailAndPassword()`
   - `signIn()` - use `auth().signInWithEmailAndPassword()`
   - `verifyEmail()` - use `user.reload()` and check `emailVerified`

4. **Setup Firebase Console:**
   - Create Firebase project
   - Enable Email/Password authentication
   - Configure custom domain (optional)
   - Add web URL for email verification links

## 📊 State Management

### User Object with Email Verification
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;  // KEY: Can login only if true
  createdAt?: string;
}
```

### Auth Context
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (name, email, password) => Promise<void>;
  signIn: (email, password) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: (email) => Promise<void>;  // NEW
  verifyEmail: (email, token) => Promise<void>;    // NEW
  updateUser: (userData) => Promise<void>;
}
```

## 🧪 Testing Checklist

- [ ] Can register with valid credentials
- [ ] Registration shows verification screen
- [ ] Verification token appears in console
- [ ] Can enter token and verify email
- [ ] Cannot login without verifying email first
- [ ] Can login after email verification
- [ ] Resend email works and generates new token
- [ ] Token expires after 24 hours (mock can't test, only Firebase)
- [ ] Invalid token shows error
- [ ] Can navigate between screens during verification

## 🎯 Next Steps

1. **Test the mock implementation** (current)
2. **Setup Firebase project** in Firebase Console
3. **Install Firebase packages**
4. **Replace mock API with Firebase** (see EMAIL_VERIFICATION_GUIDE.md)
5. **Test with real emails**
6. **Setup deep linking** for auto-verification when user clicks email link
7. **Add forgot password** feature (optional)

## 📚 Related Files

- [EMAIL_VERIFICATION_GUIDE.md](./EMAIL_VERIFICATION_GUIDE.md) - Firebase integration details
- [src/hooks/useAuth.tsx](./src/hooks/useAuth.tsx) - Authentication logic
- [src/screens/RegisterScreen.tsx](./src/screens/RegisterScreen.tsx) - Registration UI
- [src/screens/EmailVerificationScreen.tsx](./src/screens/EmailVerificationScreen.tsx) - Verification UI
- [src/services/firebaseConfig.tsx](./src/services/firebaseConfig.tsx) - Firebase setup

## ⚡ Pro Tips

✨ **Development:** Use mock implementation for quick testing  
🔥 **Production:** Switch to Firebase with proper verification  
📧 **Testing:** Use test email addresses like `test+1@example.com`  
🔗 **Deep Links:** Setup to auto-verify when user clicks email link  
⏰ **Resend Limit:** Add rate limiting to prevent abuse (future enhancement)

---

👉 **Ready?** Start with [Testing the Workflow](#-testing-the-workflow) above!
