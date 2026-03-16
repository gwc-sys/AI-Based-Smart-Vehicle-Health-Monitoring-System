import LoginScreen from '@/screens/LoginScreen';
import PhoneOTPScreen from '@/screens/PhoneOTPScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="PhoneOTP" component={PhoneOTPScreen} />
    </Stack.Navigator>
  );
}
