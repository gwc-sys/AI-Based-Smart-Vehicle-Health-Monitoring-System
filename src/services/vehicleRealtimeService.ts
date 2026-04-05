import { getDatabase, onValue, ref } from 'firebase/database';
import { getFirebaseApp } from '@/services/firebaseConfig';

export type VehicleRealtimeReading = {
  accel_total_g?: number;
  accel_x?: number;
  accel_y?: number;
  accel_z?: number;
  accident_detected?: boolean;
  alarm?: boolean;
  gps_altitude?: number;
  gps_lat?: number;
  gps_lon?: number;
  gps_sats?: number;
  gps_speed_kmh?: number;
  heart_rate_bpm?: number;
  heart_rate_valid?: boolean;
  infrared_signal?: number;
  light?: number;
  motion_detected?: boolean;
  oxygen_saturation_spo2?: number;
  receivedAt?: number;
  sound?: number;
  spo2_valid?: boolean;
  temperature?: number;
  tilt_detected?: boolean;
  timestamp?: number;
  vibration?: number;
};

export type VehicleRealtimeStatus = {
  device_id?: string;
  status?: string;
  timestamp?: number;
};

export type VehicleRealtimeAlert = {
  acknowledged?: boolean;
  device_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  fromCurrentEmergency?: boolean;
  finger_detected?: boolean;
  gps_fix?: boolean;
  id?: string;
  device_id?: string;
  gps_altitude?: number;
  gps_lat?: number;
  gps_lon?: number;
  gps_sats?: number;
  gps_speed_kmh?: number;
  heart_rate_bpm?: number;
  hospital_address?: string;
  hospital_distance_km?: number;
  hospital_emergency_available?: boolean;
  hospital_latitude?: number;
  hospital_longitude?: number;
  hospital_map_url?: string;
  hospital_name?: string;
  hospital_phone?: string;
  aiHospital?: HospitalAiRecommendation;
  latitude?: number;
  last_known_latitude?: number;
  last_known_longitude?: number;
  last_updated?: number;
  longitude?: number;
  map_url?: string;
  message?: string;
  priority?: string;
  receivedAt?: number;
  satellites?: number;
  source?: string;
  spo2?: number;
  speed_kmh?: number;
  timestamp?: number;
  trigger_source?: string;
  type?: string;
};

export type HospitalAiRecommendation = {
  name?: string;
  address?: string;
  distance_km?: number;
  emergency_available?: boolean;
  facility_type?: string;
  open_now?: boolean;
  phone?: string;
  map_url?: string;
  website?: string;
  reason?: string;
  ui_card_title?: string;
  ui_card_subtitle?: string;
  selected_at?: string;
  latitude?: number;
  longitude?: number;
};

const DATABASE_ROOT = 'Ai-based-smart-vehicle-health';

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readNumberField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = toFiniteNumber(source[key]);
    if (typeof value === 'number') {
      return value;
    }
  }

  return undefined;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return undefined;
}

function readBooleanField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = toBoolean(source[key]);
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return undefined;
}

function toObjectRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readStringField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function hasGpsCoordinates(reading: VehicleRealtimeReading | null | undefined) {
  return (
    typeof reading?.gps_lat === 'number' &&
    Number.isFinite(reading.gps_lat) &&
    typeof reading?.gps_lon === 'number' &&
    Number.isFinite(reading.gps_lon)
  );
}

function normalizeVehicleReading(reading: VehicleRealtimeReading): VehicleRealtimeReading {
  const rawReading = reading as Record<string, unknown>;

  return {
    ...reading,
    accel_total_g: readNumberField(rawReading, 'accel_total_g'),
    accel_x: readNumberField(rawReading, 'accel_x'),
    accel_y: readNumberField(rawReading, 'accel_y'),
    accel_z: readNumberField(rawReading, 'accel_z'),
    accident_detected: readBooleanField(rawReading, 'accident_detected'),
    alarm: readBooleanField(rawReading, 'alarm'),
    gps_altitude: readNumberField(rawReading, 'gps_altitude', 'altitude', 'gpsAltitude'),
    gps_lat: readNumberField(rawReading, 'gps_lat', 'latitude', 'lat', 'gpsLatitude'),
    gps_lon: readNumberField(rawReading, 'gps_lon', 'longitude', 'lng', 'lon', 'gpsLongitude'),
    gps_sats: readNumberField(rawReading, 'gps_sats', 'satellites', 'gpsSatellites'),
    gps_speed_kmh: readNumberField(rawReading, 'gps_speed_kmh', 'speed', 'speed_kmh', 'gpsSpeedKmh'),
    heart_rate_bpm: readNumberField(rawReading, 'heart_rate_bpm', 'heartRateBpm'),
    heart_rate_valid: readBooleanField(rawReading, 'heart_rate_valid', 'heartRateValid'),
    infrared_signal: readNumberField(rawReading, 'infrared_signal', 'infraredSignal'),
    light: readNumberField(rawReading, 'light'),
    motion_detected: readBooleanField(rawReading, 'motion_detected'),
    oxygen_saturation_spo2: readNumberField(
      rawReading,
      'oxygen_saturation_spo2',
      'spo2',
      'oxygenSaturationSpo2'
    ),
    sound: readNumberField(rawReading, 'sound'),
    spo2_valid: readBooleanField(rawReading, 'spo2_valid', 'spo2Valid'),
    temperature: readNumberField(rawReading, 'temperature'),
    tilt_detected: readBooleanField(rawReading, 'tilt_detected'),
    timestamp: readNumberField(rawReading, 'timestamp'),
    vibration: readNumberField(rawReading, 'vibration'),
  };
}

function normalizeHospitalAi(raw: Record<string, unknown> | null): HospitalAiRecommendation | undefined {
  if (!raw) {
    return undefined;
  }

  const hospital = {
    name: readStringField(raw, 'hospital_name', 'name', 'ui_card_title'),
    address: readStringField(raw, 'address'),
    distance_km: readNumberField(raw, 'distance_km', 'hospital_distance_km', 'distanceKm'),
    emergency_available: readBooleanField(raw, 'emergency_available', 'hospital_emergency_available'),
    facility_type: readStringField(raw, 'facility_type', 'type'),
    open_now: readBooleanField(raw, 'open_now'),
    phone: readStringField(raw, 'phone', 'hospital_phone'),
    map_url: readStringField(raw, 'map_url', 'hospital_map_url'),
    website: readStringField(raw, 'website'),
    reason: readStringField(raw, 'reason'),
    ui_card_title: readStringField(raw, 'ui_card_title'),
    ui_card_subtitle: readStringField(raw, 'ui_card_subtitle'),
    selected_at: readStringField(raw, 'selected_at'),
    latitude: readNumberField(raw, 'latitude', 'hospital_latitude'),
    longitude: readNumberField(raw, 'longitude', 'hospital_longitude'),
  };

  const hasCoreFields = hospital.name || hospital.address || hospital.map_url;
  return hasCoreFields ? hospital : undefined;
}

function normalizeVehicleAlert(alert: VehicleRealtimeAlert): VehicleRealtimeAlert {
  const rawAlert = alert as Record<string, unknown>;
  const rawSosAlert = toObjectRecord(rawAlert.sos_alert);
  const rawHealth = toObjectRecord(rawSosAlert?.health);
  const rawLocation =
    toObjectRecord(rawAlert.location) ??
    toObjectRecord(rawSosAlert?.location);
  const rawAiResults = toObjectRecord(rawAlert.ai_results);
  const rawHospital =
    toObjectRecord(rawAlert.hospital) ??
    toObjectRecord(rawAlert.nearest_hospital) ??
    toObjectRecord(rawAlert.hospital_ai) ??
    toObjectRecord(rawAiResults?.hospital_ai);
  const aiHospital = normalizeHospitalAi(rawHospital);

  return {
    ...alert,
    acknowledged:
      readBooleanField(rawAlert, 'acknowledged') ??
      readBooleanField(rawSosAlert ?? {}, 'acknowledged'),
    device_id:
      readStringField(rawAlert, 'device_id') ??
      readStringField(rawSosAlert ?? {}, 'device_id') ??
      readStringField(rawHealth ?? {}, 'device_id'),
    device_name:
      readStringField(rawAlert, 'device_name') ??
      readStringField(rawSosAlert ?? {}, 'device_name') ??
      readStringField(rawHealth ?? {}, 'device_name'),
    emergency_contact_name:
      readStringField(rawAlert, 'emergency_contact_name') ??
      readStringField(rawSosAlert ?? {}, 'emergency_contact_name'),
    emergency_contact_phone:
      readStringField(rawAlert, 'emergency_contact_phone') ??
      readStringField(rawSosAlert ?? {}, 'emergency_contact_phone'),
    finger_detected:
      readBooleanField(rawAlert, 'finger_detected', 'fingerDetected') ??
      readBooleanField(rawHealth ?? {}, 'finger_detected', 'fingerDetected'),
    gps_fix:
      readBooleanField(rawAlert, 'gps_fix', 'gpsFix') ??
      readBooleanField(rawSosAlert ?? {}, 'gps_fix', 'gpsFix'),
    gps_altitude:
      readNumberField(rawAlert, 'gps_altitude', 'altitude', 'gpsAltitude') ??
      readNumberField(rawSosAlert ?? {}, 'gps_altitude', 'altitude', 'gpsAltitude') ??
      readNumberField(rawLocation ?? {}, 'gps_altitude', 'altitude', 'gpsAltitude'),
    gps_lat:
      readNumberField(rawAlert, 'gps_lat', 'latitude', 'lat', 'gpsLatitude') ??
      readNumberField(rawSosAlert ?? {}, 'gps_lat', 'latitude', 'lat', 'gpsLatitude') ??
      readNumberField(rawLocation ?? {}, 'latitude'),
    gps_lon:
      readNumberField(rawAlert, 'gps_lon', 'longitude', 'lng', 'lon', 'gpsLongitude') ??
      readNumberField(rawSosAlert ?? {}, 'gps_lon', 'longitude', 'lng', 'lon', 'gpsLongitude') ??
      readNumberField(rawLocation ?? {}, 'longitude'),
    gps_sats:
      readNumberField(rawAlert, 'gps_sats', 'satellites', 'gpsSatellites') ??
      readNumberField(rawSosAlert ?? {}, 'gps_sats', 'satellites', 'gpsSatellites'),
    gps_speed_kmh:
      readNumberField(rawAlert, 'gps_speed_kmh', 'speed_kmh', 'speed', 'gpsSpeedKmh') ??
      readNumberField(rawSosAlert ?? {}, 'gps_speed_kmh', 'speed_kmh', 'speed', 'gpsSpeedKmh'),
    heart_rate_bpm:
      readNumberField(rawAlert, 'heart_rate_bpm', 'heartRateBpm') ??
      readNumberField(rawHealth ?? {}, 'heart_rate_bpm', 'heartRateBpm'),
    hospital_address:
      readStringField(rawAlert, 'hospital_address', 'address') ??
      readStringField(rawSosAlert ?? {}, 'hospital_address', 'address') ??
      readStringField(rawHospital ?? {}, 'hospital_address', 'address'),
    hospital_distance_km:
      readNumberField(rawAlert, 'hospital_distance_km', 'hospitalDistanceKm', 'distance_km', 'distanceKm') ??
      readNumberField(rawHospital ?? {}, 'hospital_distance_km', 'distance_km', 'distanceKm'),
    hospital_emergency_available:
      readBooleanField(rawAlert, 'hospital_emergency_available', 'emergency_available') ??
      readBooleanField(rawHospital ?? {}, 'hospital_emergency_available', 'emergency_available'),
    hospital_latitude:
      readNumberField(rawAlert, 'hospital_latitude', 'destination_latitude') ??
      readNumberField(rawHospital ?? {}, 'latitude', 'hospital_latitude'),
    hospital_longitude:
      readNumberField(rawAlert, 'hospital_longitude', 'destination_longitude') ??
      readNumberField(rawHospital ?? {}, 'longitude', 'hospital_longitude'),
    hospital_map_url:
      readStringField(rawAlert, 'hospital_map_url') ??
      readStringField(rawHospital ?? {}, 'map_url', 'hospital_map_url'),
    hospital_name:
      readStringField(rawAlert, 'hospital_name', 'hospitalName') ??
      readStringField(rawHospital ?? {}, 'hospital_name', 'name'),
    hospital_phone:
      readStringField(rawAlert, 'hospital_phone', 'hospitalPhone') ??
      readStringField(rawHospital ?? {}, 'phone', 'hospital_phone'),
    aiHospital,
    latitude:
      readNumberField(rawAlert, 'latitude', 'gps_lat', 'lat', 'gpsLatitude') ??
      readNumberField(rawSosAlert ?? {}, 'latitude', 'gps_lat', 'lat', 'gpsLatitude') ??
      readNumberField(rawLocation ?? {}, 'latitude'),
    last_known_latitude: readNumberField(
      rawAlert,
      'last_known_latitude',
      'lastKnownLatitude',
      'previous_latitude'
    ),
    last_known_longitude: readNumberField(
      rawAlert,
      'last_known_longitude',
      'lastKnownLongitude',
      'previous_longitude'
    ),
    last_updated:
      readNumberField(rawAlert, 'last_updated', 'lastUpdated') ??
      readNumberField(rawSosAlert ?? {}, 'last_updated', 'lastUpdated'),
    longitude:
      readNumberField(rawAlert, 'longitude', 'gps_lon', 'lng', 'lon', 'gpsLongitude') ??
      readNumberField(rawSosAlert ?? {}, 'longitude', 'gps_lon', 'lng', 'lon', 'gpsLongitude') ??
      readNumberField(rawLocation ?? {}, 'longitude'),
    map_url:
      readStringField(rawAlert, 'map_url') ??
      readStringField(rawLocation ?? {}, 'map_url'),
    message:
      readStringField(rawAlert, 'message') ??
      readStringField(rawSosAlert ?? {}, 'message') ??
      readStringField(rawAlert, 'type') ??
      readStringField(rawSosAlert ?? {}, 'type'),
    priority:
      readStringField(rawAlert, 'priority') ??
      readStringField(rawSosAlert ?? {}, 'priority'),
    satellites:
      readNumberField(rawAlert, 'satellites', 'gps_sats', 'gpsSatellites') ??
      readNumberField(rawSosAlert ?? {}, 'satellites', 'gps_sats', 'gpsSatellites'),
    source:
      readStringField(rawAlert, 'source') ??
      readStringField(rawSosAlert ?? {}, 'source') ??
      readStringField(rawLocation ?? {}, 'source'),
    spo2:
      readNumberField(rawAlert, 'spo2', 'oxygen_saturation_spo2', 'oxygenSaturationSpo2') ??
      readNumberField(rawHealth ?? {}, 'spo2', 'oxygen_saturation_spo2', 'oxygenSaturationSpo2'),
    speed_kmh:
      readNumberField(rawAlert, 'speed_kmh', 'gps_speed_kmh', 'speed', 'gpsSpeedKmh') ??
      readNumberField(rawSosAlert ?? {}, 'speed_kmh', 'gps_speed_kmh', 'speed', 'gpsSpeedKmh'),
    trigger_source:
      readStringField(rawAlert, 'trigger_source', 'triggerSource') ??
      readStringField(rawSosAlert ?? {}, 'trigger_source', 'triggerSource'),
    timestamp:
      readNumberField(rawAlert, 'timestamp', 'last_updated', 'lastUpdated') ??
      readNumberField(rawSosAlert ?? {}, 'last_updated', 'lastUpdated', 'timestamp') ??
      readNumberField(rawHealth ?? {}, 'timestamp'),
    type:
      readStringField(rawAlert, 'type') ??
      readStringField(rawSosAlert ?? {}, 'type'),
  };
}

export function isSosVehicleAlert(alert: VehicleRealtimeAlert | null | undefined) {
  if (!alert) {
    return false;
  }

  const normalizedType = String(alert.type ?? '').trim().toLowerCase();
  const normalizedTriggerSource = String(alert.trigger_source ?? '').trim().toLowerCase();

  return (
    normalizedType === 'sos' ||
    normalizedTriggerSource === 'sos' ||
    normalizedType.includes('sos') ||
    normalizedType.includes('manual sos')
  );
}

export function getAlertCoordinates(alert: VehicleRealtimeAlert | null | undefined) {
  const latitude = alert?.gps_lat ?? alert?.latitude ?? alert?.last_known_latitude;
  const longitude = alert?.gps_lon ?? alert?.longitude ?? alert?.last_known_longitude;

  if (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  ) {
    return { latitude, longitude };
  }

  return null;
}

export function getHospitalCoordinates(alert: VehicleRealtimeAlert | null | undefined) {
  const latitude = alert?.hospital_latitude;
  const longitude = alert?.hospital_longitude;

  if (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  ) {
    return { latitude, longitude };
  }

  return null;
}

function normalizeVehicleStatus(status: VehicleRealtimeStatus | null): VehicleRealtimeStatus | null {
  if (!status) {
    return null;
  }

  return {
    ...status,
    timestamp: toFiniteNumber(status.timestamp),
  };
}

function sortByTimestamp<T extends { timestamp?: number }>(items: T[]) {
  return items.sort((left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0));
}

function getAlertSortValue(alert: VehicleRealtimeAlert) {
  const timestamp = alert.last_updated ?? alert.timestamp;
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return timestamp;
  }

  const numericId = toFiniteNumber(alert.id);
  return typeof numericId === 'number' ? numericId : 0;
}

function sortAlertsByRecency(alerts: VehicleRealtimeAlert[]) {
  return alerts.sort((left, right) => {
    const leftPriority = left.fromCurrentEmergency ? 1 : 0;
    const rightPriority = right.fromCurrentEmergency ? 1 : 0;

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority; // current emergency first
    }

    const leftSort = getAlertSortValue(left);
    const rightSort = getAlertSortValue(right);

    return rightSort - leftSort; // newest first
  });
}

function getAlertIdentity(alert: VehicleRealtimeAlert) {
  const timestamp = alert.last_updated ?? alert.timestamp;
  const type = String(alert.type ?? alert.message ?? '').trim().toLowerCase();
  const device = String(alert.device_id ?? alert.device_name ?? '').trim().toLowerCase();

  if (type && device && typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return `${device}|${type}|${timestamp}`;
  }

  if (alert.id) {
    return alert.id;
  }

  return `${device}|${type}|no-timestamp`;
}

function mergeDefinedAlertFields(
  base: VehicleRealtimeAlert,
  incoming: VehicleRealtimeAlert
): VehicleRealtimeAlert {
  const definedIncomingFields = Object.fromEntries(
    Object.entries(incoming).filter(([, value]) => value !== undefined)
  ) as Partial<VehicleRealtimeAlert>;
  const merged: VehicleRealtimeAlert = {
    ...base,
    ...definedIncomingFields,
  };

  return {
    ...merged,
    receivedAt: Math.max(base.receivedAt ?? 0, incoming.receivedAt ?? 0) || undefined,
    id: merged.id ?? incoming.id ?? base.id,
  };
}

function combineAlertSources(...alertGroups: VehicleRealtimeAlert[][]) {
  const combined = new Map<string, VehicleRealtimeAlert>();

  for (const group of alertGroups) {
    for (const alert of group) {
      const identity = getAlertIdentity(alert);
      const existing = combined.get(identity);

      if (!existing) {
        combined.set(identity, alert);
        continue;
      }

      combined.set(identity, mergeDefinedAlertFields(existing, alert));
    }
  }

  return sortAlertsByRecency(Array.from(combined.values()))
    .slice(0, 20);
}

function normalizeAlertCollection(
  value: Record<string, VehicleRealtimeAlert> | null,
  receivedAt: number
) {
  return Object.entries(value ?? {}).map(([id, alert]) => {
    const normalized = normalizeVehicleAlert(alert);

    return {
      ...normalized,
      id: normalized.id ?? id,
      receivedAt,
    };
  });
}

function normalizeCurrentEmergencyAlert(
  value: VehicleRealtimeAlert | null,
  receivedAt: number,
  fallbackId: string
) {
  if (!value) {
    return [];
  }

  const normalized = normalizeVehicleAlert(value);

  return [
    {
      ...normalized,
      id: normalized.id ?? fallbackId,
      fromCurrentEmergency: true,
      receivedAt,
    },
  ];
}

function collectReadingCollections(node: unknown): VehicleRealtimeReading[][] {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const objectNode = node as Record<string, unknown>;
  const localReadings = objectNode.readings;
  const nestedCollections = Object.values(objectNode).flatMap((value) => collectReadingCollections(value));

  if (!localReadings || typeof localReadings !== 'object') {
    return nestedCollections;
  }

  return [[...(Object.values(localReadings) as VehicleRealtimeReading[])], ...nestedCollections];
}

export function subscribeToVehicleReadings(
  callback: (readings: VehicleRealtimeReading[]) => void
) {
  const database = getDatabase(getFirebaseApp());
  const readingsRef = ref(database, '/');

  return onValue(readingsRef, (snapshot) => {
    const rootValue = snapshot.val() as Record<string, unknown> | null;
    const receivedAt = Date.now();
    const readingCollections = collectReadingCollections(rootValue).flatMap((collection) =>
      // Keep a recent slice from each device stream so lower-frequency health sensors
      // are not pushed out by a noisier accelerometer stream.
      sortByTimestamp(
        collection.map((reading) => ({
          ...normalizeVehicleReading(reading),
          receivedAt,
        }))
      ).slice(-12)
    );
    const normalizedReadings = sortByTimestamp(readingCollections);
    const latestGpsReading = [...normalizedReadings].reverse().find(hasGpsCoordinates) ?? null;
    const readings =
      latestGpsReading &&
      !normalizedReadings.some(
        (reading) =>
          reading.timestamp === latestGpsReading.timestamp &&
          reading.gps_lat === latestGpsReading.gps_lat &&
          reading.gps_lon === latestGpsReading.gps_lon
      )
        ? [...normalizedReadings, latestGpsReading]
        : normalizedReadings;

    callback(readings);
  });
}

export function subscribeToVehicleStatus(
  callback: (status: VehicleRealtimeStatus | null) => void
) {
  const database = getDatabase(getFirebaseApp());
  const statusRef = ref(database, `${DATABASE_ROOT}/status`);

  return onValue(statusRef, (snapshot) => {
    callback(normalizeVehicleStatus((snapshot.val() as VehicleRealtimeStatus | null) ?? null));
  });
}

export function subscribeToVehicleAlerts(
  callback: (alerts: VehicleRealtimeAlert[]) => void
) {
  const database = getDatabase(getFirebaseApp());
  const alertsRef = ref(database, 'alerts');
  const currentEmergencyRef = ref(database, `${DATABASE_ROOT}/emergency_response/current`);
  const fallbackCurrentEmergencyRef = ref(database, 'emergency_response/current');

  let nodeAlerts: VehicleRealtimeAlert[] = [];
  let currentEmergencyAlerts: VehicleRealtimeAlert[] = [];
  let hasNodeSnapshot = false;
  let hasCurrentEmergencySnapshot = false;
  let hasFallbackEmergencySnapshot = false;

  const emitCombinedAlerts = () => {
    // Wait for initial snapshots from all listeners so startup does not emit partial batches.
    if (!hasNodeSnapshot || !hasCurrentEmergencySnapshot || !hasFallbackEmergencySnapshot) {
      return;
    }

    callback(combineAlertSources(currentEmergencyAlerts, nodeAlerts));
  };

  const unsubscribeAlerts = onValue(alertsRef, (snapshot) => {
    nodeAlerts = normalizeAlertCollection(
      (snapshot.val() as Record<string, VehicleRealtimeAlert> | null) ?? null,
      Date.now()
    );
    hasNodeSnapshot = true;
    emitCombinedAlerts();
  });

  const unsubscribeCurrentEmergency = onValue(currentEmergencyRef, (snapshot) => {
    currentEmergencyAlerts = normalizeCurrentEmergencyAlert(
      (snapshot.val() as VehicleRealtimeAlert | null) ?? null,
      Date.now(),
      `${DATABASE_ROOT}/emergency_response/current`
    );
    hasCurrentEmergencySnapshot = true;
    emitCombinedAlerts();
  });

  const unsubscribeFallbackCurrentEmergency = onValue(fallbackCurrentEmergencyRef, (snapshot) => {
    const fallbackAlerts = normalizeCurrentEmergencyAlert(
      (snapshot.val() as VehicleRealtimeAlert | null) ?? null,
      Date.now(),
      'emergency_response/current'
    );

    currentEmergencyAlerts = fallbackAlerts.length > 0 ? fallbackAlerts : currentEmergencyAlerts;
    hasFallbackEmergencySnapshot = true;
    emitCombinedAlerts();
  });

  return () => {
    unsubscribeAlerts();
    unsubscribeCurrentEmergency();
    unsubscribeFallbackCurrentEmergency();
  };
}
