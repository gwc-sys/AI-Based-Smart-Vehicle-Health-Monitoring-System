import SosAlertModal from '@/components/SosAlertModal';
import { useAppTheme } from '@/context/ThemeContext';
import {
  buildCallLink,
  buildDirectionsLink,
  buildEmergencyMessage,
  buildGoogleMapsLink,
  buildHospitalSearchLink,
  buildSmsLink,
  EMPTY_EMERGENCY_CONFIG,
  EmergencyConfig,
  resolveEmergencyConfigFromAlert,
  subscribeToEmergencyConfig,
} from '@/services/emergencyConfigService';
import {
  getAlertCoordinates,
  getHospitalCoordinates,
  isSosVehicleAlert,
  subscribeToVehicleAlerts,
  subscribeToVehicleReadings,
  VehicleRealtimeAlert,
  VehicleRealtimeReading,
} from '@/services/vehicleRealtimeService';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

type AlertItem = {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
  createdAt: string;
  deviceId: string;
  type: string;
  raw: VehicleRealtimeAlert;
};

function isEpochTimestamp(timestamp?: number) {
  return typeof timestamp === 'number' && timestamp > 1000000000;
}

function formatAlertTime(timestamp?: number) {
  if (!timestamp) {
    return 'Waiting for timestamp';
  }

  if (isEpochTimestamp(timestamp)) {
    return new Date(timestamp).toLocaleString('en-IN');
  }

  return `Realtime #${timestamp}`;
}

function mapRealtimeAlert(alert: VehicleRealtimeAlert): AlertItem {
  const normalizedType = String(alert.type ?? 'info').toLowerCase();
  const isSos = isSosVehicleAlert(alert);

  return {
    id: alert.id ?? `${normalizedType}-${alert.timestamp ?? Date.now()}-${alert.message ?? 'alert'}`,
    title: isSos ? 'SOS Emergency Event' : normalizedType.toUpperCase(),
    message: alert.message ?? alert.type ?? 'Vehicle alert received',
    level: isSos ? 'critical' : normalizedType === 'warning' ? 'warning' : 'info',
    createdAt: formatAlertTime(alert.timestamp),
    deviceId: alert.device_name ?? alert.device_id ?? 'Unknown device',
    type: isSos ? 'sos' : normalizedType,
    raw: alert,
  };
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

function createGoogleEmbedUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
}

function renderWebMapFrame(mapUrl: string) {
  return React.createElement('iframe' as any, {
    src: mapUrl,
    style: {
      width: '100%',
      height: '220px',
      border: '0',
      display: 'block',
    },
    loading: 'lazy',
    referrerPolicy: 'no-referrer-when-downgrade',
  });
}

export default function AlertsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyConfig>(EMPTY_EMERGENCY_CONFIG);
  const [selectedAlert, setSelectedAlert] = useState<VehicleRealtimeAlert | null>(null);
  const [latestReading, setLatestReading] = useState<VehicleRealtimeReading | null>(null);
  const latestSos = alerts.find((item) => item.type === 'sos') ?? null;

  useEffect(() => {
    const unsubscribe = subscribeToEmergencyConfig(setEmergencyConfig);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToVehicleAlerts((realtimeAlerts) => {
      setAlerts(realtimeAlerts.map(mapRealtimeAlert));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToVehicleReadings((readings) => {
      const lastGps = [...readings]
        .reverse()
        .find(
          (reading) =>
            typeof reading.gps_lat === 'number' &&
            Number.isFinite(reading.gps_lat) &&
            typeof reading.gps_lon === 'number' &&
            Number.isFinite(reading.gps_lon)
        );
      setLatestReading(lastGps ?? null);
    });

    return unsubscribe;
  }, []);

  const latestCoordinates = latestSos ? getAlertCoordinates(latestSos.raw) : null;
  const latestHospitalCoordinates = latestSos ? getHospitalCoordinates(latestSos.raw) : null;
  const resolvedEmergencyConfig = resolveEmergencyConfigFromAlert(emergencyConfig, latestSos?.raw);
  const emergencyNumber = resolvedEmergencyConfig.emergencyNumber?.trim() || '';
  const ambulanceNumber = resolvedEmergencyConfig.ambulanceNumber?.trim() || '';
  const familyContacts = resolvedEmergencyConfig.familyContacts;
  const hospitalPhone = resolvedEmergencyConfig.hospitalPhone?.trim() || '';
  const latestHospitalPhone = latestSos?.raw.hospital_phone?.trim() || hospitalPhone;
  const latestHospitalDistance =
    typeof latestSos?.raw.hospital_distance_km === 'number' && Number.isFinite(latestSos.raw.hospital_distance_km)
      ? `${latestSos.raw.hospital_distance_km.toFixed(2)} km`
      : '--';
  const latestHospitalAddress = latestSos?.raw.hospital_address?.trim() || 'Address not available';
  const latestEmergencyAvailability =
    typeof latestSos?.raw.hospital_emergency_available === 'boolean'
      ? latestSos.raw.hospital_emergency_available
        ? 'Available'
        : 'Unavailable'
      : '--';
  const latestMessage = buildEmergencyMessage(
    latestSos?.raw ?? null,
    latestCoordinates?.latitude,
    latestCoordinates?.longitude
  );

  const liveLatitude = latestReading?.gps_lat;
  const liveLongitude = latestReading?.gps_lon;
  const hasLiveLocation =
    typeof liveLatitude === 'number' &&
    Number.isFinite(liveLatitude) &&
    typeof liveLongitude === 'number' &&
    Number.isFinite(liveLongitude);
  const liveMapUrl = hasLiveLocation ? createGoogleEmbedUrl(liveLatitude, liveLongitude) : null;
  const liveExternalMapUrl = hasLiveLocation ? buildGoogleMapsLink(liveLatitude, liveLongitude) : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>
          <View style={styles.valueGrid}>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Hospital</Text>
              <Text style={styles.valueText}>
                {resolvedEmergencyConfig.hospitalName || latestSos?.raw.hospital_name || 'Not available'}
              </Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Distance</Text>
              <Text style={styles.valueText}>{latestHospitalDistance}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Emergency</Text>
              <Text style={styles.valueText}>{latestEmergencyAvailability}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Hospital Phone</Text>
              <Text style={styles.valueText}>{latestHospitalPhone || 'Not available'}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Address</Text>
              <Text style={styles.valueText}>{latestHospitalAddress}</Text>
            </View>
          </View>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickAction, !emergencyNumber && styles.disabledCard]}
              disabled={!emergencyNumber}
              onPress={() => (emergencyNumber ? openUrl(buildCallLink(emergencyNumber)) : undefined)}
            >
              <Text style={styles.quickActionTitle}>Call Emergency</Text>
              <Text style={styles.quickActionText}>{emergencyNumber || 'Not available'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, !ambulanceNumber && styles.disabledCard]}
              disabled={!ambulanceNumber}
              onPress={() => (ambulanceNumber ? openUrl(buildCallLink(ambulanceNumber)) : undefined)}
            >
              <Text style={styles.quickActionTitle}>Call Ambulance</Text>
              <Text style={styles.quickActionText}>{ambulanceNumber || 'Not available'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, !latestHospitalPhone && styles.disabledCard]}
              disabled={!latestHospitalPhone}
              onPress={() => (latestHospitalPhone ? openUrl(buildCallLink(latestHospitalPhone)) : undefined)}
            >
              <Text style={styles.quickActionTitle}>Call Hospital</Text>
              <Text style={styles.quickActionText}>{latestHospitalPhone || 'Not available'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, !latestSos && styles.disabledCard]}
              disabled={!latestSos}
              onPress={() => (latestSos ? setSelectedAlert(latestSos.raw) : undefined)}
            >
              <Text style={styles.quickActionTitle}>Open SOS</Text>
              <Text style={styles.quickActionText}>{latestSos?.createdAt || 'No active SOS event'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, !latestCoordinates && !latestHospitalCoordinates && styles.disabledCard]}
              disabled={!latestCoordinates && !latestHospitalCoordinates}
              onPress={() =>
                latestCoordinates && latestHospitalCoordinates
                  ? openUrl(
                      buildDirectionsLink(
                        latestCoordinates.latitude,
                        latestCoordinates.longitude,
                        latestHospitalCoordinates.latitude,
                        latestHospitalCoordinates.longitude
                      )
                    )
                  : latestCoordinates
                    ? openUrl(buildHospitalSearchLink(latestCoordinates.latitude, latestCoordinates.longitude))
                    : undefined
              }
            >
              <Text style={styles.quickActionTitle}>Hospital Route</Text>
              <Text style={styles.quickActionText}>
                {latestSos?.raw.hospital_name ?? 'Search near current location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guardian Contacts</Text>
          {familyContacts.length === 0 ? (
            <Text style={styles.empty}>No guardian contacts available.</Text>
          ) : (
            familyContacts.map((contact, index) => (
              <View key={contact.id} style={styles.contactCard}>
                <Text style={styles.contactTitle}>Contact {index + 1}</Text>
                <Text style={styles.contactValue}>{contact.name}</Text>
                <Text style={styles.contactMetaText}>{contact.relationship || 'Guardian contact'}</Text>
                <Text style={styles.contactValue}>{contact.phone}</Text>
                <View style={styles.alertActionRow}>
                  <TouchableOpacity
                    style={styles.alertActionButton}
                    onPress={() => openUrl(buildCallLink(contact.phone))}
                  >
                    <Text style={styles.alertActionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.alertActionButton}
                    onPress={() => openUrl(buildSmsLink(contact.phone, latestMessage))}
                  >
                    <Text style={styles.alertActionText}>SMS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Emergency Location</Text>
          {hasLiveLocation ? (
            <View style={styles.mapCard}>
              {liveMapUrl && Platform.OS !== 'web' ? (
                <WebView
                  source={{ uri: liveMapUrl }}
                  style={styles.map}
                  scrollEnabled={false}
                  nestedScrollEnabled={false}
                  setSupportMultipleWindows={false}
                />
              ) : liveMapUrl ? (
                renderWebMapFrame(liveMapUrl)
              ) : null}
              <View style={styles.mapMetaRow}>
                <Text style={styles.mapMeta}>Lat: {liveLatitude?.toFixed(6)}</Text>
                <Text style={styles.mapMeta}>Lon: {liveLongitude?.toFixed(6)}</Text>
              </View>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity style={styles.quickAction} onPress={() => openUrl(liveExternalMapUrl)}>
                  <Text style={styles.quickActionTitle}>Open in Maps</Text>
                  <Text style={styles.quickActionText}>Open current location in Google Maps</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>Waiting for live GPS coordinates.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Emergency Events</Text>
          {alerts.length === 0 ? (
            <Text style={styles.empty}>No alerts yet</Text>
          ) : (
            alerts.map((alert) => (
              <View
                key={alert.id}
                style={[styles.alertCard, alert.type === 'sos' ? styles.alertCardCritical : null]}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertCopy}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertMeta}>
                      {alert.deviceId} . {alert.createdAt}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.levelBadge,
                      alert.level === 'critical'
                        ? styles.levelCritical
                        : alert.level === 'warning'
                          ? styles.levelWarning
                          : styles.levelInfo,
                    ]}
                  >
                    <Text style={styles.levelBadgeText}>{alert.level}</Text>
                  </View>
                </View>

                <View style={styles.alertActionRow}>
                  <TouchableOpacity style={styles.alertActionButton} onPress={() => setSelectedAlert(alert.raw)}>
                    <Text style={styles.alertActionText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.alertActionButton,
                      !getAlertCoordinates(alert.raw) && !getHospitalCoordinates(alert.raw) && styles.disabledCard,
                    ]}
                    disabled={!getAlertCoordinates(alert.raw) && !getHospitalCoordinates(alert.raw)}
                    onPress={() => {
                      const coordinates = getAlertCoordinates(alert.raw);
                      const hospitalCoordinates = getHospitalCoordinates(alert.raw);
                      if (coordinates && hospitalCoordinates) {
                        openUrl(
                          buildDirectionsLink(
                            coordinates.latitude,
                            coordinates.longitude,
                            hospitalCoordinates.latitude,
                            hospitalCoordinates.longitude
                          )
                        );
                      } else if (coordinates) {
                        openUrl(buildHospitalSearchLink(coordinates.latitude, coordinates.longitude));
                      }
                    }}
                  >
                    <Text style={styles.alertActionText}>Route</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.alertActionButton, !emergencyNumber && styles.disabledCard]}
                    disabled={!emergencyNumber}
                    onPress={() => (emergencyNumber ? openUrl(buildCallLink(emergencyNumber)) : undefined)}
                  >
                    <Text style={styles.alertActionText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <SosAlertModal
        visible={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        alert={selectedAlert}
        reading={null}
        fallbackLocationReading={null}
        deviceId={selectedAlert?.device_id ?? null}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
      paddingBottom: 32,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 10,
    },
    valueGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    valueCard: {
      width: '48%',
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    valueLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.icon,
      marginBottom: 6,
    },
    valueText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
    },
    quickActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    quickAction: {
      width: '48%',
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    quickActionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    quickActionText: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
    },
    contactCard: {
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    contactTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    contactValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    contactMetaText: {
      fontSize: 12,
      color: colors.icon,
      lineHeight: 18,
      marginBottom: 6,
    },
    mapCard: {
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
      marginTop: 8,
    },
    map: {
      height: 220,
      borderRadius: 12,
      overflow: 'hidden',
    },
    mapMetaRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    mapMeta: {
      fontSize: 12,
      color: colors.icon,
    },
    empty: {
      fontSize: 13,
      color: colors.icon,
    },
    alertCard: {
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    alertCardCritical: {
      borderColor: '#FF6B61',
      backgroundColor: 'rgba(255, 90, 82, 0.10)',
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    alertCopy: {
      flex: 1,
    },
    alertTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    alertMessage: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 19,
      marginBottom: 6,
    },
    alertMeta: {
      fontSize: 11,
      color: colors.icon,
    },
    levelBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    levelCritical: {
      backgroundColor: '#C62828',
    },
    levelWarning: {
      backgroundColor: '#F57C00',
    },
    levelInfo: {
      backgroundColor: colors.tint,
    },
    levelBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    alertActionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    alertActionButton: {
      backgroundColor: colors.tint,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    alertActionText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    disabledCard: {
      opacity: 0.45,
    },
  });
