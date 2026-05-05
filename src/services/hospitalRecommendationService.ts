import { getDatabase, onValue, ref } from 'firebase/database';
import { getFirebaseApp } from '@/services/firebaseConfig';
import { HospitalAiRecommendation } from '@/services/vehicleRealtimeService';

const DATABASE_ROOT = 'Ai-based-smart-vehicle-health';

function toObjectRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

function readStringField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function readNumberField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = toFiniteNumber(source[key]);
    if (typeof value === 'number') return value;
  }
  return undefined;
}

function readBooleanField(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = toBoolean(source[key]);
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function normalizeHospitalRecommendation(raw: Record<string, unknown> | null): HospitalAiRecommendation | null {
  if (!raw) {
    return null;
  }

  const recommendation: HospitalAiRecommendation = {
    name: readStringField(raw, 'name', 'hospital_name', 'ui_card_title'),
    address: readStringField(raw, 'address', 'hospital_address'),
    distance_km: readNumberField(raw, 'distance_km', 'hospital_distance_km', 'distanceKm'),
    emergency_available: readBooleanField(raw, 'emergency_available', 'hospital_emergency_available'),
    facility_type: readStringField(raw, 'facility_type', 'type'),
    open_now: readBooleanField(raw, 'open_now'),
    phone: readStringField(raw, 'phone', 'hospital_phone'),
    map_url: readStringField(raw, 'map_url', 'hospital_map_url'),
    website: readStringField(raw, 'website'),
    reason: readStringField(raw, 'reason', 'message'),
    ui_card_title: readStringField(raw, 'ui_card_title'),
    ui_card_subtitle: readStringField(raw, 'ui_card_subtitle'),
    selected_at: readStringField(raw, 'selected_at'),
    latitude: readNumberField(raw, 'latitude', 'hospital_latitude'),
    longitude: readNumberField(raw, 'longitude', 'hospital_longitude'),
  };

  const hasCoreFields =
    recommendation.name ||
    recommendation.address ||
    recommendation.map_url ||
    (typeof recommendation.latitude === 'number' && typeof recommendation.longitude === 'number');

  return hasCoreFields ? recommendation : null;
}

function candidatePaths(deviceId?: string | null) {
  const trimmedDeviceId = deviceId?.trim();
  const paths = [
    `${DATABASE_ROOT}/emergency_response/current/hospital_ai`,
    `${DATABASE_ROOT}/emergency_response/current/hospital`,
    'emergency_response/current/hospital_ai',
    'emergency_response/current/hospital',
    `${DATABASE_ROOT}/hospital_recommendation`,
    'hospital_recommendation',
  ];

  if (trimmedDeviceId) {
    paths.push(
      `${trimmedDeviceId}/emergency_response/current/hospital_ai`,
      `${trimmedDeviceId}/emergency_response/current/hospital`,
      `${trimmedDeviceId}/hospital_recommendation`,
      `hospital_recommendation/${trimmedDeviceId}`
    );
  }

  return paths;
}

export function subscribeToHospitalRecommendation(
  callback: (recommendation: HospitalAiRecommendation | null) => void,
  deviceId?: string | null
) {
  const db = getDatabase(getFirebaseApp());
  const paths = candidatePaths(deviceId);
  const pathStates: Record<string, HospitalAiRecommendation | null> = {};

  const emitBestRecommendation = () => {
    for (const path of paths) {
      const value = pathStates[path];
      if (value) {
        callback(value);
        return;
      }
    }
    callback(null);
  };

  const unsubscribers = paths.map((path) =>
    onValue(
      ref(db, path),
      (snapshot) => {
        const rawValue = snapshot.val();
        const record = toObjectRecord(rawValue);
        pathStates[path] = normalizeHospitalRecommendation(record);
        emitBestRecommendation();
      },
      () => {
        pathStates[path] = null;
        emitBestRecommendation();
      }
    )
  );

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
}

