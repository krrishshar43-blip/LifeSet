import { describe, it, expect } from "vitest";
import {
  toISO,
  getToday,
  formatDate,
  daysLeft,
  nextDate,
  formatAmount,
  remindLabel,
} from "./dateUtils";

describe("toISO", () => {
  it("formats a date as YYYY-MM-DD with zero padding", () => {
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getToday (TC-043: local date, not UTC)", () => {
  it("returns the local date just after midnight", () => {
    // 00:30 local time. The old UTC-based code returned the previous day in IST.
    expect(getToday(new Date(2026, 10, 10, 0, 30))).toBe("2026-11-10");
  });

  it("returns the local date just before midnight", () => {
    expect(getToday(new Date(2026, 10, 10, 23, 59))).toBe("2026-11-10");
  });
});

describe("formatDate", () => {
  it("shows day, short month and year", () => {
    expect(formatDate("2026-11-07")).toBe("07 Nov 2026");
  });
});

describe("daysLeft", () => {
  it("is 0 on the due date", () => {
    expect(daysLeft("2026-11-10", "2026-11-10")).toBe(0);
  });

  it("is positive for a future date", () => {
    expect(daysLeft("2026-11-13", "2026-11-10")).toBe(3);
  });

  it("is negative for a past date", () => {
    expect(daysLeft("2026-11-09", "2026-11-10")).toBe(-1);
  });

  it("works across a month end", () => {
    expect(daysLeft("2026-12-01", "2026-11-30")).toBe(1);
  });

  it("works across a leap day", () => {
    expect(daysLeft("2028-03-01", "2028-02-28")).toBe(2);
  });
});

describe("nextDate: Daily and Weekly", () => {
  it("Daily adds one day", () => {
    expect(nextDate("2026-12-10", "Daily", 10)).toBe("2026-12-11");
  });

  it("Daily rolls over a month end", () => {
    expect(nextDate("2026-12-31", "Daily", 31)).toBe("2027-01-01");
  });

  it("Weekly adds seven days", () => {
    expect(nextDate("2026-12-10", "Weekly", 10)).toBe("2026-12-17");
  });

  it("Weekly rolls over a year end", () => {
    expect(nextDate("2026-12-28", "Weekly", 28)).toBe("2027-01-04");
  });
});

describe("nextDate: Monthly", () => {
  it("keeps the same day in a normal month", () => {
    expect(nextDate("2027-01-15", "Monthly", 15)).toBe("2027-02-15");
  });

  it("rolls over the year end", () => {
    expect(nextDate("2026-12-15", "Monthly", 15)).toBe("2027-01-15");
  });

  it("31 Jan goes to 28 Feb in a normal year", () => {
    expect(nextDate("2027-01-31", "Monthly", 31)).toBe("2027-02-28");
  });

  it("31 Jan goes to 29 Feb in a leap year", () => {
    expect(nextDate("2028-01-31", "Monthly", 31)).toBe("2028-02-29");
  });

  it("returns to the 31st after a short month (regression of BUG-001)", () => {
    expect(nextDate("2027-02-28", "Monthly", 31)).toBe("2027-03-31");
  });

  it("full chain from 31 Jan: 28 Feb, 31 Mar, 30 Apr, 31 May", () => {
    let date = "2027-01-31";
    const chain = [];
    for (let i = 0; i < 4; i++) {
      date = nextDate(date, "Monthly", 31);
      chain.push(date);
    }
    expect(chain).toEqual(["2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]);
  });

  it("falls back to the day of the given date when anchorDay is missing", () => {
    expect(nextDate("2027-01-15", "Monthly", undefined)).toBe("2027-02-15");
  });
});

describe("nextDate: Yearly", () => {
  it("keeps the same day and month", () => {
    expect(nextDate("2026-11-07", "Yearly", 7)).toBe("2027-11-07");
  });

  it("29 Feb goes to 28 Feb in a non-leap year", () => {
    expect(nextDate("2028-02-29", "Yearly", 29)).toBe("2029-02-28");
  });

  it("29 Feb comes back after four years", () => {
    expect(nextDate("2031-02-28", "Yearly", 29)).toBe("2032-02-29");
  });
});

describe("nextDate: no repeat", () => {
  it("returns the same date", () => {
    expect(nextDate("2026-11-07", "None", 7)).toBe("2026-11-07");
  });
});

describe("formatAmount", () => {
  it("whole numbers have no decimals", () => {
    expect(formatAmount(649)).toBe("₹649");
  });

  it("decimals always show two places (BUG-002)", () => {
    expect(formatAmount(99.5)).toBe("₹99.50");
  });

  it("uses Indian digit grouping", () => {
    expect(formatAmount(1234567)).toBe("₹12,34,567");
  });

  it("zero is shown as ₹0", () => {
    expect(formatAmount(0)).toBe("₹0");
  });

  it("accepts a numeric string", () => {
    expect(formatAmount("250")).toBe("₹250");
  });
});

describe("remindLabel", () => {
  it("lists all alert options", () => {
    expect(remindLabel([7, 1, 0])).toBe("7d before, 1d before, due date");
  });

  it("handles a single option", () => {
    expect(remindLabel([0])).toBe("due date");
  });

  it("returns an empty string for no options", () => {
    expect(remindLabel([])).toBe("");
  });
});