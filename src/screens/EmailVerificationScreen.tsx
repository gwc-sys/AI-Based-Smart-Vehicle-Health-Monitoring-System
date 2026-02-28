import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
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
    View
} from 'react-native';
import useAuth from '../hooks/useAuth';

interface EmailVerificationScreenProps {}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = () => {
  const [email, setEmail] = useState<string>('');
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { verifyEmail, sendVerificationEmail } = useAuth();

  useEffect(() => {
    // capture deep link parameters
    if (route.params?.email) {
      setEmail(route.params.email);
    }
    // Firebase verification links typically include an `oobCode` query param
    const tokenFromLink = route.params?.token || route.params?.oobCode;
    if (tokenFromLink) {
      setVerificationToken(tokenFromLink);
      // Auto-verify when a code is provided
      handleAutoVerify(tokenFromLink);
    }
  }, [route.params]);

  const handleAutoVerify = async (token: string): Promise<void> => {
    if (!token) return;

    setIsVerifying(true);
    try {
      await verifyEmail(token);
      Alert.alert('Success', 'Email verified successfully!', [
        {
          text: 'Login',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (err) {
      Alert.alert('Verification failed', (err as Error).message || 'Unable to verify email');
      setIsVerifying(false);
    }
  };

  const handleVerifyToken = async (): Promise<void> => {
    if (!verificationToken.trim()) {
      Alert.alert('Validation', 'Please enter the verification token');
      return;
    }

    try {
      setIsVerifying(true);
      await verifyEmail(verificationToken.trim());
      Alert.alert('Success', 'Email verified! You can now login.', [
        {
          text: 'Go to Login',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (err) {
      Alert.alert('Verification failed', (err as Error).message || 'Unable to verify email');
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async (): Promise<void> => {
    if (!email) {
      Alert.alert('Error', 'Email address is required');
      return;
    }

    try {
      setIsVerifying(true);
      await sendVerificationEmail(email);
      setTimeLeft(600); // Reset timer
      Alert.alert('Success', 'Verification email sent! Check your inbox.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to send verification email');
      setIsVerifying(false);
    }
  };

  const handleGoToLogin = (): void => {
    navigation.navigate('Login');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✉️</Text>
            </View>
            <Text style={styles.welcomeText}>Check Your Email</Text>
            <Text style={styles.subtitleText}>
              We've sent a verification link to:
            </Text>
            <Text style={styles.emailText}>{email || 'your email'}</Text>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What to do next:</Text>
              
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Check your inbox for the verification email</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>Click the verification link in the email</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>You'll be able to login once verified</Text>
              </View>
            </View>

            <View style={styles.tokenInputContainer}>
              <Text style={styles.tokenLabel}>Or enter verification token:</Text>
              <TextInput
                style={styles.tokenInput}
                placeholder="Enter token from email"
                placeholderTextColor="#999"
                value={verificationToken}
                onChangeText={setVerificationToken}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
                onPress={handleVerifyToken}
                disabled={isVerifying}
                activeOpacity={0.8}
              >
                <Text style={styles.verifyButtonText}>
                  {isVerifying ? 'Verifying...' : 'Verify Token'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>💡 Tip</Text>
              <Text style={styles.infoBoxText}>
                The link expires in {formatTime(timeLeft)}. If the link expires, you can request a new one below.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.resendButton, isVerifying && styles.buttonDisabled]}
              onPress={handleResendEmail}
              disabled={isVerifying}
              activeOpacity={0.8}
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel="Resend verification email"
              accessibilityHint="Tap to send verification email again"
            >
              <Text style={styles.resendButtonText}>
                {isVerifying ? 'Sending...' : 'Resend Verification Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleGoToLogin}
              activeOpacity={0.8}
              {...(Platform.OS === 'web' ? { type: 'button' } : {})}
              accessibilityLabel="Sign in with verified email"
              accessibilityHint="Go to login screen"
            >
              <Text style={styles.loginButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Didn't receive the email? Check your spam folder or contact support.
            </Text>
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  welcomeText: {
    fontSize: Platform.OS === 'web' ? 36 : 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    marginBottom: 24,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tokenInputContainer: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    height: Platform.OS === 'web' ? 52 : 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  resendButton: {
    backgroundColor: '#F5F5F5',
    height: Platform.OS === 'web' ? 52 : 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
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
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerContainer: {
    marginTop: 'auto',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EmailVerificationScreen;
