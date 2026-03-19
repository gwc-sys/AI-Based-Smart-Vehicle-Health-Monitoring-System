import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { VehicleProvider } from '../context/VehicleContext';
import { initFirebase } from '../services/firebaseConfig';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize Firebase FIRST before anything else
        console.log('[RootLayout] Initializing Firebase...');
        const { initialized } = initFirebase();

        if (!initialized) {
          setFirebaseError('Firebase initialization failed. Please check your configuration.');
          console.error('[RootLayout] Firebase initialization failed');
        } else {
          console.log('[RootLayout] Firebase initialized successfully');
          setIsFirebaseReady(true);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during Firebase initialization';
        setFirebaseError(errorMessage);
        console.error('[RootLayout] Error initializing Firebase:', error);
      } finally {
        // Hide splash screen after Firebase initialization attempt
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, []);

  // If Firebase failed to initialize, show error
  if (firebaseError) {
    return (
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    );
  }

  // Don't render app until Firebase is ready
  if (!isFirebaseReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <VehicleProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}>
            <Stack.Screen name="index" />
          </Stack>
        </VehicleProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
