import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import AppNavigator from '../navigation/AppNavigator';

export default function Page() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

