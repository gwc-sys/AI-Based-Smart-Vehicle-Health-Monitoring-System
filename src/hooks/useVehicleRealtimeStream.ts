import { useEffect, useState } from 'react';
import {
  subscribeToVehicleAlerts,
  subscribeToVehicleReadings,
  subscribeToVehicleStatus,
  VehicleRealtimeAlert,
  VehicleRealtimeReading,
  VehicleRealtimeStatus,
} from '@/services/vehicleRealtimeService';

type UseVehicleRealtimeStreamOptions = {
  readingEmitIntervalMs?: number;
};

export function useVehicleRealtimeStream(options: UseVehicleRealtimeStreamOptions = {}) {
  const [readings, setReadings] = useState<VehicleRealtimeReading[]>([]);
  const [status, setStatus] = useState<VehicleRealtimeStatus | null>(null);
  const [alerts, setAlerts] = useState<VehicleRealtimeAlert[]>([]);
  const readingEmitIntervalMs = options.readingEmitIntervalMs ?? 3000;

  useEffect(() => {
    const unsubscribeReadings = subscribeToVehicleReadings(setReadings, {
      emitIntervalMs: readingEmitIntervalMs,
      emitImmediately: true,
    });
    const unsubscribeStatus = subscribeToVehicleStatus(setStatus);
    const unsubscribeAlerts = subscribeToVehicleAlerts(setAlerts);

    return () => {
      unsubscribeReadings();
      unsubscribeStatus();
      unsubscribeAlerts();
    };
  }, [readingEmitIntervalMs]);

  return {
    readings,
    status,
    alerts,
  };
}

export default useVehicleRealtimeStream;
