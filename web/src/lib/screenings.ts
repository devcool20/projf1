export function formatScreeningDateLabel(iso: string) {
  const date = new Date(iso);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).format(date);
  const day = new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" }).format(date);
  const month = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(date);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(date);
  return `${weekday} ${day} ${month} // ${time}`;
}
