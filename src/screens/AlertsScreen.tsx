import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';

type AlertItem = {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  seen: boolean;
  createdAt: string;
};

const mockAlerts: AlertItem[] = [
  { id: '1', title: 'Engine temperature', message: 'Engine temperature high', level: 'warning', seen: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Tire pressure', message: 'Low tire pressure detected', level: 'info', seen: true, createdAt: new Date().toISOString() },
  { id: '3', title: 'Brake alert', message: 'Brake pad wear critical', level: 'critical', seen: false, createdAt: new Date().toISOString() },
];

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    // load alerts (replace with API call)
    setAlerts(mockAlerts);
  }, []);

  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, seen: true } : a)));
  };

  const dismissAlert = (id: string) => {
    Alert.alert('Dismiss alert', 'Are you sure you want to dismiss this alert?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', style: 'destructive', onPress: () => setAlerts(prev => prev.filter(a => a.id !== id)) },
    ]);
  };

  const renderLevelColor = (level: AlertItem['level']) => {
    switch (level) {
      case 'critical':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      default:
        return Colors.light.tint;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Alerts</Text>

        {alerts.length === 0 ? (
          <Text style={styles.empty}>No alerts</Text>
        ) : (
          alerts.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.levelDot, { backgroundColor: renderLevelColor(a.level) }]} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.alertTitle}>{a.title}</Text>
                  <Text style={styles.alertMessage}>{a.message}</Text>
                  <Text style={styles.alertTime}>{new Date(a.createdAt).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {!a.seen && (
                  <TouchableOpacity onPress={() => markAsRead(a.id)} style={styles.iconButton}>
                    <Ionicons name="checkmark-done-outline" size={20} color={Colors.light.tint} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => dismissAlert(a.id)} style={styles.iconButton}>
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 12 },
  empty: { color: Colors.light.icon },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  alertMessage: { fontSize: 12, color: Colors.light.icon },
  alertTime: { fontSize: 11, color: Colors.light.icon, marginTop: 6 },
  cardActions: { flexDirection: 'row', marginLeft: 8 },
  iconButton: { padding: 8 },
});
