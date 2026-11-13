import { describe, it, expect } from "vitest";
import { buildNotificationPlan, notificationId } from "./notificationPlan";

const task = (over = {}) => ({
  id: 1,
  title: "Netflix",
  date: "2026-12-15",
  done: false,
  amount: null,
  remindBefore: [7, 1, 0],
  ...over,
});

const NOW = new Date(2026, 10, 12, 10, 0, 0); // 12 Nov 2026, 10:00

describe("buildNotificationPlan: timing", () => {
  it("creates 3 alerts at 9 AM: 7 days before, 1 day before, on the day", () => {
    const plan = buildNotificationPlan([task()], NOW);
    expect(plan.length).toBe(3);
    expect(plan[0].at.getTime()).toBe(new Date(2026, 11, 8, 9, 0, 0).getTime());
    expect(plan[1].at.getTime()).toBe(new Date(2026, 11, 14, 9, 0, 0).getTime());
    expect(plan[2].at.getTime()).toBe(new Date(2026, 11, 15, 9, 0, 0).getTime());
  });

  it("only creates the alerts the user ticked", () => {
    const plan = buildNotificationPlan([task({ remindBefore: [1] })], NOW);
    expect(plan.length).toBe(1);
    expect(plan[0].at.getTime()).toBe(new Date(2026, 11, 14, 9, 0, 0).getTime());
  });

  it("creates nothing when no alert option is ticked", () => {
    expect(buildNotificationPlan([task({ remindBefore: [] })], NOW).length).toBe(0);
  });

  it("handles a missing remindBefore field (old saved data)", () => {
    expect(buildNotificationPlan([task({ remindBefore: undefined })], NOW).length).toBe(0);
  });

  it("7 days before crosses a month end correctly", () => {
    const plan = buildNotificationPlan([task({ date: "2026-12-03", remindBefore: [7] })], NOW);
    expect(plan[0].at.getTime()).toBe(new Date(2026, 10, 26, 9, 0, 0).getTime());
  });

  it("7 days before crosses a year end correctly", () => {
    const plan = buildNotificationPlan([task({ date: "2027-01-03", remindBefore: [7] })], NOW);
    expect(plan[0].at.getTime()).toBe(new Date(2026, 11, 27, 9, 0, 0).getTime());
  });
});

describe("buildNotificationPlan: skipping", () => {
  it("skips alerts whose time has already passed", () => {
    // Due tomorrow: the 7-day and 1-day alerts are in the past or now, only 'due date' remains
    const plan = buildNotificationPlan([task({ date: "2026-11-13" })], NOW);
    expect(plan.length).toBe(1);
    expect(plan[0].at.getTime()).toBe(new Date(2026, 10, 13, 9, 0, 0).getTime());
  });

  it("a reminder due today after 9 AM gets no alert", () => {
    expect(buildNotificationPlan([task({ date: "2026-11-12" })], NOW).length).toBe(0);
  });

  it("a reminder due today before 9 AM still gets the due-date alert", () => {
    const early = new Date(2026, 10, 12, 8, 0, 0);
    expect(buildNotificationPlan([task({ date: "2026-11-12" })], early).length).toBe(1);
  });

  it("an overdue reminder gets no alert", () => {
    expect(buildNotificationPlan([task({ date: "2026-10-01" })], NOW).length).toBe(0);
  });

  it("a completed reminder gets no alert", () => {
    expect(buildNotificationPlan([task({ done: true })], NOW).length).toBe(0);
  });
});

describe("buildNotificationPlan: text", () => {
  it("says 'due in 7 days', 'due tomorrow' and 'due today'", () => {
    const plan = buildNotificationPlan([task()], NOW);
    expect(plan[0].body).toBe("Netflix is due in 7 days");
    expect(plan[1].body).toBe("Netflix is due tomorrow");
    expect(plan[2].body).toBe("Netflix is due today");
  });

  it("includes the amount when there is one", () => {
    const plan = buildNotificationPlan([task({ amount: 649, remindBefore: [0] })], NOW);
    expect(plan[0].body).toBe("Netflix (₹649) is due today");
  });
});

describe("notificationId", () => {
  it("is different for every alert of a task", () => {
    const ids = [7, 1, 0].map((d) => notificationId(5, d));
    expect(new Set(ids).size).toBe(3);
  });

  it("is different for different tasks", () => {
    expect(notificationId(1, 0) === notificationId(2, 0)).toBe(false);
  });

  it("fits in a 32-bit Android integer even for Date.now() style task ids", () => {
    const id = notificationId(1794471842995, 7);
    expect(id < 2147483647 && id >= 0).toBe(true);
  });

  it("stays below 1,000,000,000 (ids above are kept for test notifications)", () => {
    expect(notificationId(99999999, 0) < 1000000000).toBe(true);
  });

  it("every alert of a task keeps the same id each time (so it can be cancelled)", () => {
    expect(notificationId(1794471842995, 1)).toBe(notificationId(1794471842995, 1));
  });
});