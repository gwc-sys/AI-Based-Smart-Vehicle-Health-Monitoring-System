import { EmergencyContact, getEmergencyContacts } from '@/services/emergencyConfigService';
import {
    logEmergencyOutreach,
    sendEmergencyAlertsToAllGuardians
} from '@/services/emergencyOutreachService';
import { getAlertCoordinates, VehicleRealtimeAlert } from '@/services/vehicleRealtimeService';
import * as Location from 'expo-location';
import { useState } from 'react';

type GuardianAlertStatus = 'idle' | 'sending' | 'completed' | 'error';

export interface GuardianOutreachResult {
  whatsapp: number;
  sms: number;
  total: number;
}

export function useEmergencyGuardianOutreach() {
  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [status, setStatus] = useState<GuardianAlertStatus>('idle');
  const [result, setResult] = useState<GuardianOutreachResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load emergency contacts
   */
  const loadGuardians = async (userId: string) => {
    try {
      const contacts = await getEmergencyContacts(userId);
      setGuardians(contacts || []);
    } catch (err) {
      console.error('[Emergency Outreach] Error loading guardians:', err);
      setError('Failed to load emergency contacts');
    }
  };

  /**
   * Send alerts to all guardians
   */
  const sendAlertsToAllGuardians = async (
    alert: VehicleRealtimeAlert | null,
    userId: string
  ) => {
    if (!alert) {
      setError('No alert to send');
      return;
    }

    if (guardians.length === 0) {
      setError('No emergency contacts configured');
      return;
    }

    setStatus('sending');
    setError(null);

    try {
      // Prefer Firebase SOS coordinates. Fall back to device GPS if missing.
      const alertCoordinates = getAlertCoordinates(alert);
      let userLocation = alertCoordinates
        ? {
            latitude: alertCoordinates.latitude,
            longitude: alertCoordinates.longitude,
          }
        : undefined;

      if (!userLocation) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeout: 5000,
          });
          userLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        } catch (locationError) {
          console.warn('[Emergency Outreach] Could not get location:', locationError);
          // Continue without location
        }
      }

      // Send alerts to all guardians
      const outreachResult = await sendEmergencyAlertsToAllGuardians(guardians, alert, userLocation);

      // Log the outreach
      await logEmergencyOutreach(guardians, alert, outreachResult);

      setResult(outreachResult);
      setStatus('completed');

      console.log('[Emergency Outreach] Alerts sent:', outreachResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Emergency Outreach] Error:', err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  /**
   * Reset status
   */
  const reset = () => {
    setStatus('idle');
    setError(null);
    setResult(null);
  };

  return {
    guardians,
    status,
    result,
    error,
    loadGuardians,
    sendAlertsToAllGuardians,
    reset,
  };
}
