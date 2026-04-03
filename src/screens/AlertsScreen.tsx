import AppIcon from '@/components/AppIcon';
import SosAlertModal from '@/components/SosAlertModal';
import { useAppTheme } from '@/context/ThemeContext';
import {
  buildCallLink,
  buildEmergencyMessage,
  buildGoogleMapsLink,
  buildHospitalSearchLink,
  buildSmsLink,
  EMPTY_EMERGENCY_CONFIG,
  EmergencyConfig,
  resolveEmergencyConfigFromAlert,
  subscribeToEmergencyConfig,
} from '../services/emergencyConfigService';
import {
  getAlertCoordinates,
  subscribeToVehicleAlerts,
  VehicleRealtimeAlert,
} from '@/services/vehicleRealtimeService';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const isSos = normalizedType === 'sos';

  return {
    id: alert.id ?? `${normalizedType}-${alert.timestamp ?? Date.now()}-${alert.message ?? 'alert'}`,
    title: isSos ? 'SOS Emergency Event' : normalizedType.toUpperCase(),
    message: alert.message ?? 'Vehicle alert received',
    level: isSos ? 'critical' : normalizedType === 'warning' ? 'warning' : 'info',
    createdAt: formatAlertTime(alert.timestamp),
    deviceId: alert.device_id ?? 'Unknown device',
    type: normalizedType,
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

export default function AlertsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyConfig>(EMPTY_EMERGENCY_CONFIG);
  const [selectedAlert, setSelectedAlert] = useState<VehicleRealtimeAlert | null>(null);
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

  const latestCoordinates = latestSos ? getAlertCoordinates(latestSos.raw) : null;
  const resolvedEmergencyConfig = resolveEmergencyConfigFromAlert(emergencyConfig, latestSos?.raw);
  const emergencyNumber = resolvedEmergencyConfig.emergencyNumber?.trim() || '';
  const ambulanceNumber = resolvedEmergencyConfig.ambulanceNumber?.trim() || '';
  const familyContacts = resolvedEmergencyConfig.familyContacts;
  const hospitalPhone = resolvedEmergencyConfig.hospitalPhone?.trim() || '';
  const latestMessage = buildEmergencyMessage(
    latestSos?.raw ?? null,
    latestCoordinates?.latitude,
    latestCoordinates?.longitude
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Emergency Center</Text>
          <Text style={styles.title}>SOS response workflow for your project</Text>
          <Text style={styles.heroText}>
            This tab now replaces the old generic alert view with a Firebase-driven SOS flow: call family,
            call the emergency numbers stored in Firebase, open nearest hospital search, and share the live
            map location.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Numbers From Firebase</Text>
          <Text style={styles.sectionText}>
            These values are now read from Firebase instead of local default values.
          </Text>
          <View style={styles.valueGrid}>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Emergency</Text>
              <Text style={styles.valueText}>{emergencyNumber || 'Not found in Firebase'}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Ambulance</Text>
              <Text style={styles.valueText}>{ambulanceNumber || 'Not found in Firebase'}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Hospital</Text>
              <Text style={styles.valueText}>
                {resolvedEmergencyConfig.hospitalName || latestSos?.raw.hospital_name || 'Not found in Firebase'}
              </Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Source Node</Text>
              <Text style={styles.valueText}>{resolvedEmergencyConfig.sourcePath || 'No Firebase source found'}</Text>
            </View>
          </View>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickAction, !emergencyNumber && styles.disabledCard]}
              disabled={!emergencyNumber}
              onPress={() => (emergencyNumber ? openUrl(buildCallLink(emergencyNumber)) : undefined)}
            >
              <Text style={styles.quickActionTitle}>Call Emergency</Text>
              <Text style={styles.quickActionText}>{emergencyNumber || 'Firebase number missing'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, !ambulanceNumber && styles.disabledCard]}
              disabled={!ambulanceNumber}
              onPress={() => (ambulanceNumber ? openUrl(buildCallLink(ambulanceNumber)) : undefined)}
            >
              <Text style={styles.quickActionTitle}>Call Ambulance</Text>
              <Text style={styles.quickActionText}>{ambulanceNumber || 'Firebase number missing'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guardian Contacts From Firebase</Text>
          <Text style={styles.sectionText}>
            These contacts are taken from Firebase config first, then from the live SOS alert if it carries an
            emergency contact.
          </Text>
          {familyContacts.length === 0 ? (
            <Text style={styles.empty}>No guardian contacts found in Firebase</Text>
          ) : (
          familyContacts.map((contact, index) => (
            <View key={contact.id} style={styles.contactCard}>
              <Text style={styles.contactTitle}>Contact {index + 1}</Text>
              <Text style={styles.contactValue}>{contact.name}</Text>
              <Text style={styles.contactMetaText}>{contact.relationship || 'Emergency contact'}</Text>
              <Text style={styles.contactValue}>{contact.phone}</Text>
              <Text style={styles.contactMetaText}>{contact.whatsapp || 'WhatsApp number not available'}</Text>
              <View style={styles.inlineHintRow}>
                <AppIcon name="call" size={14} color={colors.icon} />
                <Text style={styles.inlineHint}>
                  This contact came from realtime Firebase data.
                </Text>
              </View>
            </View>
          )))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest SOS Workflow</Text>
          <Text style={styles.sectionText}>
            The app can open the dialer, maps, and message apps right away. Full automatic calling still needs
            a GSM module or a backend voice service.
          </Text>
          <View style={styles.workflowCard}>
            <Text style={styles.workflowStep}>1. Device sends GPS coordinates to Firebase.</Text>
            <Text style={styles.workflowStep}>2. App shows live location and nearest hospital search.</Text>
            <Text style={styles.workflowStep}>3. Family can be called or messaged immediately.</Text>
            <Text style={styles.workflowStep}>4. Firebase emergency numbers stay one tap away for escalation.</Text>
          </View>
          {latestSos && (
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => setSelectedAlert(latestSos.raw)}
              >
                <Text style={styles.quickActionTitle}>Open Latest SOS</Text>
                <Text style={styles.quickActionText}>{latestSos.createdAt}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, !latestCoordinates && styles.disabledCard]}
                disabled={!latestCoordinates}
                onPress={() =>
                  latestCoordinates
                    ? openUrl(buildHospitalSearchLink(latestCoordinates.latitude, latestCoordinates.longitude))
                    : undefined
                }
              >
                <Text style={styles.quickActionTitle}>Nearest Hospital</Text>
                <Text style={styles.quickActionText}>
                  {latestSos.raw.hospital_name ?? 'Search near current location'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, !hospitalPhone && styles.disabledCard]}
                disabled={!hospitalPhone}
                onPress={() => (hospitalPhone ? openUrl(buildCallLink(hospitalPhone)) : undefined)}
              >
                <Text style={styles.quickActionTitle}>Call Hospital</Text>
                <Text style={styles.quickActionText}>{hospitalPhone || 'Firebase hospital phone missing'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, !latestCoordinates && styles.disabledCard]}
                disabled={!latestCoordinates}
                onPress={() =>
                  latestCoordinates
                    ? openUrl(buildGoogleMapsLink(latestCoordinates.latitude, latestCoordinates.longitude))
                    : undefined
                }
              >
                <Text style={styles.quickActionTitle}>Open Map</Text>
                <Text style={styles.quickActionText}>Share or inspect coordinates</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quickAction,
                  !familyContacts[0]?.phone.trim() && styles.disabledCard,
                ]}
                disabled={!familyContacts[0]?.phone.trim()}
                onPress={() =>
                  familyContacts[0]?.phone.trim()
                    ? openUrl(buildSmsLink(familyContacts[0].phone, latestMessage))
                    : undefined
                }
              >
                <Text style={styles.quickActionTitle}>Send SOS SMS</Text>
                <Text style={styles.quickActionText}>Primary guardian</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Realtime Emergency Events</Text>
          <Text style={styles.sectionText}>
            The latest Firebase alerts are listed below. SOS events open the full emergency response modal.
          </Text>
          {alerts.length === 0 ? (
            <Text style={styles.empty}>No alerts yet</Text>
          ) : (
            alerts.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  alert.type === 'sos' ? styles.alertCardCritical : null,
                ]}
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
                      !getAlertCoordinates(alert.raw) && styles.disabledCard,
                    ]}
                    disabled={!getAlertCoordinates(alert.raw)}
                    onPress={() => {
                      const coordinates = getAlertCoordinates(alert.raw);
                      if (coordinates) {
                        openUrl(buildHospitalSearchLink(coordinates.latitude, coordinates.longitude));
                      }
                    }}
                  >
                    <Text style={styles.alertActionText}>Hospital</Text>
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
    heroCard: {
      backgroundColor: 'rgba(255, 90, 82, 0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255, 90, 82, 0.28)',
      borderRadius: 24,
      padding: 18,
      marginBottom: 18,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: '#C62828',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 10,
    },
    heroText: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.icon,
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
      marginBottom: 6,
    },
    sectionText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.icon,
      marginBottom: 14,
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
    inlineHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    inlineHint: {
      flex: 1,
      fontSize: 11,
      color: colors.icon,
      lineHeight: 17,
    },
    workflowCard: {
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
    },
    workflowStep: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 4,
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
