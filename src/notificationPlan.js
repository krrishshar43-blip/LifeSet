import { formatAmount } from "./dateUtils";

// Alerts are shown at 9:00 AM local time.
export const NOTIFY_HOUR = 9;

// Android notification ids must fit in a 32-bit integer, so we cannot use
// Date.now() style task ids directly. Each task gets 3 slots (7d, 1d, due date).
const SLOT = { 7: 0, 1: 1, 0: 2 };

export const notificationId = (taskId, days) =>
  (Number(taskId) % 100000000) * 3 + (SLOT[days] ?? 0);

const bodyFor = (task, days) => {
  const when =
    days === 0
      ? "is due today"
      : days === 1
      ? "is due tomorrow"
      : `is due in ${days} days`;
  const amount =
    task.amount !== null && task.amount !== undefined
      ? ` (${formatAmount(task.amount)})`
      : "";
  return `${task.title}${amount} ${when}`;
};

// Pure function: decides WHICH notifications should exist right now.
// Pending reminders only. Alerts whose time has already passed are skipped.
export const buildNotificationPlan = (tasks, now = new Date()) => {
  const plan = [];

  for (const task of tasks) {
    if (task.done) continue;

    for (const days of task.remindBefore || []) {
      const [y, m, d] = task.date.split("-").map(Number);
      const at = new Date(y, m - 1, d - days, NOTIFY_HOUR, 0, 0);

      if (at.getTime() <= now.getTime()) continue;

      plan.push({
        id: notificationId(task.id, days),
        title: "LifeSet",
        body: bodyFor(task, days),
        at,
      });
    }
  }

  return plan;
};