/* ---------- Date and formatting helpers (all use LOCAL time, not UTC) ---------- */

export const pad = (n) => String(n).padStart(2, "0");

export const toISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "now" can be passed in so the function can be tested with a fixed time.
export const getToday = (now = new Date()) => toISO(now);

export const parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (iso) =>
  parseISO(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const daysLeft = (iso, today) =>
  Math.round((parseISO(iso) - parseISO(today)) / 86400000);

// Next due date for a repeating reminder.
// anchorDay = the original day of month (e.g. 31), so 31 Jan -> 28 Feb -> 31 Mar.
export const nextDate = (iso, repeat, anchorDay) => {
  const [y, m, d] = iso.split("-").map(Number);
  const day = anchorDay || d;

  if (repeat === "Daily") return toISO(new Date(y, m - 1, d + 1));
  if (repeat === "Weekly") return toISO(new Date(y, m - 1, d + 7));

  if (repeat === "Monthly") {
    const lastDayNextMonth = new Date(y, m + 1, 0).getDate();
    return toISO(new Date(y, m, Math.min(day, lastDayNextMonth)));
  }

  if (repeat === "Yearly") {
    const lastDayNextYear = new Date(y + 1, m, 0).getDate();
    return toISO(new Date(y + 1, m - 1, Math.min(day, lastDayNextYear)));
  }

  return iso;
};

export const formatAmount = (amount) => {
  const n = Number(amount);
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export const remindLabel = (days) =>
  days.map((d) => (d === 0 ? "due date" : `${d}d before`)).join(", ");