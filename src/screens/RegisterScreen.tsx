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

// Define types for component props
interface RegisterScreenProps {}

// Define types for form data
interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Extend TouchableOpacity props for web
type WebTouchableProps = {
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

const RegisterScreen: React.FC<RegisterScreenProps> = () => {
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);

  const navigation = useNavigation<any>();
  const { signUp } = useAuth();

  const handleRegister = async (): Promise<void> => {
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Validation', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters long');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Validation', 'Please agree to the terms and conditions');
      return;
    }

    try {
      await signUp(fullName.trim(), email.trim(), password);
      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Registration failed', (err as Error).message || 'Unable to create account');
    }
  };

  const handleLogin = (): void => {
    navigation.navigate('Login');
  };

  const handleSocialRegister = async (provider: string): Promise<void> => {
    try {
      // Dummy social registration: create a demo account
      const demoEmail = `${provider.toLowerCase()}@example.com`;
      await signUp(`${provider} User`, demoEmail, 'password');
      Alert.alert('Success', 'Account created successfully!');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Social registration failed', (err as Error).message || 'Unable to create account');
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>): void => {
    // Handle Enter key for web
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handleRegister();
    }
  };

  const togglePasswordVisibility = (): void => {
    setShowPassword((prev: boolean) => !prev);
  };

  const toggleConfirmPasswordVisibility = (): void => {
    setShowConfirmPassword((prev: boolean) => !prev);
  };

  const toggleTermsAgreement = (): void => {
    setAgreeToTerms((prev: boolean) => !prev);
  };

  // Web-specific hover styles
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .register-button:hover {
          background-color: #0056b3 !important;
          transform: scale(1.02);
          transition: all 0.2s ease;
        }
        .social-button:hover {
          background-color: #e0e0e0 !important;
          transform: scale(1.1);
          transition: all 0.2s ease;
        }
        .login-link:hover {
          text-decoration: underline;
        }
        .terms-link:hover {
          text-decoration: underline;
          color: #0056b3;
        }
        .checkbox:hover {
          border-color: #007AFF;
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
          bounces={Platform.OS !== 'web'}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitleText}>Sign up to get started</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete={Platform.OS === 'web' ? 'name' : 'off'}
                onKeyPress={handleKeyPress}
                accessibilityLabel="Full name input field"
                accessibilityHint="Enter your full name"
              />
            </View>

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
                  autoComplete={Platform.OS === 'web' ? 'new-password' : 'off'}
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm your password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete={Platform.OS === 'web' ? 'new-password' : 'off'}
                  onKeyPress={handleKeyPress}
                  accessibilityLabel="Confirm password input field"
                  accessibilityHint="Re-enter your password"
                />
                <TouchableOpacity
                  onPress={toggleConfirmPasswordVisibility}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                  accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                  accessibilityHint="Toggle password visibility"
                >
                  <Text style={styles.eyeButtonText}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.termsContainer}>
              <TouchableOpacity
                onPress={toggleTermsAgreement}
                style={styles.checkbox}
                activeOpacity={0.7}
                accessibilityLabel="Terms and conditions checkbox"
                accessibilityHint="Agree to terms and conditions"
              >
                <View style={[styles.checkboxInner, agreeToTerms && styles.checkboxChecked]}>
                  {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text 
                  style={[styles.termsLink, Platform.OS === 'web' && ({ className: 'terms-link' } as any)]}
                  onPress={() => Alert.alert('Terms', 'Terms and conditions would be shown here')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text 
                  style={[styles.termsLink, Platform.OS === 'web' && ({ className: 'terms-link' } as any)]}
                  onPress={() => Alert.alert('Privacy', 'Privacy policy would be shown here')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, Platform.OS === 'web' && ({ className: 'register-button' } as any)]}
              onPress={handleRegister}
              activeOpacity={0.8}
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel="Sign up button"
              accessibilityHint="Tap to create your account"
            >
              <Text style={styles.registerButtonText}>Sign Up</Text>
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
                onPress={() => handleSocialRegister('Google')}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign up with Google"
                accessibilityHint="Continue with Google"
              >
                <Text style={styles.socialButtonText}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, Platform.OS === 'web' && ({ className: 'social-button' } as any)]}
                onPress={() => handleSocialRegister('Facebook')}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign up with Facebook"
                accessibilityHint="Continue with Facebook"
              >
                <Text style={styles.socialButtonText}>f</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, Platform.OS === 'web' && ({ className: 'social-button' } as any)]}
                onPress={() => handleSocialRegister('LinkedIn')}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign up with LinkedIn"
                accessibilityHint="Continue with LinkedIn"
              >
                <Text style={styles.socialButtonText}>in</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity 
                onPress={handleLogin}
                activeOpacity={0.7}
                {...(Platform.OS === 'web' ? { type: 'button' } : {})}
                accessibilityLabel="Sign in"
                accessibilityHint="Navigate to sign in page"
              >
                <Text style={[styles.loginLink, Platform.OS === 'web' && ({ className: 'login-link' } as any)]}>
                  Sign In
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
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  eyeButtonText: {
    fontSize: 20,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#007AFF',
    fontWeight: '500',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  registerButton: {
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
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  registerButtonText: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
});

export default RegisterScreen;