import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Call after login and explicit opt-in. The caller persists the returned token
 * through its authenticated backend; obtaining a token alone enables no campaigns. */
export async function obtainPushToken(): Promise<string> {
  if (Platform.OS === 'web') throw new Error('Push registration requires the Android or iOS app.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('An EAS project and push credentials must be configured first.');
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('festivals', {
      name: 'Festival preparation reminders', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are not permitted on this device.');
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
