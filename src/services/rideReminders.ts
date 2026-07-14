import * as Notifications from 'expo-notifications';

/**
 * Schedule local push notification reminders before a ride.
 * Fires at 30 minutes and 5 minutes before departure.
 */
export async function scheduleRideReminder(
  tripId: string,
  departureTime: string,
  driverName: string,
  originLabel: string
): Promise<void> {
  const departure = new Date(departureTime).getTime();
  const now = Date.now();

  const reminders = [
    { minutes: 30, title: 'Ride in 30 Minutes ⏰', body: `Your ride with ${driverName} from ${originLabel.split(',')[0]} departs in 30 minutes!` },
    { minutes: 5, title: 'Almost Time! 🚗', body: `Your ride with ${driverName} departs in 5 minutes. Get ready!` },
  ];

  for (const reminder of reminders) {
    const triggerTime = departure - reminder.minutes * 60 * 1000;
    const secondsFromNow = Math.round((triggerTime - now) / 1000);

    if (secondsFromNow > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: 'default',
          data: { type: 'ride_reminder', tripId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
        },
        identifier: `reminder-${tripId}-${reminder.minutes}`,
      });
      console.log(`[Reminders] Scheduled ${reminder.minutes}min reminder for trip ${tripId} in ${secondsFromNow}s`);
    }
  }
}

/**
 * Cancel all scheduled reminders for a specific trip.
 */
export async function cancelRideReminder(tripId: string): Promise<void> {
  const identifiers = [
    `reminder-${tripId}-30`,
    `reminder-${tripId}-5`,
  ];

  for (const id of identifiers) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  console.log(`[Reminders] Cancelled reminders for trip ${tripId}`);
}
