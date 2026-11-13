import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { buildNotificationPlan } from "./notificationPlan";

const CHANNEL_ID = "reminders";
const TEST_ID = 2000000000; // reminder alerts always use ids below 1,000,000,000
const MAX_REMINDER_ID = 1000000000;

// true only inside the Android app (false on the website)
export const isNativeApp = () => Capacitor.isNativePlatform();

// Asks for permission (Android 13+) and creates the notification channel.
// Returns true when notifications are allowed.
export async function setupNotifications() {
  if (!isNativeApp()) return false;

  try {
    let permission = await LocalNotifications.checkPermissions();

    if (permission.display !== "granted") {
      permission = await LocalNotifications.requestPermissions();
    }

    if (permission.display !== "granted") return false;

    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Reminders",
      description: "Bill, renewal and due-date alerts",
      importance: 4,
      visibility: 1,
    });

    return true;
  } catch (error) {
    console.error("Notification setup failed", error);
    return false;
  }
}

// Cancels the old alerts and schedules the right ones for the current reminders.
// Call this whenever the reminders change (add, edit, delete, tick).
export async function syncNotifications(tasks) {
  if (!isNativeApp()) return;

  try {
    const { notifications: pending } = await LocalNotifications.getPending();

    const old = pending
      .filter((n) => n.id < MAX_REMINDER_ID)
      .map((n) => ({ id: n.id }));

    if (old.length > 0) {
      await LocalNotifications.cancel({ notifications: old });
    }

    const plan = buildNotificationPlan(tasks);

    if (plan.length > 0) {
      await LocalNotifications.schedule({
        notifications: plan.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          channelId: CHANNEL_ID,
          schedule: { at: item.at, allowWhileIdle: true },
        })),
      });
    }
  } catch (error) {
    console.error("Could not schedule notifications", error);
  }
}

// A notification that appears 10 seconds from now, to check everything works.
export async function sendTestNotification() {
  if (!isNativeApp()) return false;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_ID,
          title: "LifeSet",
          body: "Notifications are working",
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("Test notification failed", error);
    return false;
  }
}