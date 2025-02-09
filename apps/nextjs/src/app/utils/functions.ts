/**
 * Calculates date as relative time.
 * @param {string} dateString - Date in string format which will be subtracted from current date
 * @example
 * // returns "5 minutes ago"
 * getRelativeTime('2025-02-09T16:17:44.698Z')
 * @returns {string}
 */
export const getRelativeTime = (dateString?: string): string => {
  if (!dateString) return "A moment ago";

  const now = new Date();
  const from = new Date(dateString);

  // Check for invalid date
  if (isNaN(from.getTime())) return "Invalid date";

  const diffInSeconds = Math.round(
    (now.getTime() - new Date(from.getTime() + 60 * 60 * 1000).getTime()) /
      1000,
  );
  const absDiffInSeconds = Math.abs(diffInSeconds);

  const units = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const unit of units) {
    const value = Math.floor(absDiffInSeconds / unit.seconds);
    if (value >= 1) {
      return `${value} ${unit.label}${value > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
};
