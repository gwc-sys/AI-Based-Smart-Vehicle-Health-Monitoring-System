import useAuth from '@/hooks/useAuth';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/theme';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { vehicles, loading, refresh } = useVehicleData();

  useEffect(() => {
    // refresh vehicles when screen mounts
    refresh().catch(() => {});
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Hello{user?.name ? `, ${user.name}` : ''} 👋</Text>

        <View style={styles.quickRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Vehicles</Text>
            <Text style={styles.cardValue}>{vehicles?.length ?? 0}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Alerts</Text>
            <Text style={styles.cardValue}>—</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Predictions</Text>
            <Text style={styles.cardValue}>—</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('VehicleDetail')}>
            <Text style={styles.actionText}>Add Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Prediction')}>
            <Text style={styles.actionText}>Run Prediction</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => refresh()}>
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Vehicles</Text>
          {loading ? (
            <Text style={styles.small}>Loading...</Text>
          ) : vehicles && vehicles.length > 0 ? (
            vehicles.slice(0, 3).map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.vehicleRow}
                onPress={() => navigation.navigate('VehicleDetail', { id: v.id })}
              >
                <Text style={styles.vehicleTitle}>{v.make ?? 'Unknown'} {v.model ?? ''}</Text>
                <Text style={styles.vehicleMeta}>{v.year ?? ''} • {v.plateNumber ?? '—'}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.small}>No vehicles registered yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.background },
  container: { padding: 20 },
  greeting: { fontSize: 20, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  card: { flex: 1, backgroundColor: '#fff', marginHorizontal: 6, padding: 12, borderRadius: 8, alignItems: 'center' },
  cardLabel: { fontSize: 12, color: Colors.light.icon },
  cardValue: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginTop: 6 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionButton: { backgroundColor: Colors.light.tint, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  vehicleRow: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  vehicleTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  vehicleMeta: { fontSize: 12, color: Colors.light.icon, marginTop: 4 },
  small: { color: Colors.light.icon },
});
