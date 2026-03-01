// simple analytics stub - replace with real implementation as needed
import { useCallback } from 'react';

export function useAnalytics() {
  const trackEvent = useCallback(async (eventName: string, params?: any) => {
    // no-op or console log for now
    console.log('Analytics event', eventName, params);
  }, []);

  return { trackEvent };
}

export default useAnalytics;