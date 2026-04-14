export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return date.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) + (date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '');
  } else if (diffHour > 0) {
    return `${diffHour}h`;
  } else if (diffMin > 0) {
    return `${diffMin}m`;
  } else {
    return `${Math.max(0, diffSec)}s`;
  }
}