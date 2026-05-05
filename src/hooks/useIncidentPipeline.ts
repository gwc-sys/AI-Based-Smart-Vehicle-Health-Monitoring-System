import { useEffect, useMemo, useState } from 'react';
import useNetworkStatus from '@/hooks/useNetworkStatus';
import {
  IncidentPipelineStatus,
  deriveIncidents,
  incidentPipelineService,
} from '@/services/incidentPipelineService';
import { VehicleRealtimeAlert, VehicleRealtimeReading } from '@/services/vehicleRealtimeService';

type UseIncidentPipelineParams = {
  readings: VehicleRealtimeReading[];
  alerts: VehicleRealtimeAlert[];
};

const FLUSH_INTERVAL_MS = 15000;

export function useIncidentPipeline({ readings, alerts }: UseIncidentPipelineParams) {
  const { isConnected } = useNetworkStatus();
  const [status, setStatus] = useState<IncidentPipelineStatus>({ queueDepth: 0 });
  const incidents = useMemo(() => deriveIncidents(readings, alerts), [alerts, readings]);

  useEffect(() => {
    let active = true;

    (async () => {
      const currentStatus = await incidentPipelineService.getStatus();
      if (active) {
        setStatus(currentStatus);
      }
    })().catch((error) => {
      console.warn('[IncidentPipeline] Failed to load status', error);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      for (const incident of incidents) {
        await incidentPipelineService.recordIncident(incident);
      }

      if (isConnected) {
        await incidentPipelineService.flushQueue();
      }

      const nextStatus = await incidentPipelineService.getStatus();
      if (active) {
        setStatus(nextStatus);
      }
    })().catch((error) => {
      console.warn('[IncidentPipeline] Failed to process incidents', error);
    });

    return () => {
      active = false;
    };
  }, [incidents, isConnected]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    let active = true;
    const timer = setInterval(() => {
      incidentPipelineService
        .flushQueue()
        .then(() => incidentPipelineService.getStatus())
        .then((nextStatus) => {
          if (active) {
            setStatus(nextStatus);
          }
        })
        .catch((error) => {
          console.warn('[IncidentPipeline] Periodic flush failed', error);
        });
    }, FLUSH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isConnected]);

  return {
    incidents,
    pipelineStatus: status,
  };
}

export default useIncidentPipeline;
