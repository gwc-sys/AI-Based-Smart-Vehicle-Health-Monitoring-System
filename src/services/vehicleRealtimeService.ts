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
  message?: string;
  receivedAt?: number;
  timestamp?: number;
  type?: string;
};

const DATABASE_ROOT = 'Ai-based-smart-vehicle-health';

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
    const readings = sortByTimestamp(
      Object.values(value ?? {}).map((reading) => ({
        ...reading,
        receivedAt,
      }))
    ).slice(-12);
    callback(readings);
  });
}

export function subscribeToVehicleStatus(
  callback: (status: VehicleRealtimeStatus | null) => void
) {
  const database = getDatabase(getFirebaseApp());
  const statusRef = ref(database, `${DATABASE_ROOT}/status`);

  return onValue(statusRef, (snapshot) => {
    callback((snapshot.val() as VehicleRealtimeStatus | null) ?? null);
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
        ...alert,
      }))
    )
      .slice(-20)
      .reverse();
    callback(alerts);
  });
}
