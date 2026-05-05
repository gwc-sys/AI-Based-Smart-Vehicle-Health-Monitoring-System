import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, push, ref, set } from 'firebase/database';
import { getFirebaseApp } from '@/services/firebaseConfig';
import { VehicleRealtimeAlert, VehicleRealtimeReading, isSosVehicleAlert } from '@/services/vehicleRealtimeService';

const PIPELINE_QUEUE_KEY = 'incident_pipeline_queue_v1';
const PIPELINE_STATUS_KEY = 'incident_pipeline_status_v1';
const PIPELINE_ROOT = 'incident_pipeline';
const DEDUPE_WINDOW_MS = 45 * 1000;
const MAX_QUEUE_SIZE = 250;

export type IncidentSeverity = 'info' | 'warning' | 'critical';
export type IncidentKind = 'sos' | 'accident' | 'tilt' | 'alarm' | 'heart_rate' | 'spo2' | 'sensor_anomaly';

export type IncidentEvent = {
  deviceId: string;
  kind: IncidentKind;
  severity: IncidentSeverity;
  source: 'reading' | 'alert' | 'derived';
  timestamp: number;
  summary: string;
  telemetry?: {
    accel_total_g?: number;
    heart_rate_bpm?: number;
    oxygen_saturation_spo2?: number;
    motion_detected?: boolean;
    tilt_detected?: boolean;
    accident_detected?: boolean;
    alarm?: boolean;
    gps_lat?: number;
    gps_lon?: number;
  };
  rawAlertId?: string;
  rawAlertType?: string;
  escalation: {
    stage: 'none' | 'guardian_notify_pending' | 'emergency_service_pending';
    reason?: string;
  };
};

type QueuedOperation = {
  id: string;
  createdAt: number;
  lastTriedAt?: number;
  attempts: number;
  op: 'write_incident';
  payload: IncidentEvent;
};

export type IncidentPipelineStatus = {
  queueDepth: number;
  lastSyncAt?: number;
  lastError?: string;
};

function now() {
  return Date.now();
}

function buildIncidentFingerprint(event: IncidentEvent) {
  const bucket = Math.floor(event.timestamp / DEDUPE_WINDOW_MS);
  return `${event.deviceId}|${event.kind}|${event.severity}|${bucket}`;
}

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(PIPELINE_QUEUE_KEY);
    if (!raw) {
      return [] as QueuedOperation[];
    }

    const parsed = JSON.parse(raw) as QueuedOperation[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && item.op === 'write_incident' && item.payload);
  } catch (error) {
    console.warn('[IncidentPipeline] Failed to parse queue', error);
    return [];
  }
}

async function writeQueue(queue: QueuedOperation[]) {
  await AsyncStorage.setItem(PIPELINE_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
}

async function readStatus(): Promise<IncidentPipelineStatus> {
  try {
    const raw = await AsyncStorage.getItem(PIPELINE_STATUS_KEY);
    if (!raw) {
      return { queueDepth: 0 };
    }

    const parsed = JSON.parse(raw) as IncidentPipelineStatus;
    return {
      queueDepth: typeof parsed?.queueDepth === 'number' ? parsed.queueDepth : 0,
      lastSyncAt: parsed?.lastSyncAt,
      lastError: parsed?.lastError,
    };
  } catch {
    return { queueDepth: 0 };
  }
}

async function writeStatus(status: IncidentPipelineStatus) {
  await AsyncStorage.setItem(PIPELINE_STATUS_KEY, JSON.stringify(status));
}

async function writeIncidentToCloud(event: IncidentEvent) {
  const db = getDatabase(getFirebaseApp());
  const eventsRef = ref(db, `${PIPELINE_ROOT}/events`);
  const eventRef = push(eventsRef);
  const eventId = eventRef.key ?? `${event.deviceId}-${event.timestamp}`;
  const payload = {
    ...event,
    id: eventId,
    fingerprint: buildIncidentFingerprint(event),
    createdAt: now(),
  };

  await set(eventRef, payload);
}

function shouldEscalateToGuardian(event: IncidentEvent) {
  return event.severity === 'critical';
}

export function deriveIncidents(
  readings: VehicleRealtimeReading[],
  alerts: VehicleRealtimeAlert[]
): IncidentEvent[] {
  const latestReading = readings[readings.length - 1];
  const latestAlert = alerts[0];
  const incidents: IncidentEvent[] = [];
  const readingTime = latestReading?.timestamp ?? latestReading?.receivedAt ?? now();
  const alertTime = latestAlert?.timestamp ?? latestAlert?.last_updated ?? latestAlert?.receivedAt ?? now();
  const baseDeviceId =
    latestAlert?.device_id?.trim() ||
    latestAlert?.device_name?.trim() ||
    'unknown-device';

  if (latestAlert && isSosVehicleAlert(latestAlert)) {
    incidents.push({
      deviceId: baseDeviceId,
      kind: 'sos',
      severity: 'critical',
      source: 'alert',
      timestamp: alertTime,
      summary: latestAlert.message?.trim() || 'SOS event detected from realtime alerts',
      rawAlertId: latestAlert.id,
      rawAlertType: latestAlert.type,
      telemetry: {
        heart_rate_bpm: latestAlert.heart_rate_bpm,
        oxygen_saturation_spo2: latestAlert.spo2,
        gps_lat: latestAlert.gps_lat ?? latestAlert.latitude,
        gps_lon: latestAlert.gps_lon ?? latestAlert.longitude,
      },
      escalation: {
        stage: 'guardian_notify_pending',
        reason: 'sos_alert',
      },
    });
  }

  if (latestReading?.accident_detected) {
    incidents.push({
      deviceId: baseDeviceId,
      kind: 'accident',
      severity: 'critical',
      source: 'reading',
      timestamp: readingTime,
      summary: 'Accident flag detected in latest reading',
      telemetry: {
        accel_total_g: latestReading.accel_total_g,
        accident_detected: latestReading.accident_detected,
        gps_lat: latestReading.gps_lat,
        gps_lon: latestReading.gps_lon,
      },
      escalation: {
        stage: 'guardian_notify_pending',
        reason: 'accident_detected',
      },
    });
  }

  if (latestReading?.tilt_detected) {
    incidents.push({
      deviceId: baseDeviceId,
      kind: 'tilt',
      severity: 'warning',
      source: 'reading',
      timestamp: readingTime,
      summary: 'Vehicle tilt detected',
      telemetry: {
        tilt_detected: latestReading.tilt_detected,
        accel_total_g: latestReading.accel_total_g,
      },
      escalation: { stage: 'none' },
    });
  }

  if (latestReading?.alarm) {
    incidents.push({
      deviceId: baseDeviceId,
      kind: 'alarm',
      severity: 'critical',
      source: 'reading',
      timestamp: readingTime,
      summary: 'Alarm activated from realtime readings',
      telemetry: {
        alarm: latestReading.alarm,
        motion_detected: latestReading.motion_detected,
      },
      escalation: {
        stage: 'guardian_notify_pending',
        reason: 'alarm_active',
      },
    });
  }

  if (
    typeof latestReading?.heart_rate_bpm === 'number' &&
    Number.isFinite(latestReading.heart_rate_bpm) &&
    (latestReading.heart_rate_bpm > 130 || latestReading.heart_rate_bpm < 45)
  ) {
    incidents.push({
      deviceId: baseDeviceId,
      kind: 'heart_rate',
      severity: 'critical',
      source: 'derived',
      timestamp: readingTime,
      summary: `Critical heart-rate anomaly: ${latestReading.heart_rate_bpm.toFixed(0)} bpm`,
      telemetry: {
        heart_rate_bpm: latestReading.heart_rate_bpm,
        oxygen_saturation_spo2: latestReading.oxygen_saturation_spo2,
      },
      escalation: {
        stage: 'guardian_notify_pending',
        reason: 'heart_rate_threshold',
      },
    });
  }

  if (
    typeof latestReading?.oxygen_saturation_spo2 === 'number' &&
    Number.isFinite(latestReading.oxygen_saturation_spo2) &&
    latestReading.oxygen_saturation_spo2 > 0 &&
    latestReading.oxygen_saturation_spo2 < 90
  ) {
    incidents.push({
      deviceId: baseDeviceId,
      kind: 'spo2',
      severity: 'critical',
      source: 'derived',
      timestamp: readingTime,
      summary: `Critical SpO2 anomaly: ${latestReading.oxygen_saturation_spo2.toFixed(0)}%`,
      telemetry: {
        oxygen_saturation_spo2: latestReading.oxygen_saturation_spo2,
        heart_rate_bpm: latestReading.heart_rate_bpm,
      },
      escalation: {
        stage: 'guardian_notify_pending',
        reason: 'spo2_threshold',
      },
    });
  }

  return incidents;
}

export class IncidentPipelineService {
  private inFlightFlush = false;
  private seenFingerprints = new Set<string>();

  async getStatus() {
    return readStatus();
  }

  async recordIncident(event: IncidentEvent) {
    const fingerprint = buildIncidentFingerprint(event);
    if (this.seenFingerprints.has(fingerprint)) {
      return;
    }
    this.seenFingerprints.add(fingerprint);

    const queuedOperation: QueuedOperation = {
      id: `${fingerprint}|${now()}`,
      createdAt: now(),
      attempts: 0,
      op: 'write_incident',
      payload: event,
    };

    const queue = await readQueue();
    queue.push(queuedOperation);
    await writeQueue(queue);
    await writeStatus({ queueDepth: queue.length });
  }

  async flushQueue() {
    if (this.inFlightFlush) {
      return;
    }
    this.inFlightFlush = true;

    try {
      const queue = await readQueue();
      if (queue.length === 0) {
        await writeStatus({ queueDepth: 0, lastSyncAt: now() });
        return;
      }

      const pending: QueuedOperation[] = [];
      let lastError: string | undefined;

      for (const operation of queue) {
        try {
          operation.attempts += 1;
          operation.lastTriedAt = now();
          await writeIncidentToCloud(operation.payload);

          if (shouldEscalateToGuardian(operation.payload)) {
            const db = getDatabase(getFirebaseApp());
            const escalationRef = ref(db, `${PIPELINE_ROOT}/escalations/${operation.payload.deviceId}`);
            await set(escalationRef, {
              stage: operation.payload.escalation.stage,
              reason: operation.payload.escalation.reason ?? 'critical_event',
              updatedAt: now(),
              summary: operation.payload.summary,
              incidentKind: operation.payload.kind,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'queue_flush_failed';
          lastError = message;
          pending.push(operation);
        }
      }

      await writeQueue(pending);
      await writeStatus({
        queueDepth: pending.length,
        lastSyncAt: now(),
        lastError,
      });
    } finally {
      this.inFlightFlush = false;
    }
  }
}

export const incidentPipelineService = new IncidentPipelineService();
