import SosAlertModal from '@/components/SosAlertModal';
import { useAppTheme } from '@/context/ThemeContext';
import useVehicleRealtimeStream from '@/hooks/useVehicleRealtimeStream';
import {
    buildCallLink,
    buildDirectionsLink,
    buildGoogleMapsLink,
    buildHospitalSearchLink,
    EmergencyConfig,
    EmergencyContact,
    EMPTY_EMERGENCY_CONFIG,
    resolveEmergencyConfigFromAlert,
    saveEmergencyConfig,
    subscribeToEmergencyConfig
} from '@/services/emergencyConfigService';
import {
    getAlertCoordinates,
    getHospitalCoordinates,
    isSosVehicleAlert,
    VehicleRealtimeAlert,
    VehicleRealtimeReading,
} from '@/services/vehicleRealtimeService';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

function buildContactDrafts(contacts: EmergencyContact[]) {
  const drafts = contacts.slice(0, 5).map((contact, index) => ({
    id: contact.id || `contact-${index + 1}`,
    name: contact.name?.trim() || '',
    phone: contact.phone?.trim() || '',
    whatsapp: contact.whatsapp?.trim() || '',
    relationship: contact.relationship?.trim() || '',
  }));

  while (drafts.length < 5) {
    drafts.push({
      id: `contact-${drafts.length + 1}`,
      name: '',
      phone: '',
      whatsapp: '',
      relationship: '',
    });
  }

  return drafts;
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
  const [contactDrafts, setContactDrafts] = useState<EmergencyContact[]>([]);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<VehicleRealtimeAlert | null>(null);
  const { readings: realtimeReadings, alerts: realtimeAlerts } = useVehicleRealtimeStream({
    readingEmitIntervalMs: 3000,
  });
  const [latestReading, setLatestReading] = useState<VehicleRealtimeReading | null>(null);
  const latestSos = alerts.find((item) => item.type === 'sos') ?? null;

  useEffect(() => {
    const unsubscribe = subscribeToEmergencyConfig(setEmergencyConfig);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setAlerts(realtimeAlerts.map(mapRealtimeAlert));
  }, [realtimeAlerts]);

  useEffect(() => {
    const lastGps = [...realtimeReadings]
      .reverse()
      .find(
        (reading) =>
          typeof reading.gps_lat === 'number' &&
          Number.isFinite(reading.gps_lat) &&
          typeof reading.gps_lon === 'number' &&
          Number.isFinite(reading.gps_lon)
      );
    setLatestReading(lastGps ?? null);
  }, [realtimeReadings]);

  useEffect(() => {
    setContactDrafts(buildContactDrafts(emergencyConfig.familyContacts));
  }, [emergencyConfig.familyContacts]);

  function updateContactDraft(index: number, field: keyof EmergencyContact, value: string) {
    setContactDrafts((current) =>
      current.map((contact, idx) =>
        idx === index
          ? {
              ...contact,
              [field]: value,
            }
          : contact
      )
    );
    setSaveStatus(null);
  }

  async function handleSaveContacts() {
    const contactList = contactDrafts.slice(0, 5).map((contact) => ({
      ...contact,
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      relationship: contact.relationship?.trim() ?? '',
      whatsapp: contact.whatsapp?.trim() ?? '',
    }));

    const hasPartialEntry = contactList.some(
      (contact) => (contact.name && !contact.phone) || (!contact.name && contact.phone)
    );
    if (hasPartialEntry) {
      Alert.alert('Save Failed', 'Each contact needs both name and phone, or keep both fields empty.');
      return;
    }

    setIsSavingContacts(true);
    setSaveStatus(null);

    try {
      const validContacts = contactList.filter((contact) => contact.name && contact.phone);
      if (validContacts.length === 0) {
        Alert.alert('Save Failed', 'Add at least one complete guardian contact.');
        return;
      }

      await saveEmergencyConfig({
        ...emergencyConfig,
        familyContacts: validContacts,
      });
      setSaveStatus(`Saved ${validContacts.length} contacts to Firebase.`);
      setShowContactsModal(false);
    } catch (error) {
      console.error('Unable to save guardian contacts', error);
      Alert.alert('Save Failed', 'Unable to save guardian contacts. Please try again.');
      setSaveStatus('Unable to save guardian contacts.');
    } finally {
      setIsSavingContacts(false);
    }
  }

  const latestCoordinates = latestSos ? getAlertCoordinates(latestSos.raw) : null;
  const latestHospitalCoordinates = latestSos ? getHospitalCoordinates(latestSos.raw) : null;
  const resolvedEmergencyConfig = resolveEmergencyConfigFromAlert(emergencyConfig, latestSos?.raw);
  const emergencyNumber = resolvedEmergencyConfig.emergencyNumber?.trim() || '';
  const ambulanceNumber = resolvedEmergencyConfig.ambulanceNumber?.trim() || '';
  const configuredContacts = contactDrafts.filter((contact) => contact.name && contact.phone);
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
  const liveLatitude = latestReading?.gps_lat ?? latestCoordinates?.latitude;
  const liveLongitude = latestReading?.gps_lon ?? latestCoordinates?.longitude;
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
          <Text style={styles.sectionHint}>
            Keep your primary emergency contacts updated for fast SOS outreach.
          </Text>
          
          <TouchableOpacity
            style={styles.editContactsButton}
            onPress={() => setShowContactsModal(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.editContactsButtonTitle}>Manage Contacts</Text>
              <Text style={styles.editContactsButtonSub}>{configuredContacts.length} active of 5 slots</Text>
            </View>
            <Text style={styles.editContactsButtonArrow}>{'>'}</Text>
          </TouchableOpacity>
          {configuredContacts.length === 0 ? (
            <Text style={styles.empty}>No contacts saved yet.</Text>
          ) : (
            configuredContacts.slice(0, 3).map((contact) => (
              <View key={contact.id} style={styles.contactPreviewCard}>
                <View style={styles.contactPreviewTopRow}>
                  <Text style={styles.contactPreviewName}>{contact.name}</Text>
                  <Text style={styles.contactPreviewMeta}>
                    {contact.relationship || 'Emergency Contact'}
                  </Text>
                </View>
                <Text style={styles.contactPreviewPhone}>{contact.phone}</Text>
                {contact.whatsapp ? (
                  <Text style={styles.contactPreviewMeta}>WhatsApp: {contact.whatsapp}</Text>
                ) : null}
              </View>
            ))
          )}
          {saveStatus ? <Text style={styles.saveStatusText}>{saveStatus}</Text> : null}
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

      <Modal visible={showContactsModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContactsModal(false)}>
              <Text style={styles.modalCloseButton}>x</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Guardian Contacts</Text>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.modalSubtitle}>
            Fill only the contacts you need. Name and phone are required for each saved contact.
          </Text>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {contactDrafts.map((contact, index) => (
              <View key={contact.id} style={styles.modalContactCard}>
                <View style={styles.modalContactHeader}>
                  <Text style={styles.modalContactNumber}>Contact {index + 1}</Text>
                  <Text style={styles.modalContactStatus}>
                    {contact.name && contact.phone ? 'Ready' : 'Empty'}
                  </Text>
                </View>
                <View style={styles.modalContactFields}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Full name"
                    placeholderTextColor={colors.icon}
                    value={contact.name}
                    onChangeText={(text) => updateContactDraft(index, 'name', text)}
                  />
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Primary phone number"
                    placeholderTextColor={colors.icon}
                    keyboardType="phone-pad"
                    value={contact.phone}
                    onChangeText={(text) => updateContactDraft(index, 'phone', text)}
                  />
                  <Text style={styles.inputLabel}>WhatsApp (optional)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="WhatsApp number"
                    placeholderTextColor={colors.icon}
                    keyboardType="phone-pad"
                    value={contact.whatsapp}
                    onChangeText={(text) => updateContactDraft(index, 'whatsapp', text)}
                  />
                  <Text style={styles.inputLabel}>Relationship (optional)</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="Parent, spouse, sibling..."
                    placeholderTextColor={colors.icon}
                    value={contact.relationship}
                    onChangeText={(text) => updateContactDraft(index, 'relationship', text)}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalSaveButton, isSavingContacts && styles.saveButtonLoading]}
              disabled={isSavingContacts}
              onPress={handleSaveContacts}
            >
              <View style={styles.saveButtonContent}>
                {isSavingContacts ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" style={styles.saveButtonSpinner} />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <Text style={styles.saveButtonText}>Save Contacts</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      <SosAlertModal
        visible={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        alert={selectedAlert}
        reading={latestReading}
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
    sectionHint: {
      fontSize: 12,
      color: colors.icon,
      marginBottom: 10,
      lineHeight: 18,
    },
    editContactCard: {
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
    },
    editContactLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.background,
      color: colors.text,
      marginBottom: 10,
      fontSize: 14,
    },
    saveButton: {
      backgroundColor: colors.tint,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    saveButtonLoading: {
      opacity: 0.8,
      borderWidth: 1,
      borderColor: colors.tint,
    },
    saveButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    saveButtonSpinner: {
      marginRight: 4,
    },
    saveLockIcon: {
      fontSize: 16,
      marginRight: 4,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
    saveStatusText: {
      fontSize: 13,
      color: colors.text,
      marginBottom: 10,
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
    editContactsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
    },
    editContactsButtonTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    editContactsButtonSub: {
      fontSize: 12,
      color: colors.icon,
    },
    editContactsButtonArrow: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.icon,
    },
    contactPreviewCard: {
      backgroundColor: colors.mutedSurface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
    },
    contactPreviewTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginBottom: 6,
    },
    contactPreviewName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    contactPreviewPhone: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    contactPreviewMeta: {
      color: colors.icon,
      fontSize: 12,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalCloseButton: {
      fontSize: 24,
      color: colors.text,
      fontWeight: '600',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    modalSubtitle: {
      color: colors.icon,
      fontSize: 12,
      lineHeight: 18,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    modalScroll: {
      flex: 1,
    },
    modalContent: {
      padding: 16,
      gap: 16,
    },
    modalContactCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    modalContactHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalContactNumber: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.tint,
    },
    modalContactStatus: {
      fontSize: 11,
      color: colors.icon,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    modalContactFields: {
      gap: 10,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.icon,
      marginBottom: -4,
    },
    modalTextInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.background,
      color: colors.text,
      fontSize: 13,
    },
    modalFooter: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalSaveButton: {
      backgroundColor: colors.tint,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
    },
  });


