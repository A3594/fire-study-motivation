import { BottomTabs } from './components/BottomTabs';
import { Onboarding } from './components/Onboarding';
import { useStudyApp } from './hooks/useStudyApp';
import { PlanPage } from './pages/PlanPage';
import { RecordsPage } from './pages/RecordsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { TodayPage } from './pages/TodayPage';

export function App() {
  const app = useStudyApp();

  if (!app.initialized || !app.settings || !app.plan) {
    return <Onboarding onComplete={app.completeOnboarding} />;
  }

  return (
    <div className="app-shell">
      {app.activeTab === 'today' ? (
        <TodayPage
          settings={app.settings}
          plan={app.plan}
          today={app.today}
          todayMode={app.todayMode}
          todayRecord={app.todayRecord}
          records={app.records}
          tasks={app.todayTasks}
          onTaskChange={app.updateTodayTask}
          onCoreCheckChange={app.updateCoreCheck}
          onAddTask={app.addTodayTask}
          onDeleteTask={app.deleteTodayTask}
          onSave={app.saveTodayRecord}
        />
      ) : null}

      {app.activeTab === 'plan' ? (
        <PlanPage
          plan={app.plan}
          settings={app.settings}
          records={app.records}
          onLower={app.lowerWeekGoal}
          onKeep={app.keepWeekGoal}
          onRaise={app.raiseNextWeekGoal}
          onHard={app.setHardMode}
          onEase={app.setEaseMode}
          onRegenerate={app.regeneratePlan}
        />
      ) : null}

      {app.activeTab === 'records' ? (
        <RecordsPage records={app.records} plan={app.plan} onUpdateRecord={app.updateRecord} onDeleteRecord={app.deleteRecord} />
      ) : null}

      {app.activeTab === 'stats' ? <StatsPage records={app.records} plan={app.plan} settings={app.settings} /> : null}

      {app.activeTab === 'settings' ? (
        <SettingsPage
          settings={app.settings}
          onSave={app.updateSettings}
          onExport={app.exportData}
          onImport={app.importData}
          onReset={app.resetAll}
        />
      ) : null}

      <BottomTabs activeTab={app.activeTab} onChange={app.setActiveTab} />
    </div>
  );
}
