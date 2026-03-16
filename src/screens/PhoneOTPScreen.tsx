import { useNavigation, useRoute } from '@react-navigation/native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import useAuth from '../hooks/useAuth';
import firebaseConfig, { initFirebase } from '../services/firebaseConfig';
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface PhoneOTPScreenProps {}

const PhoneOTPScreen: React.FC<PhoneOTPScreenProps> = () => {
  const [otpCode, setOtpCode] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState<boolean>(false);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signUpWithPhoneVerification, sendPhoneOTP, loading } = useAuth();

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const phoneNumber = route.params?.phoneNumber;
  const fullName = route.params?.fullName;
  const email = route.params?.email;
  const password = route.params?.password;
  const confirmationResult = route.params?.confirmationResult;

  useEffect(() => {
    const { initialized } = initFirebase();
    setIsFirebaseInitialized(initialized);
  }, []);

  useEffect(() => {
    let timer: number;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    const sendInitialOTP = async () => {
      if (!isFirebaseInitialized || !phoneNumber || !recaptchaVerifier.current) return;

      try {
        const confirmationResult = await sendPhoneOTP(phoneNumber, recaptchaVerifier.current);
        // Update the route params with confirmation result
        navigation.setParams({
          confirmationResult,
          phoneNumber,
          fullName,
          email,
          password,
        });
      } catch (err) {
        Alert.alert('Failed to send OTP', (err as Error).message || 'Unable to send OTP');
        navigation.goBack();
      }
    };

    if (phoneNumber && isFirebaseInitialized) {
      sendInitialOTP();
    }
  }, [phoneNumber, sendPhoneOTP, navigation, fullName, email, password, isFirebaseInitialized]);

  const handleVerifyOTP = async (): Promise<void> => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      Alert.alert('Validation', 'Please enter a valid 6-digit OTP code');
      return;
    }

    if (!confirmationResult) {
      Alert.alert('Error', 'OTP verification session expired. Please try again.');
      navigation.goBack();
      return;
    }

    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Registration details are missing. Please start again.');
      navigation.navigate('Register');
      return;
    }

    try {
      await signUpWithPhoneVerification(
        fullName,
        email,
        password,
        phoneNumber,
        confirmationResult,
        otpCode.trim(),
      );
      Alert.alert('Success', 'Account created and phone verified successfully!');
      // Navigation will be handled automatically by auth state changes
    } catch (err) {
      Alert.alert('Verification failed', (err as Error).message || 'Unable to verify OTP');
    }
  };

  const handleResendOTP = async (): Promise<void> => {
    if (!canResend || !phoneNumber || !recaptchaVerifier.current || !isFirebaseInitialized) return;

    try {
      const newConfirmationResult = await sendPhoneOTP(phoneNumber, recaptchaVerifier.current);
      setResendTimer(30);
      setCanResend(false);
      setOtpCode('');
      // Update the route params with new confirmation result
      navigation.setParams({
        confirmationResult: newConfirmationResult,
        phoneNumber: phoneNumber,
        fullName,
        email,
        password,
      });
      Alert.alert('Success', 'OTP sent successfully!');
    } catch (err) {
      Alert.alert('Failed to resend OTP', (err as Error).message || 'Unable to send OTP');
    }
  };

  const handleBack = (): void => {
    navigation.goBack();
  };

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
            <Text style={styles.welcomeText}>Verify Phone Number</Text>
            <Text style={styles.subtitleText}>
              Enter the 6-digit code sent to{'\n'}{phoneNumber}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>OTP Code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#999"
                value={otpCode}
                onChangeText={(text) => {
                  // Only allow digits and limit to 6 characters
                  const numericText = text.replace(/[^0-9]/g, '');
                  if (numericText.length <= 6) {
                    setOtpCode(numericText);
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
                accessibilityLabel="OTP input field"
                accessibilityHint="Enter the 6-digit verification code"
              />
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              activeOpacity={0.8}
              disabled={loading || otpCode.length !== 6}
              accessibilityLabel="Verify OTP button"
              accessibilityHint="Tap to verify your phone number"
            >
              <Text style={styles.verifyButtonText}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>
                Didn&apos;t receive the code?{' '}
              </Text>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  activeOpacity={0.7}
                  accessibilityLabel="Resend OTP"
                  accessibilityHint="Send a new verification code"
                >
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>
                  Resend in {resendTimer}s
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              accessibilityLabel="Back button"
              accessibilityHint="Return to phone number entry"
            >
              <Text style={styles.backButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>

          {/* reCAPTCHA container for web */}
          {Platform.OS === 'web' && (
            <View id="recaptcha-container" style={styles.recaptchaContainer} />
          )}
        </ScrollView>

        {/* Firebase reCAPTCHA Verifier Modal for mobile */}
        {isFirebaseInitialized && (
          <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifier}
            firebaseConfig={firebaseConfig}
            attemptInvisibleVerification={true}
          />
        )}
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
      marginHorizontal: 'auto',
      width: '100%',
    } : {}),
  },
  headerContainer: {
    marginTop: Platform.OS === 'web' ? 40 : 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: Platform.OS === 'web' ? 32 : 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#fafafa',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none' as any,
    } : {}),
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      textDecorationLine: 'underline',
    } : {}),
  },
  resendTimer: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  recaptchaContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default PhoneOTPScreen;