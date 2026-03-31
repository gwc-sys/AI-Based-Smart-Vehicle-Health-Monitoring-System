import AppIcon from '@/components/AppIcon';
import { useAppTheme } from '@/context/ThemeContext';
import { requestPermissions, sendImmediateNotification } from '@/services/notificationService';
import { subscribeToVehicleAlerts, VehicleRealtimeAlert } from '@/services/vehicleRealtimeService';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AlertItem = {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  seen: boolean;
  createdAt: string | null;
  rawTimestamp?: number;
  type: string;
  deviceId: string;
};

function isEpochTimestamp(timestamp?: number) {
  return typeof timestamp === 'number' && timestamp > 1000000000;
}

function formatAlertTime(timestamp?: number) {
  if (typeof timestamp !== 'number') {
    return 'Waiting for timestamp';
  }

  if (isEpochTimestamp(timestamp)) {
    return new Date(timestamp).toLocaleString('en-IN');
  }

  return `Realtime #${timestamp}`;
}

function mapRealtimeAlert(alert: VehicleRealtimeAlert): AlertItem {
  const normalizedType = String(alert.type ?? 'info').toLowerCase();
  const isSos = normalizedType === 'sos';

  return {
    id: alert.id ?? `${normalizedType}-${alert.timestamp ?? Date.now()}-${alert.message ?? 'alert'}`,
    title: isSos ? 'SOS Emergency Alert' : normalizedType.toUpperCase(),
    message: alert.message ?? 'Vehicle alert received',
    level: isSos ? 'critical' : normalizedType === 'warning' ? 'warning' : 'info',
    seen: false,
    createdAt: isEpochTimestamp(alert.timestamp) ? new Date(alert.timestamp as number).toISOString() : null,
    rawTimestamp: alert.timestamp,
    type: normalizedType,
    deviceId: alert.device_id ?? 'Unknown device',
  };
}

export default function AlertsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    let previousTopAlertId: string | null = null;
    let hasLoadedInitialSnapshot = false;

    requestPermissions().catch(() => undefined);

    const unsubscribe = subscribeToVehicleAlerts((realtimeAlerts) => {
      const nextAlerts = realtimeAlerts.map(mapRealtimeAlert);
      const latestAlert = nextAlerts[0];

      if (
        hasLoadedInitialSnapshot &&
        latestAlert &&
        latestAlert.type === 'sos' &&
        latestAlert.id !== previousTopAlertId
      ) {
        sendImmediateNotification('SOS Alert', latestAlert.message).catch(() => undefined);
      }

      previousTopAlertId = latestAlert?.id ?? null;
      hasLoadedInitialSnapshot = true;
      setAlerts((currentAlerts) =>
        nextAlerts.map((nextAlert) => {
          const existing = currentAlerts.find((item) => item.id === nextAlert.id);
          return existing ? { ...nextAlert, seen: existing.seen } : nextAlert;
        })
      );
    });

    return unsubscribe;
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
        return colors.tint;
    }
  };

  const renderCardStyle = (alert: AlertItem) => {
    if (alert.type === 'sos') {
      return {
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        borderColor: '#FF3B30',
      };
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Alerts</Text>

        {alerts.length === 0 ? (
          <Text style={styles.empty}>No alerts</Text>
        ) : (
          alerts.map((a) => (
            <View key={a.id} style={[styles.card, renderCardStyle(a), !a.seen && styles.unseenCard]}>
              <View style={styles.cardLeft}>
                <View style={[styles.levelDot, { backgroundColor: renderLevelColor(a.level) }]} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.alertTitle, a.type === 'sos' && styles.sosTitle]}>{a.title}</Text>
                  <Text style={[styles.alertMessage, a.type === 'sos' && styles.sosMessage]}>{a.message}</Text>
                  <Text style={styles.deviceText}>{a.deviceId}</Text>
                  <Text style={styles.alertTime}>
                    {formatAlertTime(a.createdAt ? Date.parse(a.createdAt) : a.rawTimestamp)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {!a.seen && (
                  <TouchableOpacity onPress={() => markAsRead(a.id)} style={styles.iconButton}>
                    <AppIcon name="checkmark-done-outline" size={20} color={colors.tint} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => dismissAlert(a.id)} style={styles.iconButton}>
                  <AppIcon name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  card: string;
  text: string;
  icon: string;
  border: string;
}) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
    empty: { color: colors.icon },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unseenCard: {
      shadowColor: '#FF3B30',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    levelDot: { width: 12, height: 12, borderRadius: 6 },
    alertTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    sosTitle: { color: '#C62828' },
    alertMessage: { fontSize: 12, color: colors.icon },
    sosMessage: { color: '#8E1C1C', fontWeight: '600' },
    deviceText: { fontSize: 11, color: colors.icon, marginTop: 4 },
    alertTime: { fontSize: 11, color: colors.icon, marginTop: 6 },
    cardActions: { flexDirection: 'row', marginLeft: 8 },
    iconButton: { padding: 8 },
  });
