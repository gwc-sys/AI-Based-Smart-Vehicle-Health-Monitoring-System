import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import SplashScreen from '../screens/SplashScreen';
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

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="MainApp" component={BottomTabNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
