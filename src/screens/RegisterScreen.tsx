import { useNavigation, useRoute } from '@react-navigation/native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SocialAuthButtons from '../components/SocialAuthButtons';
import firebaseConfig, { prepareWebRecaptchaVerifier } from '../services/firebaseConfig';
import useAuth from '../hooks/useAuth';
import { isValidE164PhoneNumber, normalizePhoneNumber } from '../utils/phoneAuth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RegisterScreenProps {}

const RegisterScreen: React.FC<RegisterScreenProps> = () => {
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState<boolean>(Platform.OS === 'web');
  const [isWebRecaptchaLoading, setIsWebRecaptchaLoading] = useState<boolean>(Platform.OS === 'web');
  const [webRecaptchaError, setWebRecaptchaError] = useState<string | null>(null);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { loading, sendPhoneOTP, signInWithOAuth } = useAuth();
  const recaptchaVerifier = React.useRef<FirebaseRecaptchaVerifierModal | null>(null);

  useEffect(() => {
    if (route.params?.agreedTerms || route.params?.agreedPrivacy) {
      setAgreeToTerms(true);
      navigation.setParams({ agreedTerms: undefined, agreedPrivacy: undefined });
    }
  }, [route.params, navigation]);

  useEffect(() => {
    const initializeWebRecaptcha = async () => {
      if (Platform.OS !== 'web') {
        return;
      }

      setIsWebRecaptchaLoading(true);
      setWebRecaptchaError(null);

      try {
        await prepareWebRecaptchaVerifier();
      } catch (error) {
        setWebRecaptchaError((error as Error).message || 'Failed to load verification.');
      } finally {
        setIsWebRecaptchaLoading(false);
      }
    };

    initializeWebRecaptcha();
  }, []);

  const handleRegister = async (): Promise<void> => {
    const normalizedCountryCode = normalizePhoneNumber(countryCode).startsWith('+')
      ? normalizePhoneNumber(countryCode)
      : `+${normalizePhoneNumber(countryCode)}`;
    const localPhoneNumber = phoneNumber.replace(/\D/g, '');
    const normalizedPhoneNumber = `${normalizedCountryCode}${localPhoneNumber}`;

    if (!localPhoneNumber) {
      Alert.alert('Validation', 'Please enter your mobile number');
      return;
    }

    if (!isValidE164PhoneNumber(normalizedPhoneNumber)) {
      Alert.alert('Validation', 'Please enter a valid country code and phone number.');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Validation', 'Please agree to the terms and conditions');
      return;
    }

    try {
      setIsSubmitting(true);
      const { verificationId } = await sendPhoneOTP(
        normalizedPhoneNumber,
        Platform.OS !== 'web' ? recaptchaVerifier.current : undefined,
      );

      navigation.navigate('PhoneOTP', {
        phoneNumber: normalizedPhoneNumber,
        verificationId,
        authMode: 'signUp',
      });
    } catch (err) {
      Alert.alert('Failed to send OTP', (err as Error).message || 'Unable to continue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = (): void => {
    navigation.navigate('Login');
  };

  const handleOpenTermsOfService = (): void => {
    navigation.navigate('TermsOfService');
  };

  const handleOpenPrivacyPolicy = (): void => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>): void => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handleRegister();
    }
  };

  const handleOAuthRegister = async (provider: 'google' | 'apple'): Promise<void> => {
    if (!agreeToTerms) {
      Alert.alert('Validation', 'Please agree to the terms and conditions before continuing');
      return;
    }

    try {
      await signInWithOAuth(provider);
    } catch (err) {
      Alert.alert('Sign up failed', (err as Error).message || 'Unable to continue with social sign-in');
    }
  };

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .register-button:hover {
          background-color: #0056b3 !important;
          transform: scale(1.02);
          transition: all 0.2s ease;
        }
        .login-link:hover {
          text-decoration: underline;
        }
        .terms-link:hover {
          text-decoration: underline;
          color: #0056b3;
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitleText}>Sign up with your mobile number</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.phoneRow}>
                <TextInput
                  style={styles.countryCodeInput}
                  placeholder="+91"
                  placeholderTextColor="#999"
                  value={countryCode}
                  onChangeText={setCountryCode}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Country code input field"
                  accessibilityHint="Enter your country dialing code"
                />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={Platform.OS === 'web' ? 'tel' : 'off'}
                  onKeyPress={handleKeyPress}
                  accessibilityLabel="Phone number input field"
                  accessibilityHint="Enter your local phone number"
                />
              </View>
            </View>

            <View style={styles.termsContainer}>
              <TouchableOpacity
                onPress={() => setAgreeToTerms((prev) => !prev)}
                style={styles.checkbox}
                activeOpacity={0.7}
                accessibilityLabel="Terms and conditions checkbox"
                accessibilityHint="Agree to terms and conditions"
              >
                <View style={[styles.checkboxInner, agreeToTerms && styles.checkboxChecked]}>
                  {agreeToTerms && <Text style={styles.checkmark}>OK</Text>}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={[styles.termsLink, Platform.OS === 'web' && ({ className: 'terms-link' } as any)]}
                  onPress={handleOpenTermsOfService}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={[styles.termsLink, Platform.OS === 'web' && ({ className: 'terms-link' } as any)]}
                  onPress={handleOpenPrivacyPolicy}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, Platform.OS === 'web' && ({ className: 'register-button' } as any)]}
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={
                isSubmitting ||
                loading ||
                isWebRecaptchaLoading ||
                !!webRecaptchaError ||
                (Platform.OS !== 'web' && !isRecaptchaReady)
              }
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel="Sign up button"
              accessibilityHint="Tap to create your account"
            >
              <Text style={styles.registerButtonText}>
                {isSubmitting ? 'Please wait...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'web' && (
              <>
                <View nativeID="recaptcha-container" style={styles.webRecaptchaContainer} {...({ id: 'recaptcha-container' } as any)} />
                {webRecaptchaError && <Text style={styles.errorText}>{webRecaptchaError}</Text>}
              </>
            )}

            <SocialAuthButtons onPress={handleOAuthRegister} loading={loading} mode="register" />
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
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS !== 'web' && (
        <FirebaseRecaptchaVerifierModal
          ref={(instance) => {
            recaptchaVerifier.current = instance;
            setIsRecaptchaReady(!!instance);
          }}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification
        />
      )}
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
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 500,
          marginHorizontal: 'auto' as any,
          width: '100%',
        }
      : {}),
  },
  headerContainer: {
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
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCodeInput: {
    width: 92,
    height: Platform.OS === 'web' ? 48 : 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f8f8',
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    height: Platform.OS === 'web' ? 48 : 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f8f8',
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
    fontSize: 10,
    fontWeight: '700',
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  registerButton: {
    backgroundColor: '#007AFF',
    height: Platform.OS === 'web' ? 52 : 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  webRecaptchaContainer: {
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
});

export default RegisterScreen;
