import { getDatabase, onValue, ref } from 'firebase/database';
import { getFirebaseApp } from '@/services/firebaseConfig';
import { VehicleRealtimeAlert } from '@/services/vehicleRealtimeService';

const DATABASE_ROOT = 'Ai-based-smart-vehicle-health';

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  relationship?: string;
};

export type EmergencyConfig = {
  ambulanceNumber?: string;
  emergencyNumber?: string;
  familyContacts: EmergencyContact[];
  sosConfirmationHint?: string;
  hospitalName?: string;
  hospitalPhone?: string;
  sourcePath?: string;
};

export const EMPTY_EMERGENCY_CONFIG: EmergencyConfig = {
  ambulanceNumber: '',
  emergencyNumber: '',
  familyContacts: [],
  sosConfirmationHint: '',
  hospitalName: '',
  hospitalPhone: '',
  sourcePath: '',
};

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeContact(contact: Record<string, unknown>, index: number): EmergencyContact {
  return {
    id: readString(contact.id) || `contact-${index + 1}`,
    name:
      readString(contact.name) ||
      readString(contact.contact_name) ||
      readString(contact.guardian_name) ||
      `Emergency Contact ${index + 1}`,
    phone:
      readString(contact.phone) ||
      readString(contact.mobile) ||
      readString(contact.contact_phone) ||
      readString(contact.guardian_phone),
    whatsapp:
      readString(contact.whatsapp) ||
      readString(contact.whatsapp_number) ||
      readString(contact.whatsappPhone),
    relationship:
      readString(contact.relationship) ||
      readString(contact.relation) ||
      readString(contact.type),
  };
}

function normalizeContacts(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((contact, index) => normalizeContact(contact, index))
      .filter((contact) => contact.phone);
  }

  if (value && typeof value === 'object') {
    return Object.values(value)
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((contact, index) => normalizeContact(contact, index))
      .filter((contact) => contact.phone);
  }

  return [];
}

function firstNonEmptyArray<T>(...values: T[][]) {
  return values.find((value) => value.length > 0) ?? [];
}

function normalizeEmergencyConfig(
  rawValue: Record<string, unknown> | null | undefined,
  sourcePath: string
): EmergencyConfig {
  if (!rawValue) {
    return {
      ...EMPTY_EMERGENCY_CONFIG,
      sourcePath,
    };
  }

  return {
    emergencyNumber:
      readString(rawValue.emergencyNumber) ||
      readString(rawValue.emergency_number) ||
      readString(rawValue.erss_number) ||
      readString(rawValue.primary_emergency_number),
    ambulanceNumber:
      readString(rawValue.ambulanceNumber) ||
      readString(rawValue.ambulance_number) ||
      readString(rawValue.ambulancePhone) ||
      readString(rawValue.secondary_emergency_number),
    familyContacts: firstNonEmptyArray(
      normalizeContacts(rawValue.familyContacts),
      normalizeContacts(rawValue.family_contacts),
      normalizeContacts(rawValue.contacts),
      normalizeContacts(rawValue.guardians)
    ),
    sosConfirmationHint:
      readString(rawValue.sosConfirmationHint) ||
      readString(rawValue.sos_confirmation_hint) ||
      readString(rawValue.confirmation_hint),
    hospitalName:
      readString(rawValue.hospitalName) ||
      readString(rawValue.hospital_name) ||
      readString(rawValue.nearest_hospital_name),
    hospitalPhone:
      readString(rawValue.hospitalPhone) ||
      readString(rawValue.hospital_phone) ||
      readString(rawValue.nearest_hospital_phone),
    sourcePath,
  };
}

function isUsableConfig(config: EmergencyConfig) {
  return Boolean(
    config.emergencyNumber ||
      config.ambulanceNumber ||
      config.hospitalName ||
      config.hospitalPhone ||
      config.familyContacts.length
  );
}

function getObjectAtPath(root: Record<string, unknown>, path: string) {
  const parts = path.split('/').filter(Boolean);
  let current: unknown = root;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return null;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current && typeof current === 'object' ? (current as Record<string, unknown>) : null;
}

export function subscribeToEmergencyConfig(callback: (config: EmergencyConfig) => void) {
  const database = getDatabase(getFirebaseApp());
  const rootRef = ref(database, '/');

  const candidatePaths = [
    `${DATABASE_ROOT}/emergency`,
    `${DATABASE_ROOT}/emergencyConfig`,
    `${DATABASE_ROOT}/sos`,
    'emergency',
    'emergencyConfig',
    'sos',
  ];

  return onValue(rootRef, (snapshot) => {
    const rootValue = (snapshot.val() as Record<string, unknown> | null) ?? null;

    if (!rootValue) {
      callback(EMPTY_EMERGENCY_CONFIG);
      return;
    }

    for (const path of candidatePaths) {
      const rawConfig = getObjectAtPath(rootValue, path);
      const config = normalizeEmergencyConfig(rawConfig, path);

      if (isUsableConfig(config)) {
        callback(config);
        return;
      }
    }

    callback(EMPTY_EMERGENCY_CONFIG);
  });
}

export function resolveEmergencyConfigFromAlert(
  config: EmergencyConfig,
  alert: VehicleRealtimeAlert | null | undefined
) {
  const familyContacts = alert?.emergency_contact_phone
    ? [
        {
          id: 'alert-emergency-contact',
          name: alert.emergency_contact_name?.trim() || 'Emergency Contact',
          phone: alert.emergency_contact_phone.trim(),
          whatsapp: alert.emergency_contact_phone.trim(),
          relationship: 'Alert contact',
        },
        ...config.familyContacts.filter((contact) => contact.phone !== alert.emergency_contact_phone.trim()),
      ]
    : config.familyContacts;

  return {
    ...config,
    familyContacts,
    hospitalName: alert?.hospital_name?.trim() || config.hospitalName || '',
    hospitalPhone: alert?.hospital_phone?.trim() || config.hospitalPhone || '',
  };
}

export function buildGoogleMapsLink(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

export function buildHospitalSearchLink(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/hospital/@${latitude},${longitude},15z`;
}

export function buildEmergencyMessage(
  alert: VehicleRealtimeAlert | null,
  latitude?: number,
  longitude?: number
) {
  const locationLine =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? ` Location: ${buildGoogleMapsLink(latitude, longitude)}`
      : '';

  const deviceLine = alert?.device_id ? ` Device: ${alert.device_id}.` : '';
  const sourceMessage = alert?.message?.trim() || 'SOS triggered from AI Vehicle Health Monitoring device.';

  return `${sourceMessage}${deviceLine}${locationLine}`.trim();
}

export function sanitizePhoneNumber(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

export function buildCallLink(phone: string) {
  return `tel:${sanitizePhoneNumber(phone)}`;
}

export function buildSmsLink(phone: string, body: string) {
  const target = sanitizePhoneNumber(phone);
  return `sms:${target}?body=${encodeURIComponent(body)}`;
}

export function buildWhatsAppLink(phone: string, body: string) {
  const target = sanitizePhoneNumber(phone).replace('+', '');
  return `https://wa.me/${target}?text=${encodeURIComponent(body)}`;
}
