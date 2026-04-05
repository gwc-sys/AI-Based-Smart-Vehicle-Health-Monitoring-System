import AppIcon from '@/components/AppIcon';
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
  EmergencyContact,
  resolveEmergencyConfigFromAlert,
  subscribeToEmergencyConfig,
} from '../services/emergencyConfigService';
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
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [emergencyNumberOverride, setEmergencyNumberOverride] = useState<string>('');
  const [ambulanceNumberOverride, setAmbulanceNumberOverride] = useState<string>('');
  const [contactsOverride, setContactsOverride] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState<EmergencyContact>({
    id: '',
    name: '',
    phone: '',
    relationship: '',
    whatsapp: '',
  });
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

  // hydrate overrides from Firebase when available
  useEffect(() => {
    if (emergencyConfig.emergencyNumber && !emergencyNumberOverride) {
      setEmergencyNumberOverride(emergencyConfig.emergencyNumber);
    }
    if (emergencyConfig.ambulanceNumber && !ambulanceNumberOverride) {
      setAmbulanceNumberOverride(emergencyConfig.ambulanceNumber);
    }
    if (emergencyConfig.familyContacts.length && contactsOverride.length === 0) {
      setContactsOverride(emergencyConfig.familyContacts);
    }
  }, [emergencyConfig, emergencyNumberOverride, ambulanceNumberOverride, contactsOverride.length]);

  const latestCoordinates = latestSos ? getAlertCoordinates(latestSos.raw) : null;
  const latestHospitalCoordinates = latestSos ? getHospitalCoordinates(latestSos.raw) : null;
  const resolvedEmergencyConfig = resolveEmergencyConfigFromAlert(emergencyConfig, latestSos?.raw);
  const firebaseEmergencyNumber = resolvedEmergencyConfig.emergencyNumber?.trim() || '';
  const firebaseAmbulanceNumber = resolvedEmergencyConfig.ambulanceNumber?.trim() || '';
  const emergencyNumber = (emergencyNumberOverride || '').trim() || firebaseEmergencyNumber;
  const ambulanceNumber = (ambulanceNumberOverride || '').trim() || firebaseAmbulanceNumber;
  const familyContacts = contactsOverride.length ? contactsOverride : resolvedEmergencyConfig.familyContacts;
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
  const liveExternalMapUrl = hasLiveLocation ? buildGoogleMapsLink(liveLatitude!, liveLongitude!) : '';

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
              <TextInput
                style={styles.input}
                value={emergencyNumberOverride}
                onChangeText={setEmergencyNumberOverride}
                placeholder={firebaseEmergencyNumber || 'Not found in Firebase'}
                placeholderTextColor={colors.icon}
              />
              <Text style={styles.helperText}>Used for call action below. Falls back to Firebase if left empty.</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Ambulance</Text>
              <TextInput
                style={styles.input}
                value={ambulanceNumberOverride}
                onChangeText={setAmbulanceNumberOverride}
                placeholder={firebaseAmbulanceNumber || 'Not found in Firebase'}
                placeholderTextColor={colors.icon}
              />
              <Text style={styles.helperText}>Overrides the Firebase ambulance number locally.</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Hospital</Text>
              <Text style={styles.valueText}>
                {resolvedEmergencyConfig.hospitalName || latestSos?.raw.hospital_name || 'Not found in Firebase'}
              </Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Hospital Distance</Text>
              <Text style={styles.valueText}>{latestHospitalDistance}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Emergency Available</Text>
              <Text style={styles.valueText}>{latestEmergencyAvailability}</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={styles.valueLabel}>Hospital Address</Text>
              <Text style={styles.valueText}>{latestHospitalAddress}</Text>
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
            <Text style={styles.empty}>No guardian contacts found in Firebase. Add one below.</Text>
          ) : null}

          {familyContacts.map((contact, index) => (
            <View key={contact.id} style={styles.contactCard}>
              <Text style={styles.contactTitle}>Contact {index + 1}</Text>
              <TextInput
                style={styles.input}
                value={contact.name}
                placeholder="Name"
                placeholderTextColor={colors.icon}
                onChangeText={(text) =>
                  setContactsOverride((prev) =>
                    prev.map((c) => (c.id === contact.id ? { ...c, name: text } : c))
                  )
                }
              />
              <TextInput
                style={styles.input}
                value={contact.relationship || ''}
                placeholder="Relationship"
                placeholderTextColor={colors.icon}
                onChangeText={(text) =>
                  setContactsOverride((prev) =>
                    prev.map((c) => (c.id === contact.id ? { ...c, relationship: text } : c))
                  )
                }
              />
              <TextInput
                style={styles.input}
                value={contact.phone}
                placeholder="Phone"
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
                onChangeText={(text) =>
                  setContactsOverride((prev) =>
                    prev.map((c) => (c.id === contact.id ? { ...c, phone: text } : c))
                  )
                }
              />
              <TextInput
                style={styles.input}
                value={contact.whatsapp || ''}
                placeholder="WhatsApp (optional)"
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
                onChangeText={(text) =>
                  setContactsOverride((prev) =>
                    prev.map((c) => (c.id === contact.id ? { ...c, whatsapp: text } : c))
                  )
                }
              />
            </View>
          ))}

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Add Guardian Contact</Text>
            <TextInput
              style={styles.input}
              value={newContact.name}
              placeholder="Name"
              placeholderTextColor={colors.icon}
              onChangeText={(text) => setNewContact((c) => ({ ...c, name: text }))}
            />
            <TextInput
              style={styles.input}
              value={newContact.relationship || ''}
              placeholder="Relationship"
              placeholderTextColor={colors.icon}
              onChangeText={(text) => setNewContact((c) => ({ ...c, relationship: text }))}
            />
            <TextInput
              style={styles.input}
              value={newContact.phone}
              placeholder="Phone"
              placeholderTextColor={colors.icon}
              keyboardType="phone-pad"
              onChangeText={(text) => setNewContact((c) => ({ ...c, phone: text }))}
            />
            <TextInput
              style={styles.input}
              value={newContact.whatsapp || ''}
              placeholder="WhatsApp (optional)"
              placeholderTextColor={colors.icon}
              keyboardType="phone-pad"
              onChangeText={(text) => setNewContact((c) => ({ ...c, whatsapp: text }))}
            />
            <TouchableOpacity
              style={[styles.addButton, !(newContact.name && newContact.phone) && styles.disabledCard]}
              disabled={!(newContact.name && newContact.phone)}
              onPress={() => {
                const id = newContact.id || `contact-${Date.now()}`;
                setContactsOverride((prev) => [...prev, { ...newContact, id }]);
                setNewContact({ id: '', name: '', phone: '', relationship: '', whatsapp: '' });
              }}
            >
              <Text style={styles.addButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Emergency Location</Text>
          <Text style={styles.sectionText}>
            Pulling current GPS coordinates from Firebase at <Text style={styles.codeText}>Ai-based-smart-vehicle-health/readings</Text>.
          </Text>
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
                  <Text style={styles.quickActionText}>Launch Google Maps with live pin</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>Waiting for GPS coordinates from Firebase readings…</Text>
          )}
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
                style={[
                  styles.quickAction,
                  !latestCoordinates && !latestHospitalCoordinates && styles.disabledCard,
                ]}
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
                  {latestSos.raw.hospital_name ?? 'Search near current location'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAction, !latestHospitalPhone && styles.disabledCard]}
                disabled={!latestHospitalPhone}
                onPress={() => (latestHospitalPhone ? openUrl(buildCallLink(latestHospitalPhone)) : undefined)}
              >
                <Text style={styles.quickActionTitle}>Call Hospital</Text>
                <Text style={styles.quickActionText}>{latestHospitalPhone || 'Firebase hospital phone missing'}</Text>
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
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      color: colors.text,
      backgroundColor: colors.mutedSurface,
      marginBottom: 8,
    },
    helperText: {
      fontSize: 11,
      color: colors.icon,
      lineHeight: 16,
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
    addButton: {
      backgroundColor: colors.tint,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 4,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
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
    codeText: {
      fontFamily: 'monospace',
      color: colors.text,
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
