export const APP_VERSION = __APP_VERSION__;
export const APP_BUILD_TIME = __APP_BUILD_TIME__;
export const APP_BUILD_ID = `${APP_VERSION}:${APP_BUILD_TIME}`;
export const VERSION_SEEN_STORAGE_KEY = 'fire-study-motivation:seenBuildId';

export function formatBuildTime(): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(APP_BUILD_TIME));
  } catch {
    return APP_BUILD_TIME.slice(0, 16).replace('T', ' ');
  }
}
