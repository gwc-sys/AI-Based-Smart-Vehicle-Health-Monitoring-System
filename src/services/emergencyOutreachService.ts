import * as Linking from 'expo-linking';
import { EmergencyContact } from './emergencyConfigService';
import { getAlertCoordinates, VehicleRealtimeAlert } from './vehicleRealtimeService';

/**
 * Send WhatsApp message to guardian contact
 */
export async function sendWhatsAppAlert(
  contact: EmergencyContact,
  sosAlert: VehicleRealtimeAlert | null,
  userLocation?: { latitude: number; longitude: number }
) {
  if (!contact.whatsapp?.trim()) {
    return false;
  }

  const phone = contact.whatsapp.replace(/[^\d+]/g, '');
  const personName = sosAlert?.device_name?.trim() || 'A loved one';
  const message = buildEmergencyAlertMessage(personName, sosAlert, userLocation);
  
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
      return true;
    }
  } catch (error) {
    console.error('WhatsApp send failed:', error);
  }
  
  return false;
}

/**
 * Send SMS to guardian contact
 */
export async function sendSmsAlert(
  contact: EmergencyContact,
  sosAlert: VehicleRealtimeAlert | null,
  userLocation?: { latitude: number; longitude: number }
) {
  if (!contact.phone?.trim()) {
    return false;
  }

  const phone = contact.phone.replace(/[^\d+]/g, '');
  const personName = sosAlert?.device_name?.trim() || 'A loved one';
  const message = buildEmergencyAlertMessage(personName, sosAlert, userLocation);
  
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;

  try {
    const supported = await Linking.canOpenURL(smsUrl);
    if (supported) {
      await Linking.openURL(smsUrl);
      return true;
    }
  } catch (error) {
    console.error('SMS send failed:', error);
  }
  
  return false;
}

/**
 * Send alerts to all guardian contacts via WhatsApp and SMS
 */
export async function sendEmergencyAlertsToAllGuardians(
  guardians: EmergencyContact[],
  sosAlert: VehicleRealtimeAlert | null,
  userLocation?: { latitude: number; longitude: number }
): Promise<{ whatsapp: number; sms: number; total: number }> {
  const results = {
    whatsapp: 0,
    sms: 0,
    total: guardians.length,
  };

  for (const guardian of guardians) {
    if (guardian.whatsapp?.trim()) {
      const sent = await sendWhatsAppAlert(guardian, sosAlert, userLocation);
      if (sent) results.whatsapp++;
    }

    if (guardian.phone?.trim() && !guardian.whatsapp?.trim()) {
      const sent = await sendSmsAlert(guardian, sosAlert, userLocation);
      if (sent) results.sms++;
    }
  }

  return results;
}

/**
 * Build emergency alert message with location and details
 */
function buildEmergencyAlertMessage(
  personName: string,
  sosAlert: VehicleRealtimeAlert | null,
  userLocation?: { latitude: number; longitude: number }
): string {
  const alertCoordinates = getAlertCoordinates(sosAlert);
  const resolvedLocation =
    userLocation ??
    (alertCoordinates
      ? { latitude: alertCoordinates.latitude, longitude: alertCoordinates.longitude }
      : undefined);
  const lines: string[] = [];
  
  lines.push(`🚨 EMERGENCY ALERT: ${personName} needs help!`);
  lines.push('');

  if (sosAlert?.message?.trim()) {
    lines.push(`Alert: ${sosAlert.message}`);
  }

  if (resolvedLocation) {
    const mapsLink = `https://maps.google.com/?q=${resolvedLocation.latitude},${resolvedLocation.longitude}`;
    lines.push(`📍 Location: ${mapsLink}`);
  }

  if (sosAlert?.hospital_name?.trim()) {
    lines.push(`🏥 Nearest Hospital: ${sosAlert.hospital_name}`);
  }

  lines.push('');
  lines.push('Please respond immediately.');

  return lines.join('\n');
}

/**
 * Log emergency alert to Firebase for record-keeping
 */
export async function logEmergencyOutreach(
  guardians: EmergencyContact[],
  sosAlert: VehicleRealtimeAlert | null,
  results: { whatsapp: number; sms: number; total: number }
) {
  const timestamp = new Date().toISOString();
  const outreachRecord = {
    timestamp,
    alertId: sosAlert?.id,
    deviceId: sosAlert?.device_id,
    totalGuardians: results.total,
    whatsappSent: results.whatsapp,
    smsSent: results.sms,
    guardianPhones: guardians.map((g) => ({ name: g.name, phone: g.phone })),
  };

  console.log('[Emergency Outreach]', outreachRecord);
  // TODO: Send to Firebase logging endpoint
}
