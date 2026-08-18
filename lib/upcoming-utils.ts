/**
 * Automatic 14-day Upcoming Utilities
 *
 * A notice is 'Upcoming' when its date falls between today and 14 days into the future (inclusive).
 * Days remaining is calculated dynamically on demand and is NEVER persisted in database or JSON.
 */

export interface UpcomingInfo {
  isUpcoming: boolean;
  daysRemaining: number | null;
  label: "Today" | "Tomorrow" | string | null;
}

/**
 * Normalizes a date or date string to midnight local time for precise calendar day comparisons.
 */
function toMidnightLocalDate(dateInput: Date | string): Date {
  const date = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Computes upcoming status for a given notice date string against a reference date (defaults to today).
 *
 * Examples (assuming today is 2026-08-16):
 * - 2026-08-16 (0 days)  => Upcoming, label: "Today"
 * - 2026-08-17 (1 day)   => Upcoming, label: "Tomorrow"
 * - 2026-08-19 (3 days)  => Upcoming, label: "In 3 days"
 * - 2026-08-30 (14 days) => Upcoming, label: "In 14 days"
 * - 2026-08-31 (15 days) => Not Upcoming, label: null
 * - 2026-08-15 (-1 day)  => Not Upcoming, label: null
 */
export function getUpcomingInfo(dateStr: string, referenceDate: Date = new Date()): UpcomingInfo {
  const noticeMidnight = toMidnightLocalDate(dateStr);
  const refMidnight = toMidnightLocalDate(referenceDate);

  if (Number.isNaN(noticeMidnight.getTime()) || Number.isNaN(refMidnight.getTime())) {
    return { isUpcoming: false, daysRemaining: null, label: null };
  }

  const diffMs = noticeMidnight.getTime() - refMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays <= 14) {
    let label: string;
    if (diffDays === 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Tomorrow";
    } else {
      label = `In ${diffDays} days`;
    }
    return {
      isUpcoming: true,
      daysRemaining: diffDays,
      label
    };
  }

  return {
    isUpcoming: false,
    daysRemaining: diffDays >= 0 ? diffDays : null,
    label: null
  };
}
