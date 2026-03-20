import { useNavigation, useRoute } from '@react-navigation/native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import firebaseConfig from '../services/firebaseConfig';
import { isValidE164PhoneNumber, normalizePhoneNumber, sanitizeOtpCode } from '../utils/phoneAuth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface PhoneOTPScreenProps {}

const RESEND_WAIT_SECONDS = 30;
const MAX_OTP_SENDS = 3;
const OTP_LOCK_MINUTES = 30;

const PhoneOTPScreen: React.FC<PhoneOTPScreenProps> = () => {
  const [otpCode, setOtpCode] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(RESEND_WAIT_SECONDS);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState<boolean>(Platform.OS === 'web');
  const [otpSendCount, setOtpSendCount] = useState<number>(0);
  const [isOtpLimitReached, setIsOtpLimitReached] = useState<boolean>(false);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sendPhoneOTP, signOut, verifyPhoneOTP } = useAuth();

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);
  const hasRequestedInitialOtp = useRef<boolean>(false);
  const usesNativeRecaptcha = Platform.OS !== 'web';

  const phoneNumber = normalizePhoneNumber(route.params?.phoneNumber ?? '');
  const verificationId = route.params?.verificationId;
  const authMode: 'signIn' | 'signUp' = route.params?.authMode === 'signUp' ? 'signUp' : 'signIn';

  const blurFocusedElement = useCallback(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, []);

  const navigateBackSafely = useCallback(() => {
    blurFocusedElement();
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(authMode === 'signUp' ? 'Register' : 'Login');
  }, [authMode, blurFocusedElement, navigation]);

  useEffect(() => {
    if (isOtpLimitReached) {
      setCanResend(false);
      return;
    }

    let timer: number;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [isOtpLimitReached, resendTimer]);

  useEffect(() => {
    const sendInitialOTP = async () => {
      if (!phoneNumber || hasRequestedInitialOtp.current) return;
      if (usesNativeRecaptcha && (!isRecaptchaReady || !recaptchaVerifier.current)) return;
      if (!isValidE164PhoneNumber(phoneNumber)) {
        Alert.alert('Invalid phone number', 'Please enter a valid phone number in international format (e.g., +1234567890).');
        navigateBackSafely();
        return;
      }

      hasRequestedInitialOtp.current = true;
      setIsSendingOtp(true);

      try {
        const { verificationId: nextVerificationId } = await sendPhoneOTP(
          phoneNumber,
          usesNativeRecaptcha ? recaptchaVerifier.current : undefined,
        );

        setOtpSendCount(1);
        setResendTimer(RESEND_WAIT_SECONDS);
        setCanResend(false);

        navigation.setParams({
          verificationId: nextVerificationId,
          phoneNumber,
          authMode,
        });
      } catch (err) {
        hasRequestedInitialOtp.current = false;
        blurFocusedElement();
        Alert.alert('Failed to send OTP', (err as Error).message || 'Unable to send OTP');
        navigateBackSafely();
      } finally {
        setIsSendingOtp(false);
      }
    };

    if (phoneNumber && !verificationId) {
      sendInitialOTP();
    }
  }, [
    authMode,
    blurFocusedElement,
    isRecaptchaReady,
    navigateBackSafely,
    navigation,
    phoneNumber,
    sendPhoneOTP,
    usesNativeRecaptcha,
    verificationId,
  ]);

  useEffect(() => {
    return () => {
      blurFocusedElement();
    };
  }, [blurFocusedElement]);

  const handleVerifyOTP = async (): Promise<void> => {
    const sanitizedCode = sanitizeOtpCode(otpCode);

    if (sanitizedCode.length !== 6) {
      Alert.alert('Validation', 'Please enter a valid 6-digit OTP code');
      return;
    }

    if (!verificationId) {
      Alert.alert('Error', 'OTP verification session expired. Please try again.');
      navigateBackSafely();
      return;
    }

    try {
      blurFocusedElement();
      setIsVerifyingOtp(true);

      const result = await verifyPhoneOTP(verificationId, sanitizedCode);

      if (authMode === 'signUp' && !result.isNewUser) {
        await signOut();
        Alert.alert('Account exists', 'This mobile number is already registered. Please sign in instead.');
        navigation.navigate('Login');
        return;
      }

      if (authMode === 'signIn' && result.isNewUser) {
        await signOut();
        Alert.alert('Account not found', 'No account exists for this mobile number. Please sign up first.');
        navigation.navigate('Register');
        return;
      }

      Alert.alert(
        'Success',
        authMode === 'signUp'
          ? 'Phone number verified. Please complete your profile.'
          : 'Phone number verified successfully!'
      );
    } catch (err) {
      Alert.alert('Verification failed', (err as Error).message || 'Unable to verify OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOTP = async (): Promise<void> => {
    if (!canResend || !phoneNumber) return;
    if (usesNativeRecaptcha && !recaptchaVerifier.current) return;
    if (!isValidE164PhoneNumber(phoneNumber)) {
      Alert.alert('Invalid phone number', 'Please re-enter your phone number in international format.');
      navigateBackSafely();
      return;
    }
    if (isOtpLimitReached || otpSendCount >= MAX_OTP_SENDS) {
      blurFocusedElement();
      setCanResend(false);
      setIsOtpLimitReached(true);
      Alert.alert('OTP Limit Reached', `You have reached the OTP limit. Please try again after ${OTP_LOCK_MINUTES} minutes.`);
      return;
    }

    setIsSendingOtp(true);
    try {
      blurFocusedElement();
      const { verificationId: nextVerificationId } = await sendPhoneOTP(
        phoneNumber,
        usesNativeRecaptcha ? recaptchaVerifier.current : undefined,
      );
      const nextSendCount = otpSendCount + 1;
      setOtpSendCount(nextSendCount);
      setOtpCode('');

      if (nextSendCount >= MAX_OTP_SENDS) {
        setCanResend(false);
        setIsOtpLimitReached(true);
        Alert.alert('OTP Sent', `OTP sent successfully. You have reached the OTP limit. Please try again after ${OTP_LOCK_MINUTES} minutes.`);
      } else {
        setResendTimer(RESEND_WAIT_SECONDS);
        setCanResend(false);
        Alert.alert('Success', 'OTP sent successfully!');
      }

      navigation.setParams({
        verificationId: nextVerificationId,
        phoneNumber,
        authMode,
      });
    } catch (err) {
      Alert.alert('Failed to resend OTP', (err as Error).message || 'Unable to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
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
            {Platform.OS === 'web' && (
              <View
                nativeID="recaptcha-container"
                style={styles.webRecaptchaContainer}
                {...({ id: 'recaptcha-container' } as any)}
              />
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>OTP Code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#999"
                value={otpCode}
                onChangeText={(text) => setOtpCode(sanitizeOtpCode(text))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={Platform.OS !== 'web'}
                accessibilityLabel="OTP input field"
                accessibilityHint="Enter the 6-digit verification code"
              />
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, isVerifyingOtp && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              activeOpacity={0.8}
              disabled={isVerifyingOtp || isSendingOtp || otpCode.length !== 6}
              accessibilityLabel="Verify OTP button"
              accessibilityHint="Tap to verify your phone number"
            >
              <Text style={styles.verifyButtonText}>
                {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
              {isOtpLimitReached ? (
                <Text style={styles.limitMessage}>
                  Your OTP limit has been reached. Try again after 30 minutes.
                </Text>
              ) : canResend ? (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  activeOpacity={0.7}
                  disabled={isSendingOtp || isVerifyingOtp}
                  accessibilityLabel="Resend OTP"
                  accessibilityHint="Send a new verification code"
                >
                  <Text style={styles.resendLink}>{isSendingOtp ? 'Sending...' : 'Resend OTP'}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={navigateBackSafely}
              activeOpacity={0.7}
              accessibilityLabel="Back button"
              accessibilityHint="Return to phone number entry"
            >
              <Text style={styles.backButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {usesNativeRecaptcha && (
          <FirebaseRecaptchaVerifierModal
            ref={(instance) => {
              recaptchaVerifier.current = instance;
              setIsRecaptchaReady(!!instance);
            }}
            firebaseConfig={firebaseConfig}
            attemptInvisibleVerification={false}
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
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 500,
          marginHorizontal: 'auto',
          width: '100%',
        }
      : {}),
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
  webRecaptchaContainer: {
    minHeight: 78,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {}),
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer', textDecorationLine: 'underline' } : {}),
  },
  resendTimer: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  limitMessage: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
});

export default PhoneOTPScreen;
