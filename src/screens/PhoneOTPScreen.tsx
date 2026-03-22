import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuth from '../hooks/useAuth';
import { prepareWebRecaptchaVerifier } from '../services/firebaseConfig';
import { isValidE164PhoneNumber, normalizePhoneNumber, sanitizeOtpCode } from '../utils/phoneAuth';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface PhoneOTPScreenProps {}

const RESEND_WAIT_SECONDS = 30;
const MAX_OTP_SENDS = 3;
const OTP_LOCK_MINUTES = 30;
const WEB_RECAPTCHA_CONTAINER_ID = 'phone-otp-recaptcha-container';

const PhoneOTPScreen: React.FC<PhoneOTPScreenProps> = () => {
  const [otpCode, setOtpCode] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(RESEND_WAIT_SECONDS);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [webRecaptchaError, setWebRecaptchaError] = useState<string | null>(null);
  const [otpSendCount, setOtpSendCount] = useState<number>(0);
  const [isOtpLimitReached, setIsOtpLimitReached] = useState<boolean>(false);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sendPhoneOTP, signOut, verifyPhoneOTP } = useAuth();
  const phoneNumber = normalizePhoneNumber(route.params?.phoneNumber ?? '');
  const verificationId = route.params?.verificationId;
  const authMode: 'signIn' | 'signUp' = route.params?.authMode === 'signUp' ? 'signUp' : 'signIn';
  const isOtpSent = !!verificationId;

  useEffect(() => {
    if (verificationId) {
      setOtpSendCount((count) => (count === 0 ? 1 : count));
    }
  }, [verificationId]);

  useEffect(() => {
    const initializeWebRecaptcha = async () => {
      if (Platform.OS !== 'web') {
        return;
      }

      setWebRecaptchaError(null);

      try {
        await prepareWebRecaptchaVerifier(WEB_RECAPTCHA_CONTAINER_ID);
      } catch (error) {
        setWebRecaptchaError((error as Error).message || 'Failed to load reCAPTCHA.');
      }
    };

    initializeWebRecaptcha();
  }, []);

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

  const sendOtp = useCallback(async () => {
    if (!phoneNumber) return;
    if (!isValidE164PhoneNumber(phoneNumber)) {
      Alert.alert('Invalid phone number', 'Please enter a valid phone number in international format (e.g., +1234567890).');
      navigateBackSafely();
      return;
    }

    setIsSendingOtp(true);
    try {
      const { verificationId: nextVerificationId } = await sendPhoneOTP(
        phoneNumber,
      );

      setOtpSendCount((count) => count + 1);
      setResendTimer(RESEND_WAIT_SECONDS);
      setCanResend(false);
      setOtpCode('');

      navigation.setParams({
        verificationId: nextVerificationId,
        phoneNumber,
        authMode,
      });

      if (!verificationId) {
        Alert.alert('OTP sent', 'We sent a verification code to your mobile number.');
      } else {
        Alert.alert('Success', 'OTP sent successfully!');
      }
    } catch (err) {
      Alert.alert('Failed to send OTP', (err as Error).message || 'Unable to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  }, [
    authMode,
    navigation,
    navigateBackSafely,
    phoneNumber,
    sendPhoneOTP,
    verificationId,
  ]);

  useEffect(() => {
    if (isOtpLimitReached) {
      setCanResend(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isOtpSent && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    } else if (isOtpSent) {
      setCanResend(true);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isOtpLimitReached, isOtpSent, resendTimer]);

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
      Alert.alert('Error', 'Send the OTP first, then enter the verification code.');
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
    if (isOtpLimitReached || otpSendCount >= MAX_OTP_SENDS) {
      blurFocusedElement();
      setCanResend(false);
      setIsOtpLimitReached(true);
      Alert.alert('OTP Limit Reached', `You have reached the OTP limit. Please try again after ${OTP_LOCK_MINUTES} minutes.`);
      return;
    }

    await sendOtp();
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
              {isOtpSent
                ? `Enter the 6-digit code sent to\n${phoneNumber}`
                : `Complete verification for\n${phoneNumber}`}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {Platform.OS === 'web' && (
              <>
                <View
                  nativeID={WEB_RECAPTCHA_CONTAINER_ID}
                  style={styles.webRecaptchaContainer}
                  {...({ id: WEB_RECAPTCHA_CONTAINER_ID } as any)}
                />
                {webRecaptchaError && (
                  <Text style={styles.errorText}>{webRecaptchaError}</Text>
                )}
              </>
            )}

            {!isOtpSent && <Text style={styles.errorText}>OTP session missing. Please go back and send OTP again.</Text>}

            {isOtpSent && (
              <>
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
              </>
            )}

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
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  errorText: {
    marginBottom: 20,
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
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
