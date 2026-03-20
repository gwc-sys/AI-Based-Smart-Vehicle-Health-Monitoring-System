import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/context/AuthContext';
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
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    initializeApp();
  }, []);

  if (!isFirebaseReady && !firebaseError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <VehicleProvider>
            <NavigationContainer>
              <AppNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </VehicleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
