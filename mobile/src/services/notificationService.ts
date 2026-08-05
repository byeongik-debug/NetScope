import * as Haptics from 'expo-haptics';
import {NetworkEvent} from '../types';

/**
 * Notification boundary for incident delivery.
 * Replace `sendPush` with expo-notifications registration and a backend token
 * endpoint when production push credentials are available.
 */
export const notificationService = {
  async notifyIncident(event: NetworkEvent) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await this.sendPush(event);
  },
  async sendPush(_event: NetworkEvent) {
    // Intentionally no-op until APNs/FCM credentials and user consent exist.
  }
};
