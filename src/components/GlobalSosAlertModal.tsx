import { requestPermissions, sendImmediateNotification } from '@/services/notificationService';
import {
  subscribeToVehicleAlerts,
  subscribeToVehicleReadings,
  subscribeToVehicleStatus,
  VehicleRealtimeAlert,
  VehicleRealtimeReading,
  VehicleRealtimeStatus,
} from '@/services/vehicleRealtimeService';
import React, { useEffect, useRef, useState } from 'react';
import SosAlertModal from './SosAlertModal';

function isSosAlert(alert: VehicleRealtimeAlert) {
  return String(alert.type ?? '').toLowerCase() === 'sos';
}

export default function GlobalSosAlertModal() {
  const [latestSosAlert, setLatestSosAlert] = useState<VehicleRealtimeAlert | null>(null);
  const [latestRealtimeReading, setLatestRealtimeReading] = useState<VehicleRealtimeReading | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<VehicleRealtimeStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const hasHydratedRef = useRef(false);
  const seenSosIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestPermissions().catch(() => undefined);

    const unsubscribeReadings = subscribeToVehicleReadings((readings) => {
      setLatestRealtimeReading(readings[readings.length - 1] ?? null);
    });

    const unsubscribeStatus = subscribeToVehicleStatus(setDeviceStatus);

    const unsubscribeAlerts = subscribeToVehicleAlerts((alerts) => {
      const sosAlerts = alerts.filter(isSosAlert);
      const nextSosAlert = sosAlerts[0] ?? null;
      setLatestSosAlert(nextSosAlert);

      if (!hasHydratedRef.current) {
        seenSosIdsRef.current = new Set(sosAlerts.map((alert) => alert.id).filter(Boolean) as string[]);
        hasHydratedRef.current = true;
        return;
      }

      const newSosAlert = sosAlerts.find((alert) => alert.id && !seenSosIdsRef.current.has(alert.id));

      seenSosIdsRef.current = new Set(sosAlerts.map((alert) => alert.id).filter(Boolean) as string[]);

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
      deviceId={deviceStatus?.device_id ?? null}
    />
  );
}
