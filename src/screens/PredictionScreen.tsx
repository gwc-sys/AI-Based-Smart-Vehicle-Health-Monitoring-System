import { usePrediction } from '@/hooks/usePrediction';
import { useVehicleData } from '@/hooks/useVehicleData';
import { useAppTheme } from '@/context/ThemeContext';
import {
  HospitalAiRecommendation,
  subscribeToVehicleAlerts,
  VehicleRealtimeAlert,
} from '@/services/vehicleRealtimeService';
import { buildCallLink, buildDirectionsLink, buildGoogleMapsLink } from '@/services/emergencyConfigService';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatLiveTimestamp(timestamp?: number, receivedAt?: number) {
  const normalizedTimestamp =
    typeof timestamp === 'number' && Number.isFinite(timestamp)
      ? timestamp > 1000000000000
        ? timestamp
        : timestamp > 1000000000
          ? timestamp * 1000
          : undefined
      : undefined;
  const sourceTime = normalizedTimestamp ?? receivedAt;

  if (typeof sourceTime !== 'number') {
    return 'Waiting';
  }

  const diffMs = Date.now() - sourceTime;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds} sec ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function formatDateString(value?: string) {
  if (!value) return 'Awaiting selection';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hexToRgba(hex: string, opacity: number) {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function PredictionScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { predict, loading } = usePrediction();
  const { vehicles } = useVehicleData();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(vehicles?.[0]?.id ?? null);
  const [mileage, setMileage] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<VehicleRealtimeAlert[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToVehicleAlerts(setAlerts);
    return () => unsubscribe();
  }, []);

  const latestAiAlert = useMemo(() => {
    const current = alerts.find((a) => a.fromCurrentEmergency);
    if (current) return current;
    return alerts[0] ?? null;
  }, [alerts]);

  const aiHospital: HospitalAiRecommendation | null = useMemo(() => {
    if (!latestAiAlert) return null;
    const source = latestAiAlert.aiHospital;
    const fallback: HospitalAiRecommendation = {
      name: latestAiAlert.hospital_name,
      address: latestAiAlert.hospital_address,
      distance_km: latestAiAlert.hospital_distance_km,
      emergency_available: latestAiAlert.hospital_emergency_available,
      phone: latestAiAlert.hospital_phone,
      map_url: latestAiAlert.hospital_map_url,
      latitude: latestAiAlert.hospital_latitude,
      longitude: latestAiAlert.hospital_longitude,
    };
    const hasFallback =
      fallback.name ||
      fallback.address ||
      typeof fallback.distance_km === 'number' ||
      fallback.phone ||
      fallback.map_url;
    return source ?? (hasFallback ? fallback : null);
  }, [latestAiAlert]);

  const aiHeartRateDisplay =
    typeof latestAiAlert?.heart_rate_bpm === 'number' && Number.isFinite(latestAiAlert.heart_rate_bpm)
      ? `${latestAiAlert.heart_rate_bpm.toFixed(0)} bpm`
      : '--';
  const aiSpo2Display =
    typeof latestAiAlert?.spo2 === 'number' && Number.isFinite(latestAiAlert.spo2)
      ? `${latestAiAlert.spo2.toFixed(0)}%`
      : '--';
  const aiFingerDetected = latestAiAlert?.finger_detected;
  const aiLastUpdatedLabel = formatLiveTimestamp(
    latestAiAlert?.last_updated ?? latestAiAlert?.timestamp,
    latestAiAlert?.receivedAt
  );
  const aiMapUrl =
    aiHospital?.map_url ||
    (typeof aiHospital?.latitude === 'number' &&
    typeof aiHospital?.longitude === 'number'
      ? buildGoogleMapsLink(aiHospital.latitude, aiHospital.longitude)
      : undefined);
  const aiDirectionsUrl =
    typeof aiHospital?.latitude === 'number' &&
    typeof aiHospital?.longitude === 'number' &&
    typeof latestAiAlert?.latitude === 'number' &&
    typeof latestAiAlert?.longitude === 'number'
      ? buildDirectionsLink(latestAiAlert.latitude, latestAiAlert.longitude, aiHospital.latitude, aiHospital.longitude)
      : undefined;
  const aiCallUrl = aiHospital?.phone ? buildCallLink(aiHospital.phone) : undefined;

  const runPrediction = async () => {
    if (!selectedVehicle) return Alert.alert('Select vehicle', 'Please select a vehicle first.');
    const payload = { vehicleId: selectedVehicle, mileage: Number(mileage || 0) };
    try {
      const res = await predict(payload as any);
      if (res) setResult(JSON.stringify(res));
      else setResult('No prediction available');
    } catch (err) {
      Alert.alert('Prediction failed', (err as Error).message || 'Error');
    }
  };

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) return;
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Prediction</Text>

        {latestAiAlert && aiHospital && (
          <View style={styles.aiPanel}>
            <View style={styles.aiHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiEyebrow}>AI Smart Response</Text>
                <Text style={styles.aiTitle}>{aiHospital.ui_card_title || 'Nearest hospital'}</Text>
                <Text style={styles.aiSubtitle}>
                  {aiHospital.ui_card_subtitle || aiHospital.reason || 'Live recommendation from AI health layer'}
                </Text>
              </View>
              <View style={styles.aiBadgeStack}>
                {latestAiAlert.priority ? (
                  <Text style={styles.aiBadge}>{String(latestAiAlert.priority).toUpperCase()}</Text>
                ) : null}
                {latestAiAlert.trigger_source ? (
                  <Text style={styles.aiBadgeMuted}>{String(latestAiAlert.trigger_source).toUpperCase()}</Text>
                ) : null}
                <Text style={styles.aiTimestamp}>{aiLastUpdatedLabel}</Text>
              </View>
            </View>

            <View style={styles.aiVitalsRow}>
              <View style={styles.aiVitalCard}>
                <Text style={styles.aiVitalLabel}>Heart Rate</Text>
                <Text style={styles.aiVitalValue}>{aiHeartRateDisplay}</Text>
              </View>
              <View style={styles.aiVitalCard}>
                <Text style={styles.aiVitalLabel}>SpO₂</Text>
                <Text style={styles.aiVitalValue}>{aiSpo2Display}</Text>
              </View>
              <View style={styles.aiVitalCard}>
                <Text style={styles.aiVitalLabel}>Finger</Text>
                <Text style={styles.aiVitalValue}>{aiFingerDetected ? 'Detected' : 'Not detected'}</Text>
              </View>
            </View>

            <View style={styles.aiHospitalCard}>
              <View style={styles.aiHospitalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiHospitalName}>{aiHospital.name || 'Hospital pending'}</Text>
                  <Text style={styles.aiHospitalAddress}>{aiHospital.address || 'Awaiting address'}</Text>
                </View>
                <View style={styles.aiPillRow}>
                  {typeof aiHospital.emergency_available === 'boolean' && (
                    <Text
                      style={[
                        styles.aiPill,
                        aiHospital.emergency_available ? styles.aiPillPositive : styles.aiPillNegative,
                      ]}
                    >
                      {aiHospital.emergency_available ? 'Emergency on' : 'Emergency off'}
                    </Text>
                  )}
                  {typeof aiHospital.open_now === 'boolean' && (
                    <Text
                      style={[styles.aiPill, aiHospital.open_now ? styles.aiPillPositive : styles.aiPillNegative]}
                    >
                      {aiHospital.open_now ? 'Open now' : 'Closed'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.aiMetaRow}>
                <Text style={styles.aiMeta}>
                  {typeof aiHospital.distance_km === 'number' ? `${aiHospital.distance_km.toFixed(3)} km` : '--'}
                </Text>
                <Text style={styles.aiMeta}>{aiHospital.facility_type || 'facility'}</Text>
                <Text style={styles.aiMeta}>
                  {aiHospital.selected_at ? formatDateString(aiHospital.selected_at) : 'Awaiting selection'}
                </Text>
              </View>

              <View style={styles.aiActionsRow}>
                <TouchableOpacity
                  style={[styles.aiActionButton, !aiCallUrl && styles.aiActionButtonDisabled]}
                  onPress={() => handleOpenLink(aiCallUrl)}
                  disabled={!aiCallUrl}
                >
                  <Text style={styles.aiActionText}>Call Hospital</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.aiActionButton, !aiMapUrl && styles.aiActionButtonDisabled]}
                  onPress={() => handleOpenLink(aiMapUrl)}
                  disabled={!aiMapUrl}
                >
                  <Text style={styles.aiActionText}>Open Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.aiActionButton, !aiDirectionsUrl && styles.aiActionButtonDisabled]}
                  onPress={() => handleOpenLink(aiDirectionsUrl)}
                  disabled={!aiDirectionsUrl}
                >
                  <Text style={styles.aiActionText}>Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Vehicle</Text>
          <View style={styles.pickerReplace}>
            {vehicles && vehicles.length > 0 ? (
              vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleOption, selectedVehicle === v.id && styles.vehicleSelected]}
                  onPress={() => setSelectedVehicle(v.id ?? null)}
                >
                  <Text style={styles.vehicleOptionText}>
                    {v.make} {v.model}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.small}>No vehicles available</Text>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mileage (km)</Text>
          <TextInput
            style={styles.input}
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
            placeholder="Enter current mileage"
          />
        </View>

        <TouchableOpacity style={styles.predictButton} onPress={runPrediction} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.predictText}>Run Prediction</Text>}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Result</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  card: string;
  inputBackground: string;
  tint: string;
  text: string;
  icon: string;
  border: string;
  shadow?: string;
}) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
    aiPanel: {
      marginBottom: 18,
      padding: 18,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow ?? colors.border,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
      gap: 12,
    },
    aiHeader: {
      flexDirection: 'row',
      gap: 14,
    },
    aiEyebrow: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.icon,
      fontWeight: '700',
      marginBottom: 4,
    },
    aiTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    aiSubtitle: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 6,
      lineHeight: 18,
    },
    aiBadgeStack: {
      alignItems: 'flex-end',
      gap: 6,
    },
    aiBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: hexToRgba(colors.tint, 0.16),
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    aiBadgeMuted: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: hexToRgba(colors.card, 0.7),
      color: colors.icon,
      fontSize: 11,
      fontWeight: '700',
    },
    aiTimestamp: {
      fontSize: 11,
      color: colors.icon,
    },
    aiVitalsRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    aiVitalCard: {
      flex: 1,
      minWidth: 120,
      padding: 12,
      borderRadius: 14,
      backgroundColor: hexToRgba(colors.inputBackground, 0.9),
      borderWidth: 1,
      borderColor: colors.border,
    },
    aiVitalLabel: {
      fontSize: 12,
      color: colors.icon,
      marginBottom: 6,
    },
    aiVitalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    aiHospitalCard: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: hexToRgba(colors.card, 0.9),
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    aiHospitalHeader: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    aiHospitalName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    aiHospitalAddress: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 4,
      lineHeight: 18,
    },
    aiPillRow: {
      alignItems: 'flex-end',
      gap: 6,
    },
    aiPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      borderWidth: 1,
    },
    aiPillPositive: {
      backgroundColor: hexToRgba('#3bb273', 0.14),
      borderColor: hexToRgba('#3bb273', 0.6),
    },
    aiPillNegative: {
      backgroundColor: hexToRgba('#d84c4c', 0.14),
      borderColor: hexToRgba('#d84c4c', 0.6),
    },
    aiMetaRow: {
      flexDirection: 'row',
      gap: 14,
      flexWrap: 'wrap',
    },
    aiMeta: {
      fontSize: 12,
      color: colors.icon,
    },
    aiActionsRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    aiActionButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.tint,
    },
    aiActionButtonDisabled: {
      backgroundColor: hexToRgba(colors.icon, 0.3),
    },
    aiActionText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },
    field: { marginBottom: 16 },
    label: { fontSize: 14, color: colors.icon, marginBottom: 8 },
    pickerReplace: { flexDirection: 'row', flexWrap: 'wrap' },
    vehicleOption: {
      padding: 10,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    vehicleSelected: { borderWidth: 2, borderColor: colors.tint },
    vehicleOptionText: { color: colors.text },
    input: {
      backgroundColor: colors.inputBackground,
      padding: 12,
      borderRadius: 8,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    predictButton: { backgroundColor: colors.tint, padding: 14, borderRadius: 8, alignItems: 'center' },
    predictText: { color: '#fff', fontWeight: '700' },
    resultBox: {
      marginTop: 16,
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resultTitle: { fontWeight: '700', marginBottom: 6, color: colors.text },
    resultText: { color: colors.text },
    small: { color: colors.icon },
  });
