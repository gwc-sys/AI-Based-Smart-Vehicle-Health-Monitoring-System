import LoginScreen from '@/screens/LoginScreen';
import PhoneOTPScreen from '@/screens/PhoneOTPScreen';
import PrivacyPolicyScreen from '@/screens/PrivacyPolicyScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import TermsOfServiceScreen from '@/screens/TermsOfServiceScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

export type AuthStackParamList = {
  Login: undefined;
  Register:
    | {
        agreedTerms?: boolean;
        agreedPrivacy?: boolean;
      }
    | undefined;
  PhoneOTP:
    | {
        verificationId?: string;
        phoneNumber?: string;
        fullName?: string;
        email?: string;
        password?: string;
      }
    | undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PhoneOTP" component={PhoneOTPScreen} />
      <Stack.Screen name="PrivacyPolicy">
        {({ navigation }) => (
          <PrivacyPolicyScreen
            onAgree={() => {
              navigation.navigate('Register', { agreedPrivacy: true });
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="TermsOfService">
        {({ navigation }) => (
          <TermsOfServiceScreen
            onAgree={() => {
              navigation.navigate('Register', { agreedTerms: true });
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
