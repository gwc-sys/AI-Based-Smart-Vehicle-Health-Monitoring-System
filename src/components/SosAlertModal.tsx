import { useAppTheme } from '@/context/ThemeContext';
import {
  buildCallLink,
  buildEmergencyMessage,
  buildGoogleMapsLink,
  buildHospitalSearchLink,
  buildSmsLink,
  buildWhatsAppLink,
  EMPTY_EMERGENCY_CONFIG,
  EmergencyConfig,
  resolveEmergencyConfigFromAlert,
  subscribeToEmergencyConfig,
} from '../services/emergencyConfigService';
import {
  getAlertCoordinates,
  VehicleRealtimeAlert,
  VehicleRealtimeReading,
} from '@/services/vehicleRealtimeService';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

type SosAlertModalProps = {
  visible: boolean;
  onClose: () => void;
  alert: VehicleRealtimeAlert | null;
  reading: VehicleRealtimeReading | null;
  fallbackLocationReading?: VehicleRealtimeReading | null;
  deviceId?: string | null;
};

function hasGpsCoordinates(reading: VehicleRealtimeReading | null | undefined) {
  return (
    typeof reading?.gps_lat === 'number' &&
    Number.isFinite(reading.gps_lat) &&
    typeof reading?.gps_lon === 'number' &&
    Number.isFinite(reading.gps_lon)
  );
}

function alertToReading(alert: VehicleRealtimeAlert | null): VehicleRealtimeReading | null {
  if (!alert) {
    return null;
  }

  const alertCoordinates = getAlertCoordinates(alert);

  return {
    gps_altitude: alert.gps_altitude,
    gps_lat: alertCoordinates?.latitude,
    gps_lon: alertCoordinates?.longitude,
    gps_sats: alert.gps_sats ?? alert.satellites,
    gps_speed_kmh: alert.gps_speed_kmh ?? alert.speed_kmh,
    timestamp: alert.timestamp,
  };
}

function resolveSosReading(
  alert: VehicleRealtimeAlert | null,
  reading: VehicleRealtimeReading | null,
  fallbackLocationReading: VehicleRealtimeReading | null | undefined
) {
  const alertReading = alertToReading(alert);

  if (hasGpsCoordinates(alertReading)) {
    return {
      ...reading,
      ...alertReading,
    };
  }

  if (hasGpsCoordinates(reading) || !hasGpsCoordinates(fallbackLocationReading)) {
    return reading;
  }

  return {
    ...reading,
    gps_lat: fallbackLocationReading?.gps_lat,
    gps_lon: fallbackLocationReading?.gps_lon,
  };
}

function formatLiveTimestamp(timestamp?: number, receivedAt?: number) {
  const sourceTime =
    typeof timestamp === 'number' && timestamp > 1000000000 ? timestamp : receivedAt;

  if (typeof sourceTime !== 'number') {
    return 'Waiting';
  }

  const diffMs = Date.now() - sourceTime;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 5) {
    return 'just now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} sec ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function formatGpsValue(value: number | undefined, digits: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function createMapUrl(latitude: number, longitude: number) {
  const latitudeDelta = 0.01;
  const longitudeDelta = 0.01;
  const left = longitude - longitudeDelta;
  const right = longitude + longitudeDelta;
  const top = latitude + latitudeDelta;
  const bottom = latitude - latitudeDelta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function renderWebMapFrame(mapUrl: string) {
  return React.createElement('iframe' as any, {
    src: mapUrl,
    style: {
      width: '100%',
      height: '250px',
      border: '0',
      display: 'block',
    },
    loading: 'lazy',
    referrerPolicy: 'no-referrer-when-downgrade',
  });
}

async function openUrl(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return;
    }

    await Linking.openURL(url);
  } catch {
    return;
  }
}

export default function SosAlertModal({
  visible,
  onClose,
  alert,
  reading,
  fallbackLocationReading,
  deviceId,
}: SosAlertModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyConfig>(EMPTY_EMERGENCY_CONFIG);
  const resolvedReading = resolveSosReading(alert, reading, fallbackLocationReading);
  const resolvedDeviceId = alert?.device_id ?? deviceId ?? 'Unknown device';
  const latitude = resolvedReading?.gps_lat;
  const longitude = resolvedReading?.gps_lon;
  const hasCoordinates = hasGpsCoordinates(resolvedReading);

  useEffect(() => {
    const unsubscribe = subscribeToEmergencyConfig(setEmergencyConfig);
    return unsubscribe;
  }, []);

  const resolvedEmergencyConfig = useMemo(
    () => resolveEmergencyConfigFromAlert(emergencyConfig, alert),
    [alert, emergencyConfig]
  );
  const mapUrl =
    hasCoordinates && typeof latitude === 'number' && typeof longitude === 'number'
      ? createMapUrl(latitude, longitude)
      : null;
  const emergencyMessage = buildEmergencyMessage(alert, latitude, longitude);
  const familyContacts = resolvedEmergencyConfig.familyContacts.filter((contact) => contact.phone.trim());
  const nearestHospitalLabel =
    resolvedEmergencyConfig.hospitalName?.trim() || alert?.hospital_name?.trim() || 'Nearest hospital';
  const emergencyNumber = resolvedEmergencyConfig.emergencyNumber?.trim() || '';
  const ambulanceNumber = resolvedEmergencyConfig.ambulanceNumber?.trim() || '';
  const hospitalPhone = resolvedEmergencyConfig.hospitalPhone?.trim() || '';

  return (
    <Modal visible={visible && Boolean(alert)} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Emergency Response</Text>
              <Text style={styles.title}>SOS Emergency</Text>
              <Text style={styles.subtitle}>{alert?.message ?? 'SOS button pressed by user'}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Priority</Text>
                <Text style={styles.statValue}>{String(alert?.priority ?? 'critical').toUpperCase()}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Last Updated</Text>
                <Text style={styles.statValueSmall}>
                  {formatLiveTimestamp(alert?.timestamp, alert?.receivedAt)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Device</Text>
                <Text style={styles.statValueSmall}>{resolvedDeviceId}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Action Plan</Text>
              <Text style={styles.sectionHint}>
                One tap can open calling, SMS, WhatsApp, map, and nearby hospital actions.
              </Text>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.primaryActionCard, !emergencyNumber && styles.actionCardDisabled]}
                disabled={!emergencyNumber}
                onPress={() => (emergencyNumber ? openUrl(buildCallLink(emergencyNumber)) : undefined)}
              >
                <Text style={styles.primaryActionTitle}>Call Emergency</Text>
                <Text style={styles.primaryActionText}>{emergencyNumber || 'Firebase number not available'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryActionCard, !ambulanceNumber && styles.actionCardDisabled]}
                disabled={!ambulanceNumber}
                onPress={() => (ambulanceNumber ? openUrl(buildCallLink(ambulanceNumber)) : undefined)}
              >
                <Text style={styles.primaryActionTitle}>Call Ambulance</Text>
                <Text style={styles.primaryActionText}>{ambulanceNumber || 'Firebase number not available'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryActionCard, !hasCoordinates && styles.actionCardDisabled]}
                disabled={!hasCoordinates}
                onPress={() =>
                  hasCoordinates && latitude && longitude
                    ? openUrl(buildHospitalSearchLink(latitude, longitude))
                    : undefined
                }
              >
                <Text style={styles.primaryActionTitle}>Find Hospital</Text>
                <Text style={styles.primaryActionText}>{nearestHospitalLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryActionCard, !hospitalPhone && styles.actionCardDisabled]}
                disabled={!hospitalPhone}
                onPress={() =>
                  hospitalPhone
                    ? openUrl(buildCallLink(hospitalPhone))
                    : undefined
                }
              >
                <Text style={styles.primaryActionTitle}>Call Hospital</Text>
                <Text style={styles.primaryActionText}>{hospitalPhone || 'Firebase hospital phone not available'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryActionCard, !hasCoordinates && styles.actionCardDisabled]}
                disabled={!hasCoordinates}
                onPress={() =>
                  hasCoordinates && typeof latitude === 'number' && typeof longitude === 'number'
                    ? openUrl(buildGoogleMapsLink(latitude, longitude))
                    : undefined
                }
              >
                <Text style={styles.primaryActionTitle}>Share Map</Text>
                <Text style={styles.primaryActionText}>Open live SOS coordinates</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Emergency Location</Text>
              <Text style={styles.sectionHint}>
                {hasCoordinates ? 'Latest SOS position from Firebase' : 'Waiting for GPS coordinates'}
              </Text>
            </View>

            <View style={styles.mapCard}>
              {mapUrl && Platform.OS !== 'web' ? (
                <WebView
                  source={{ uri: mapUrl }}
                  style={styles.map}
                  scrollEnabled={false}
                  nestedScrollEnabled={false}
                  setSupportMultipleWindows={false}
                />
              ) : mapUrl ? (
                renderWebMapFrame(mapUrl)
              ) : (
                <View style={styles.mapFallback}>
                  <Text style={styles.mapFallbackTitle}>Map unavailable</Text>
                  <Text style={styles.mapFallbackText}>
                    Latitude and longitude are not available yet, so the app will fall back to the last
                    known position when it arrives.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Latitude</Text>
                <Text style={styles.detailValue}>{formatGpsValue(resolvedReading?.gps_lat, 6)}</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Longitude</Text>
                <Text style={styles.detailValue}>{formatGpsValue(resolvedReading?.gps_lon, 6)}</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Satellites</Text>
                <Text style={styles.detailValue}>{formatGpsValue(resolvedReading?.gps_sats, 0)}</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Speed</Text>
                <Text style={styles.detailValue}>{formatGpsValue(resolvedReading?.gps_speed_kmh, 2)} km/h</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Altitude</Text>
                <Text style={styles.detailValue}>{formatGpsValue(resolvedReading?.gps_altitude, 2)} m</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>GPS Fix</Text>
                <Text style={styles.detailValue}>{String(alert?.gps_fix ?? hasCoordinates)}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Family And Guardian Outreach</Text>
              <Text style={styles.sectionHint}>
                These actions use the numbers saved in the Emergency tab for quick response.
              </Text>
            </View>

            {familyContacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No emergency contacts saved</Text>
                <Text style={styles.emptyStateText}>
                  No emergency contacts were found in Firebase for this device or SOS alert yet.
                </Text>
              </View>
            ) : (
              familyContacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <View>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactMeta}>
                        {contact.relationship || 'Emergency contact'} . {contact.phone}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.contactActionRow}>
                    <TouchableOpacity
                      style={styles.secondaryActionButton}
                      onPress={() => openUrl(buildCallLink(contact.phone))}
                    >
                      <Text style={styles.secondaryActionText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryActionButton}
                      onPress={() => openUrl(buildSmsLink(contact.phone, emergencyMessage))}
                    >
                      <Text style={styles.secondaryActionText}>SMS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.secondaryActionButton,
                        !contact.whatsapp?.trim() && styles.actionCardDisabled,
                      ]}
                      disabled={!contact.whatsapp?.trim()}
                      onPress={() =>
                        contact.whatsapp?.trim()
                          ? openUrl(buildWhatsAppLink(contact.whatsapp, emergencyMessage))
                          : undefined
                      }
                    >
                      <Text style={styles.secondaryActionText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Implementation note</Text>
              <Text style={styles.infoText}>
                This modal now prefers realtime Firebase data for emergency numbers, hospital details, and
                guardian contacts. Fully automatic calling still needs your ESP32 GSM module or a backend
                telephony service.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '88%',
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      fontSize: 11,
      color: '#FF8A80',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 6,
      marginBottom: 6,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.icon,
      marginTop: 4,
    },
    closeButton: {
      backgroundColor: colors.tint,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    closeButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statBox: {
      width: '31%',
      backgroundColor: colors.mutedSurface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 11,
      color: colors.icon,
      marginBottom: 6,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    statValueSmall: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    sectionHeader: {
      marginTop: 10,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    sectionHint: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 2,
      lineHeight: 18,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    primaryActionCard: {
      width: '48%',
      backgroundColor: 'rgba(255, 90, 82, 0.12)',
      borderColor: 'rgba(255, 90, 82, 0.35)',
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    primaryActionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
    },
    primaryActionText: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
    },
    actionCardDisabled: {
      opacity: 0.45,
    },
    mapCard: {
      overflow: 'hidden',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.mutedSurface,
    },
    map: {
      width: '100%',
      height: 250,
      backgroundColor: colors.mutedSurface,
    },
    mapFallback: {
      height: 250,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    mapFallbackTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    mapFallbackText: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      color: colors.icon,
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    detailCard: {
      width: '48%',
      backgroundColor: colors.mutedSurface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.icon,
      marginBottom: 6,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    contactCard: {
      backgroundColor: colors.mutedSurface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    contactHeader: {
      marginBottom: 12,
    },
    contactName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    contactMeta: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 4,
    },
    contactActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    secondaryActionButton: {
      backgroundColor: colors.tint,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    secondaryActionText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    emptyState: {
      backgroundColor: colors.mutedSurface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyStateTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    emptyStateText: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
    },
    infoCard: {
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: 'rgba(47, 168, 204, 0.10)',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: 'rgba(47, 168, 204, 0.25)',
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    infoText: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
    },
  });
