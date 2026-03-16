import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SplashScreen from '../screens/SplashScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Keep splash visible for at least 20 seconds, but also while auth is loading.
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 20000);
    return () => clearTimeout(timer);
  }, []);

  // Show splash if auth is still loading OR the minimum splash time hasn't elapsed.
  if (showSplash || loading) {
    return <SplashScreen />;
  }

  // treat user as authenticated if they exist
  const isAuthenticated = !!user;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="MainApp" component={BottomTabNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
      <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <RootStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
    </RootStack.Navigator>
  );
}
