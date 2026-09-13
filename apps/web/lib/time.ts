/**
 * Formats a timestamp into a human-friendly relative time string
 * (e.g. "just now", "2 min ago", "1 hr ago", "3 days ago").
 *
 * @param date - ISO timestamp string, Date instance, or millisecond timestamp
 * @param now - Optional reference timestamp (ms) for deterministic testing (defaults to Date.now())
 */
export function formatRelativeTime(
  date: string | Date | number,
  now: number = Date.now(),
): string {
  const then =
    typeof date === "number"
      ? date
      : date instanceof Date
        ? date.getTime()
        : new Date(date).getTime();

  if (Number.isNaN(then)) {
    return "";
  }

  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 45) {
    return "just now";
  }

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hr ago" : `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1 ? "1 mo ago" : `${diffMonths} mo ago`;
  }

  const diffYears = Math.round(diffDays / 365);
  return diffYears === 1 ? "1 yr ago" : `${diffYears} yr ago`;
}
