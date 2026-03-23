import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
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
import { prepareWebRecaptchaVerifier } from '../services/firebaseConfig';
import useAuth from '../hooks/useAuth';
import { isValidE164PhoneNumber, normalizePhoneNumber } from '../utils/phoneAuth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface LoginScreenProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type WebTouchableProps = {
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

const WEB_RECAPTCHA_CONTAINER_ID = 'login-recaptcha-container';
const OAUTH_PROVIDERS = Platform.OS === 'web' ? (['google', 'apple'] as const) : (['google'] as const);

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isWebRecaptchaLoading, setIsWebRecaptchaLoading] = useState<boolean>(Platform.OS === 'web');
  const [webRecaptchaError, setWebRecaptchaError] = useState<string | null>(null);

  const navigation = useNavigation<any>();
  const { loading, sendPhoneOTP, signInWithOAuth } = useAuth();
  const handleSignUp = (): void => {
    navigation.navigate('Register');
  };

  const handlePhoneLogin = async (): Promise<void> => {
    const normalizedCountryCode = normalizePhoneNumber(countryCode).startsWith('+')
      ? normalizePhoneNumber(countryCode)
      : `+${normalizePhoneNumber(countryCode)}`;
    const localPhoneNumber = phoneNumber.replace(/\D/g, '');
    const normalizedPhoneNumber = `${normalizedCountryCode}${localPhoneNumber}`;

    if (!localPhoneNumber) {
      Alert.alert('Validation', 'Please enter your phone number');
      return;
    }

    if (!isValidE164PhoneNumber(normalizedPhoneNumber)) {
      Alert.alert('Validation', 'Please enter a valid country code and phone number.');
      return;
    }

    try {
      const { verificationId } = await sendPhoneOTP(
        normalizedPhoneNumber,
      );

      navigation.navigate('PhoneOTP', {
        phoneNumber: normalizedPhoneNumber,
        verificationId,
        authMode: 'signIn',
      });
    } catch (err) {
      Alert.alert('Failed to send OTP', (err as Error).message || 'Unable to continue to phone verification');
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>): void => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handlePhoneLogin();
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple'): Promise<void> => {
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      Alert.alert('Sign in failed', (err as Error).message || 'Unable to continue with social sign-in');
    }
  };

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .login-button:hover {
          background-color: #0056b3 !important;
          transform: scale(1.02);
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

  React.useEffect(() => {
    const initializeWebRecaptcha = async () => {
      if (Platform.OS !== 'web') {
        return;
      }

      setIsWebRecaptchaLoading(true);
      setWebRecaptchaError(null);

      try {
        await prepareWebRecaptchaVerifier(WEB_RECAPTCHA_CONTAINER_ID);
      } catch (error) {
        setWebRecaptchaError((error as Error).message || 'Failed to load verification.');
      } finally {
        setIsWebRecaptchaLoading(false);
      }
    };

    initializeWebRecaptcha();
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
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.subtitleText}>Sign in with your mobile number</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
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

            <TouchableOpacity
              style={[styles.loginButton, Platform.OS === 'web' && ({ className: 'login-button' } as any)]}
              onPress={handlePhoneLogin}
              activeOpacity={0.8}
              disabled={loading || isWebRecaptchaLoading || !!webRecaptchaError}
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel="Send OTP button"
              accessibilityHint="Tap to receive verification code"
            >
              <Text style={styles.loginButtonText}>Send OTP</Text>
            </TouchableOpacity>

            {Platform.OS === 'web' && (
              <>
                <View
                  nativeID={WEB_RECAPTCHA_CONTAINER_ID}
                  style={styles.webRecaptchaContainer}
                  {...({ id: WEB_RECAPTCHA_CONTAINER_ID } as any)}
                />
                {webRecaptchaError && <Text style={styles.errorText}>{webRecaptchaError}</Text>}
              </>
            )}

            <SocialAuthButtons onPress={handleOAuthLogin} loading={loading} mode="login" providers={[...OAUTH_PROVIDERS]} />
          </View>

          <View style={styles.footerContainer}>
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>{`Don't have an account? `}</Text>
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
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 500,
          marginHorizontal: 'auto' as any,
          width: '100%',
        }
      : {}),
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
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  loginButtonText: {
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
  footerContainer: {
    marginTop: 40,
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
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },
});

export default LoginScreen;
