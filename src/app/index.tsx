import { StatusBar } from 'expo-status-bar';
import React from 'react';
import AppNavigator from '../navigation/AppNavigator';

export default function Page() {
  // Firebase is already initialized in root _layout.tsx
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}

