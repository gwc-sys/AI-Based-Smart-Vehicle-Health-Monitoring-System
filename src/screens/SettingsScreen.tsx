import useAuth from '@/hooks/useAuth';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';

type Preferences = {
  notifications: boolean;
  darkMode: boolean;
  language: string;
  measurementUnit: 'metric' | 'imperial';
};

export default function SettingsScreen() {
  const { user, updateUserPreferences } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>({ notifications: true, darkMode: false, language: 'en', measurementUnit: 'metric' });

  useEffect(() => {
    // in a real app load preferences from API or AsyncStorage
  }, []);

  const togglePref = (key: keyof Preferences, value: any) => {
    const next = { ...prefs, [key]: value } as Preferences;
    setPrefs(next);
    try {
      updateUserPreferences(next);
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
          <Switch value={prefs.notifications} onValueChange={(v) => togglePref('notifications', v)} trackColor={{ true: Colors.light.tint, false: '#767577' }} />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Dark Mode</Text>
          <Switch value={prefs.darkMode} onValueChange={(v) => togglePref('darkMode', v)} trackColor={{ true: Colors.light.tint, false: '#767577' }} />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, color: Colors.light.text },
  unitRow: { flexDirection: 'row' },
  unit: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  unitSelected: { backgroundColor: Colors.light.tint },
  unitText: { color: Colors.light.text },
  unitTextSelected: { color: '#fff', fontWeight: '700' },
  clearButton: { marginTop: 20, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' },
  clearText: { color: Colors.light.text },
  footer: { marginTop: 30, alignItems: 'center' },
  footerText: { fontSize: 12, color: Colors.light.icon },
});
