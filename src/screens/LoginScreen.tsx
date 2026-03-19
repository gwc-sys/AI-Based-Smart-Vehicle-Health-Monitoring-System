import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    NativeSyntheticEvent,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TextInputKeyPressEventData,
    TouchableOpacity,
    View
} from 'react-native';
import useAuth from '../hooks/useAuth';

// Define types for component props (if any)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface LoginScreenProps {}

// Define types for form data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface LoginFormData {
  email: string;
  password: string;
}

// Extend TouchableOpacity props for web
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type WebTouchableProps = {
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const navigation = useNavigation<any>();
  const { signIn, sendPhoneOTP } = useAuth();

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert('Validation', 'Please enter email and password');
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      Alert.alert('Login failed', (err as Error).message || 'Unable to sign in');
    }
  };

  const handleForgotPassword = (): void => {
    Alert.alert('Forgot Password', 'Password reset is not implemented yet.');
  };

  const handleSignUp = (): void => {
    navigation.navigate('Register');
  };

  const handlePhoneLogin = async (): Promise<void> => {
    if (!phoneNumber.trim()) {
      Alert.alert('Validation', 'Please enter your phone number');
      return;
    }

    // Basic phone number validation (should start with + and have at least 10 digits)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      Alert.alert('Validation', 'Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    try {
      const { verificationId } = await sendPhoneOTP(phoneNumber.trim());
      navigation.navigate('PhoneOTP', {
        verificationId,
        phoneNumber: phoneNumber.trim()
      });
    } catch (err) {
      Alert.alert('Failed to send OTP', (err as Error).message || 'Unable to send verification code');
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>): void => {
    // Handle Enter key for web
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      if (loginMode === 'email') {
        handleLogin();
      } else {
        handlePhoneLogin();
      }
    }
  };

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev: boolean) => !prev);
  };

  // Web-specific hover styles - moved to useEffect to avoid SSR issues
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .login-button:hover {
          background-color: #0056b3 !important;
          transform: scale(1.02);
          transition: all 0.2s ease;
        }
        .social-button:hover {
          background-color: #e0e0e0 !important;
          transform: scale(1.1);
          transition: all 0.2s ease;
        }
        .sign-up-link:hover {
          text-decoration: underline;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS !== 'web'} // Disable bounce on web
        >
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.subtitleText}>Sign in to continue</Text>
          </View>

          {/* Login Mode Toggle */}
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              style={[styles.modeButton, loginMode === 'email' && styles.modeButtonActive]}
              onPress={() => setLoginMode('email')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeButtonText, loginMode === 'email' && styles.modeButtonTextActive]}>
                Email Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, loginMode === 'phone' && styles.modeButtonActive]}
              onPress={() => setLoginMode('phone')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeButtonText, loginMode === 'phone' && styles.modeButtonTextActive]}>
                Phone Login
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            {loginMode === 'email' ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={Platform.OS === 'web' ? 'email' : 'off'}
                    onKeyPress={handleKeyPress}
                    accessibilityLabel="Email input field"
                    accessibilityHint="Enter your email address"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete={Platform.OS === 'web' ? 'current-password' : 'off'}
                      onKeyPress={handleKeyPress}
                      accessibilityLabel="Password input field"
                      accessibilityHint="Enter your password"
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      style={styles.eyeButton}
                      activeOpacity={0.7}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      accessibilityHint="Toggle password visibility"
                    >
                      <Text style={styles.eyeButtonText}>
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.forgotPasswordContainer}
                  activeOpacity={0.7}
                  accessibilityLabel="Forgot password"
                  accessibilityHint="Navigate to password reset"
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number (e.g., +1234567890)"
                  placeholderTextColor="#999"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={Platform.OS === 'web' ? 'tel' : 'off'}
                  onKeyPress={handleKeyPress}
                  accessibilityLabel="Phone number input field"
                  accessibilityHint="Enter your phone number in international format"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginButton, Platform.OS === 'web' && ({ className: 'login-button' } as any)]}
              onPress={loginMode === 'email' ? handleLogin : handlePhoneLogin}
              activeOpacity={0.8}
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel={loginMode === 'email' ? "Sign in button" : "Send OTP button"}
              accessibilityHint={loginMode === 'email' ? "Tap to sign in to your account" : "Tap to receive verification code"}
            >
              <Text style={styles.loginButtonText}>
                {loginMode === 'email' ? 'Sign In' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity 
                style={[styles.socialButton, Platform.OS === 'web' && ({ className: 'social-button' } as any)]}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign in with Google"
                accessibilityHint="Continue with Google"
              >
                <Text style={styles.socialButtonText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, Platform.OS === 'web' && ({ className: 'social-button' } as any)]}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign in with Facebook"
                accessibilityHint="Continue with Facebook"
              >
                <Text style={styles.socialButtonText}>f</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, Platform.OS === 'web' && ({ className: 'social-button' } as any)]}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign in with LinkedIn"
                accessibilityHint="Continue with LinkedIn"
              >
                <Text style={styles.socialButtonText}>in</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>{'Don\'t have an account? '}</Text>
              <TouchableOpacity 
                onPress={handleSignUp}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign up"
                accessibilityHint="Navigate to sign up page"
              >
                <Text style={[styles.signUpLink, Platform.OS === 'web' && ({ className: 'sign-up-link' } as any)]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    // Web-specific styles - using type assertion for conditional properties
    ...(Platform.OS === 'web' ? {
      maxWidth: 500,
      marginHorizontal: 'auto' as any,
      width: '100%',
    } : {}),
  },
  headerContainer: {
    marginTop: Platform.OS === 'web' ? 40 : 60,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: Platform.OS === 'web' ? 36 : 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#666',
    textAlign: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: Platform.OS === 'web' ? 48 : 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f8f8',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
  },
  passwordInput: {
    flex: 1,
    height: Platform.OS === 'web' ? 48 : 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  } as any,
  eyeButton: {
    paddingHorizontal: 16,
    height: Platform.OS === 'web' ? 48 : 50,
    justifyContent: 'center',
    // Web-specific styles
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  eyeButtonText: {
    fontSize: 20,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    // Web-specific styles
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  loginButton: {
    backgroundColor: '#007AFF',
    height: Platform.OS === 'web' ? 52 : 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: Platform.OS === 'web' ? 0.2 : 0.3,
    shadowRadius: 4,
    elevation: 5,
    // Web-specific styles
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerContainer: {
    marginTop: 40,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  socialButton: {
    width: Platform.OS === 'web' ? 48 : 50,
    height: Platform.OS === 'web' ? 48 : 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    // Web-specific styles
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  socialButtonText: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '600',
    color: '#333',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  signUpText: {
    color: '#666',
    fontSize: 14,
  },
  signUpLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    // Web-specific styles
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
});

export default LoginScreen;
