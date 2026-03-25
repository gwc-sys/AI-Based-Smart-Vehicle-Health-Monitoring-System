import useAuth from '@/hooks/useAuth';
import { useAppTheme } from '@/context/ThemeContext';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Preferences = {
  notifications: boolean;
  darkMode: boolean;
  language: string;
  measurementUnit: 'metric' | 'imperial';
};

export default function SettingsScreen() {
  const { user, updateUserPreferences } = useAuth();
  const { colors, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(colors);
  const [prefs, setPrefs] = useState<Preferences>({ notifications: true, darkMode: false, language: 'en', measurementUnit: 'metric' });

  useEffect(() => {
    // in a real app load preferences from API or AsyncStorage
    setPrefs(prev => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  const togglePref = async (key: keyof Preferences, value: any) => {
    const next = { ...prefs, [key]: value } as Preferences;
    setPrefs(next);
    try {
      if (key === 'darkMode') {
        await setDarkMode(Boolean(value));
      }
      await updateUserPreferences(next);
    } catch {
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Push Notifications</Text>
          <Switch value={prefs.notifications} onValueChange={(v) => togglePref('notifications', v)} trackColor={{ true: colors.tint, false: '#767577' }} />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch value={prefs.darkMode} onValueChange={(v) => togglePref('darkMode', v)} trackColor={{ true: colors.tint, false: '#767577' }} />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Measurement Unit</Text>
          <View style={styles.unitRow}>
            <TouchableOpacity style={[styles.unit, prefs.measurementUnit === 'metric' && styles.unitSelected]} onPress={() => togglePref('measurementUnit', 'metric')}>
              <Text style={[styles.unitText, prefs.measurementUnit === 'metric' && styles.unitTextSelected]}>Metric</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.unit, prefs.measurementUnit === 'imperial' && styles.unitSelected]} onPress={() => togglePref('measurementUnit', 'imperial')}>
              <Text style={[styles.unitText, prefs.measurementUnit === 'imperial' && styles.unitTextSelected]}>Imperial</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={() => Alert.alert('Cache cleared')}> 
          <Text style={styles.clearText}>Clear App Cache</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Signed in as {user?.phone || user?.name || 'Phone user'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  card: string;
  tint: string;
  text: string;
  icon: string;
  border: string;
  mutedSurface: string;
}) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 14, color: colors.text },
    unitRow: { flexDirection: 'row' },
    unit: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginLeft: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitSelected: { backgroundColor: colors.tint, borderColor: colors.tint },
    unitText: { color: colors.text },
    unitTextSelected: { color: '#fff', fontWeight: '700' },
    clearButton: { marginTop: 20, padding: 12, backgroundColor: colors.mutedSurface, borderRadius: 8, alignItems: 'center' },
    clearText: { color: colors.text },
    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { fontSize: 12, color: colors.icon },
  });
