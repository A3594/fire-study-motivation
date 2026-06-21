import { BarChart3, CalendarCheck, ClipboardList, Settings, Target } from 'lucide-react';
import type { TabKey } from '../types';

const tabs: { key: TabKey; label: string; Icon: typeof CalendarCheck }[] = [
  { key: 'today', label: '오늘', Icon: CalendarCheck },
  { key: 'plan', label: '계획', Icon: Target },
  { key: 'records', label: '기록', Icon: ClipboardList },
  { key: 'stats', label: '통계', Icon: BarChart3 },
  { key: 'settings', label: '설정', Icon: Settings },
];

interface BottomTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <nav className="bottom-tabs" aria-label="하단 메뉴">
      {tabs.map(({ key, label, Icon }) => (
        <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => onChange(key)}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
