import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

const PREFERENCES_STORAGE_KEY = 'userPreferences';

type ThemeMode = 'light' | 'dark';
type ThemeColors = (typeof Colors)[ThemeMode];

type ThemeContextType = {
  colors: ThemeColors;
  isDarkMode: boolean;
  themeMode: ThemeMode;
  setDarkMode: (value: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkModeState] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (storedValue) {
          const parsed = JSON.parse(storedValue) as { darkMode?: boolean };
          if (typeof parsed.darkMode === 'boolean') {
            setIsDarkModeState(parsed.darkMode);
            setIsReady(true);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load dark mode preference:', error);
      }

      setIsDarkModeState(true);
      setIsReady(true);
    };

    loadPreference().catch(() => undefined);
  }, [systemColorScheme]);

  const setDarkMode = async (value: boolean) => {
    try {
      const storedValue = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      const parsed = storedValue ? JSON.parse(storedValue) : {};
      await AsyncStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ ...parsed, darkMode: value })
      );
    } catch (error) {
      console.error('Failed to save dark mode preference:', error);
    }

    setIsDarkModeState(value);
  };

  const value = useMemo<ThemeContextType>(() => {
    const themeMode: ThemeMode = isDarkMode ? 'dark' : 'light';
    return {
      colors: Colors[themeMode],
      isDarkMode,
      themeMode,
      setDarkMode,
    };
  }, [isDarkMode]);

  if (!isReady) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
}
