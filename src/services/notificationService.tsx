import * as Notifications from 'expo-notifications';

export async function requestPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    const resp = await Notifications.requestPermissionsAsync();
    return resp.granted;
  }
  return true;
}

export async function scheduleLocalNotification(title: string, body: string, seconds = 1) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}

export async function sendImmediateNotification(title: string, body: string) {
  // the TS definitions don't list this method but it exists at runtime
  await (Notifications as any).presentNotificationAsync({ title, body });
}

export default {
  requestPermissions,
  scheduleLocalNotification,
  sendImmediateNotification,
};
