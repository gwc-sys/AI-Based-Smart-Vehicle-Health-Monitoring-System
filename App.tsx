import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { VehicleProvider } from '@/context/VehicleContext';
import { initFirebase } from '@/services/firebaseConfig';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        const { initialized } = initFirebase();

        if (!initialized) {
          setFirebaseError('Firebase initialization failed. Please check your configuration.');
          return;
        }

        setIsFirebaseReady(true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during Firebase initialization';
        setFirebaseError(errorMessage);
      }
    }

    initializeApp();
  }, []);

  useEffect(() => {
    if (!isFirebaseReady && !firebaseError) {
      return;
    }

    SplashScreen.hideAsync().catch(() => {
      // Ignore hide errors if the splash screen has already been dismissed.
    });
  }, [firebaseError, isFirebaseReady]);

  if (!isFirebaseReady && !firebaseError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { colors, isDarkMode } = useAppTheme();

  const navigationTheme = isDarkMode
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.tint,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.tint,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.tint,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.tint,
        },
      };

  return (
    <AuthProvider>
      <VehicleProvider>
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        </NavigationContainer>
      </VehicleProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
