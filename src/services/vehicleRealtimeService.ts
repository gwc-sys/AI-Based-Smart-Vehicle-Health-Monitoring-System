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
  light?: number;
  motion_detected?: boolean;
  receivedAt?: number;
  sound?: number;
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
  id?: string;
  device_id?: string;
  gps_altitude?: number;
  gps_lat?: number;
  gps_lon?: number;
  gps_sats?: number;
  gps_speed_kmh?: number;
  latitude?: number;
  longitude?: number;
  message?: string;
  receivedAt?: number;
  satellites?: number;
  speed_kmh?: number;
  timestamp?: number;
  type?: string;
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
    gps_altitude: readNumberField(rawReading, 'gps_altitude', 'altitude', 'gpsAltitude'),
    gps_lat: readNumberField(rawReading, 'gps_lat', 'latitude', 'lat', 'gpsLatitude'),
    gps_lon: readNumberField(rawReading, 'gps_lon', 'longitude', 'lng', 'lon', 'gpsLongitude'),
    gps_sats: readNumberField(rawReading, 'gps_sats', 'satellites', 'gpsSatellites'),
    gps_speed_kmh: readNumberField(rawReading, 'gps_speed_kmh', 'speed', 'speed_kmh', 'gpsSpeedKmh'),
    light: readNumberField(rawReading, 'light'),
    sound: readNumberField(rawReading, 'sound'),
    temperature: readNumberField(rawReading, 'temperature'),
    timestamp: readNumberField(rawReading, 'timestamp'),
    vibration: readNumberField(rawReading, 'vibration'),
  };
}

function normalizeVehicleAlert(alert: VehicleRealtimeAlert): VehicleRealtimeAlert {
  const rawAlert = alert as Record<string, unknown>;

  return {
    ...alert,
    gps_altitude: readNumberField(rawAlert, 'gps_altitude', 'altitude', 'gpsAltitude'),
    gps_lat: readNumberField(rawAlert, 'gps_lat', 'latitude', 'lat', 'gpsLatitude'),
    gps_lon: readNumberField(rawAlert, 'gps_lon', 'longitude', 'lng', 'lon', 'gpsLongitude'),
    gps_sats: readNumberField(rawAlert, 'gps_sats', 'satellites', 'gpsSatellites'),
    gps_speed_kmh: readNumberField(rawAlert, 'gps_speed_kmh', 'speed_kmh', 'speed', 'gpsSpeedKmh'),
    latitude: readNumberField(rawAlert, 'latitude', 'gps_lat', 'lat', 'gpsLatitude'),
    longitude: readNumberField(rawAlert, 'longitude', 'gps_lon', 'lng', 'lon', 'gpsLongitude'),
    satellites: readNumberField(rawAlert, 'satellites', 'gps_sats', 'gpsSatellites'),
    speed_kmh: readNumberField(rawAlert, 'speed_kmh', 'gps_speed_kmh', 'speed', 'gpsSpeedKmh'),
    timestamp: toFiniteNumber(alert.timestamp),
  };
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

export function subscribeToVehicleReadings(
  callback: (readings: VehicleRealtimeReading[]) => void
) {
  const database = getDatabase(getFirebaseApp());
  const readingsRef = ref(database, `${DATABASE_ROOT}/readings`);

  return onValue(readingsRef, (snapshot) => {
    const value = snapshot.val() as Record<string, VehicleRealtimeReading> | null;
    const receivedAt = Date.now();
    const normalizedReadings = sortByTimestamp(
      Object.values(value ?? {}).map((reading) => ({
        ...normalizeVehicleReading(reading),
        receivedAt,
      }))
    );
    const recentReadings = normalizedReadings.slice(-12);
    const latestGpsReading = [...normalizedReadings].reverse().find(hasGpsCoordinates) ?? null;
    const readings =
      latestGpsReading &&
      !recentReadings.some(
        (reading) =>
          reading.timestamp === latestGpsReading.timestamp &&
          reading.gps_lat === latestGpsReading.gps_lat &&
          reading.gps_lon === latestGpsReading.gps_lon
      )
        ? [...recentReadings.slice(-11), latestGpsReading]
        : recentReadings;

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

  return onValue(alertsRef, (snapshot) => {
    const value = snapshot.val() as Record<string, VehicleRealtimeAlert> | null;
    const alerts = sortByTimestamp(
      Object.entries(value ?? {}).map(([id, alert]) => ({
        id,
        receivedAt: Date.now(),
        ...normalizeVehicleAlert(alert),
      }))
    )
      .slice(-20)
      .reverse();
    callback(alerts);
  });
}
