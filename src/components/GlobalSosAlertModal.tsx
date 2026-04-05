import { requestPermissions, sendImmediateNotification } from '@/services/notificationService';
import {
  isSosVehicleAlert,
  subscribeToVehicleAlerts,
  subscribeToVehicleReadings,
  subscribeToVehicleStatus,
  VehicleRealtimeAlert,
  VehicleRealtimeReading,
  VehicleRealtimeStatus,
} from '@/services/vehicleRealtimeService';
import React, { useEffect, useRef, useState } from 'react';
import SosAlertModal from './SosAlertModal';

export default function GlobalSosAlertModal() {
  const [latestSosAlert, setLatestSosAlert] = useState<VehicleRealtimeAlert | null>(null);
  const [latestRealtimeReading, setLatestRealtimeReading] = useState<VehicleRealtimeReading | null>(null);
  const [lastLocationReading, setLastLocationReading] = useState<VehicleRealtimeReading | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<VehicleRealtimeStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const hasHydratedRef = useRef(false);
  const seenSosKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestPermissions().catch(() => undefined);

    const unsubscribeReadings = subscribeToVehicleReadings((readings) => {
      const nextLatestReading = readings[readings.length - 1] ?? null;
      const nextLocationReading =
        [...readings]
          .reverse()
          .find(
            (reading) =>
              typeof reading.gps_lat === 'number' &&
              Number.isFinite(reading.gps_lat) &&
              typeof reading.gps_lon === 'number' &&
              Number.isFinite(reading.gps_lon)
          ) ?? null;

      setLatestRealtimeReading(nextLatestReading);
      if (nextLocationReading) {
        setLastLocationReading(nextLocationReading);
      }
    });

    const unsubscribeStatus = subscribeToVehicleStatus(setDeviceStatus);

    const unsubscribeAlerts = subscribeToVehicleAlerts((alerts) => {
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
    });

    return () => {
      unsubscribeReadings();
      unsubscribeStatus();
      unsubscribeAlerts();
    };
  }, []);

  return (
    <SosAlertModal
      visible={visible && Boolean(latestSosAlert)}
      onClose={() => setVisible(false)}
      alert={latestSosAlert}
      reading={latestRealtimeReading}
      fallbackLocationReading={lastLocationReading}
      deviceId={deviceStatus?.device_id ?? null}
    />
  );
}
