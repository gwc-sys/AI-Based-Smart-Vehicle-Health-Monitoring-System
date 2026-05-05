import { useEffect, useState } from 'react';
import { HospitalAiRecommendation } from '@/services/vehicleRealtimeService';
import { subscribeToHospitalRecommendation } from '@/services/hospitalRecommendationService';

export function useHospitalRecommendation(deviceId?: string | null) {
  const [recommendation, setRecommendation] = useState<HospitalAiRecommendation | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToHospitalRecommendation(setRecommendation, deviceId);
    return unsubscribe;
  }, [deviceId]);

  return recommendation;
}

export default useHospitalRecommendation;
