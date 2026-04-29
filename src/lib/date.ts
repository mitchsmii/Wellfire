function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getWeekDates(offset: number): Date[] {
  const today = new Date();
  const dow = today.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i + offset * 7);
    return d;
  });
}

export function getNextDays(count: number, startOffset = 1): Date[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + startOffset + i);
    return d;
  });
}

export function weekOffsetForDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const targetSunday = new Date(target);
  targetSunday.setDate(target.getDate() - target.getDay());
  const todaySunday = new Date(today);
  todaySunday.setDate(today.getDate() - today.getDay());
  const diffMs = targetSunday.getTime() - todaySunday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}
