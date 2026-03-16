import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { VehicleProvider } from '../context/VehicleContext';
import AppNavigator from '../navigation/AppNavigator';
import { initFirebase } from '../services/firebaseConfig';


export default function Page() {
  // ensure firebase (JS SDK) is initialized on web/any JS runtime
  initFirebase();

  return (
    <AuthProvider>
      <VehicleProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </VehicleProvider>
    </AuthProvider>
  );
}

