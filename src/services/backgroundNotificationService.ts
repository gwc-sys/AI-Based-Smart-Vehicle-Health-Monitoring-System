import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getEmergencyContacts } from './emergencyConfigService';
import { logEmergencyOutreach, sendEmergencyAlertsToAllGuardians } from './emergencyOutreachService';
import { getAlertCoordinates, getLatestSosAlert } from './vehicleRealtimeService';

const BACKGROUND_TASK_NAME = 'EMERGENCY_MONITOR_TASK';

/**
 * Initialize background notification handler
 */
export async function initializeBackgroundNotificationHandler() {
  // Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const { data } = notification.request.content;

      // Handle SOS emergency notifications in background
      if (data?.type === 'SOS_EMERGENCY') {
        await handleBackgroundSosEmergency(data);
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      }

      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // Listen for received notifications (background)
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    async (notification) => {
      console.log('[Background Notification Received]', notification);
      const { data } = notification.request.content;

      if (data?.type === 'SOS_EMERGENCY') {
        await handleBackgroundSosEmergency(data);
      }
    }
  );

  // Listen for notification responses (user tapped)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const { data } = response.notification.request.content;

      if (data?.type === 'SOS_EMERGENCY') {
        // Navigate to alerts or emergency details
        console.log('[Emergency Notification Response]', data);
      }
    }
  );

  return {
    received: receivedSubscription,
    response: responseSubscription,
  };
}

/**
 * Handle SOS emergency in background
 */
async function handleBackgroundSosEmergency(data: any) {
  try {
    console.log('[Background SOS Handler] Processing emergency alert');

    // Get latest SOS alert
    const sosAlert = await getLatestSosAlert(data.deviceId);
    if (!sosAlert) {
      console.log('[Background SOS Handler] No SOS alert found');
      return;
    }

    // Prefer Firebase SOS coordinates. Fall back to device GPS if missing.
    const alertCoordinates = getAlertCoordinates(sosAlert);
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
        });
        userLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch (locationError) {
        console.warn('[Background SOS Handler] Could not get location:', locationError);
      }
    }

    // Get emergency contacts
    const guardians = await getEmergencyContacts(data.userId);
    if (!guardians || guardians.length === 0) {
      console.log('[Background SOS Handler] No guardian contacts configured');
      return;
    }

    // Send alerts to all guardians
    const results = await sendEmergencyAlertsToAllGuardians(guardians, sosAlert, userLocation);

    // Log the outreach
    await logEmergencyOutreach(guardians, sosAlert, results);

    console.log('[Background SOS Handler] Alerts sent to guardians:', results);
  } catch (error) {
    console.error('[Background SOS Handler] Error:', error);
  }
}

/**
 * Register background fetch task for emergency monitoring
 */
export async function registerEmergencyBackgroundTask() {
  try {
    await TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
      try {
        console.log('[Background Task] Emergency monitoring task running');

        // Check if any active SOS alerts need attention
        // This could include checking local storage or Firebase for pending emergencies
        const hasActiveSos = await checkForActiveSosAlerts();

        if (hasActiveSos) {
          // Trigger local notification to re-alert user
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚨 Emergency Alert Still Active',
              body: 'Immediate assistance may be needed. Check app for details.',
              sound: 'default',
              data: { type: 'SOS_REMINDER' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
            },
          });
        }

        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('[Background Task] Error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[Background Task] Emergency monitoring task registered');
  } catch (error) {
    console.error('[Background Task] Registration failed:', error);
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterEmergencyBackgroundTask() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    console.log('[Background Task] Emergency monitoring task unregistered');
  } catch (error) {
    console.error('[Background Task] Unregistration failed:', error);
  }
}

/**
 * Check for active SOS alerts
 */
async function checkForActiveSosAlerts(): Promise<boolean> {
  // TODO: Implement logic to check if SOS alert is still active
  // This could query Firebase or check local storage
  return false;
}

/**
 * Send high-priority emergency notification
 */
export async function sendHighPriorityEmergencyNotification(
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { ...data, type: 'SOS_EMERGENCY' },
      },
      trigger: null, // Send immediately
    });

    console.log('[Emergency Notification] High-priority notification sent');
  } catch (error) {
    console.error('[Emergency Notification] Failed to send:', error);
  }
}
