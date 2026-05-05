import { requestPermissions, sendImmediateNotification } from '@/services/notificationService';
import {
  isSosVehicleAlert,
  VehicleRealtimeAlert,
} from '@/services/vehicleRealtimeService';
import useVehicleRealtimeStream from '@/hooks/useVehicleRealtimeStream';
import React, { useEffect, useRef, useState } from 'react';
import SosAlertModal from './SosAlertModal';

export default function GlobalSosAlertModal() {
  const [latestSosAlert, setLatestSosAlert] = useState<VehicleRealtimeAlert | null>(null);
  const [visible, setVisible] = useState(false);
  const hasHydratedRef = useRef(false);
  const seenSosKeysRef = useRef<Set<string>>(new Set());
  const { readings, status: deviceStatus, alerts } = useVehicleRealtimeStream({
    readingEmitIntervalMs: 3000,
  });
  const latestRealtimeReading = readings[readings.length - 1] ?? null;

  useEffect(() => {
    requestPermissions().catch(() => undefined);
  }, []);

  useEffect(() => {
    const sosAlerts = alerts.filter(isSosVehicleAlert);
    const nextSosAlert = sosAlerts[0] ?? null;
    const sosKeys = sosAlerts
      .map((alert) => `${alert.id ?? 'no-id'}|${alert.last_updated ?? alert.timestamp ?? 'no-time'}`);
    setLatestSosAlert(nextSosAlert);

    if (!hasHydratedRef.current) {
      seenSosKeysRef.current = new Set(sosKeys);
      hasHydratedRef.current = true;
      return;
    }

    const newSosAlert = sosAlerts.find((alert) => {
      const key = `${alert.id ?? 'no-id'}|${alert.last_updated ?? alert.timestamp ?? 'no-time'}`;
      return !seenSosKeysRef.current.has(key);
    });

    seenSosKeysRef.current = new Set(sosKeys);

    if (newSosAlert) {
      setLatestSosAlert(newSosAlert);
      setVisible(true);
      sendImmediateNotification('SOS Alert', newSosAlert.message ?? 'New SOS alert received').catch(
        () => undefined
      );
    }
  }, [alerts]);

  return (
    <SosAlertModal
      visible={visible && Boolean(latestSosAlert)}
      onClose={() => setVisible(false)}
      alert={latestSosAlert}
      reading={latestRealtimeReading}
      deviceId={deviceStatus?.device_id ?? null}
    />
  );
}
