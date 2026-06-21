const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDayOfWeek(dateKey: string): string {
  return DAY_LABELS[parseDateKey(dateKey).getDay()];
}

export function isWeekend(dateKey: string): boolean {
  const day = parseDateKey(dateKey).getDay();
  return day === 0 || day === 6;
}

export function getDday(targetDate: string, fromDate = toDateKey()): number {
  const target = parseDateKey(targetDate).getTime();
  const from = parseDateKey(fromDate).getTime();
  return Math.ceil((target - from) / 86400000);
}

export function formatKoreanDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  return `${year}.${Number(month)}.${Number(day)} (${getDayOfWeek(dateKey)})`;
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(fromDateKey: string, toDateKeyValue: string): number {
  const from = parseDateKey(fromDateKey).getTime();
  const to = parseDateKey(toDateKeyValue).getTime();
  return Math.max(0, Math.floor((to - from) / 86400000));
}

export function nowIso(): string {
  return new Date().toISOString();
}
