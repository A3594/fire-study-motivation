import { useEffect, useState } from 'react';
import { APP_BUILD_ID, APP_VERSION, VERSION_SEEN_STORAGE_KEY, formatBuildTime } from '../constants/appVersion';

export function VersionBadge() {
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    try {
      const seenBuildId = localStorage.getItem(VERSION_SEEN_STORAGE_KEY);
      setUpdated(seenBuildId !== APP_BUILD_ID);
      localStorage.setItem(VERSION_SEEN_STORAGE_KEY, APP_BUILD_ID);
    } catch {
      setUpdated(false);
    }
  }, []);

  return (
    <button
      className={`version-badge ${updated ? 'updated' : ''}`}
      onClick={() => setUpdated(false)}
      title="앱을 열 때 새 배포를 자동으로 확인합니다."
    >
      <span>{updated ? '업데이트됨' : '최신'}</span>
      <strong>v{APP_VERSION}</strong>
      <small>{formatBuildTime()}</small>
    </button>
  );
}
