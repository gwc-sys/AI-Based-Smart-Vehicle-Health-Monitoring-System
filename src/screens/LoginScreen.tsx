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
  View,
} from 'react-native';
import useAuth from '../hooks/useAuth';
import { isValidE164PhoneNumber, normalizePhoneNumber } from '../utils/phoneAuth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface LoginScreenProps {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type WebTouchableProps = {
  className?: string;
  type?: 'button' | 'submit' | 'reset';
};

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const navigation = useNavigation<any>();
  useAuth();

  const handleSignUp = (): void => {
    navigation.navigate('Register');
  };

  const handlePhoneLogin = async (): Promise<void> => {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhoneNumber) {
      Alert.alert('Validation', 'Please enter your phone number');
      return;
    }

    if (!isValidE164PhoneNumber(normalizedPhoneNumber)) {
      Alert.alert('Validation', 'Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    try {
      navigation.navigate('PhoneOTP', {
        phoneNumber: normalizedPhoneNumber,
        authMode: 'signIn',
      });
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Unable to continue to phone verification');
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>): void => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      handlePhoneLogin();
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

            <TouchableOpacity
              style={[styles.loginButton, Platform.OS === 'web' && ({ className: 'login-button' } as any)]}
              onPress={handlePhoneLogin}
              activeOpacity={0.8}
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel="Send OTP button"
              accessibilityHint="Tap to receive verification code"
            >
              <Text style={styles.loginButtonText}>Send OTP</Text>
            </TouchableOpacity>
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
