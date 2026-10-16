import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import ApplicationDetail from "./features/applications/ApplicationDetailPage";
import Applications from "./features/applications/ApplicationsPage";
import Home from "./pages/Home";
import InterviewWorkspace from "./features/interviews/InterviewWorkspacePage";
import Interviews from "./features/interviews/InterviewsPage";
import JobDetail from "./features/jobs/JobDetailPage";
import Jobs from "./features/jobs/JobsPage";
import Status from "./pages/Status";
import Tasks from "./pages/Tasks";
import TaskDetailPage from "./pages/TaskDetailPage";
import LifetimePage from "./features/progress/LifetimePage";
import PastWorkPage from "./features/progress/PastWorkPage";
import ProgressIndexRedirect from "./features/progress/ProgressIndexRedirect";
import ProgressLayout from "./features/progress/ProgressLayout";
import ThisWeekPage from "./features/progress/ThisWeekPage";
import BannerPage from "./features/rewards/BannerPage";
import CollectionPage from "./features/rewards/CollectionPage";
import EarningsPage from "./features/rewards/EarningsPage";
import PullHistoryPage from "./features/rewards/PullHistoryPage";
import RewardsLayout from "./features/rewards/RewardsLayout";
import RulesPage from "./features/rewards/RulesPage";
import ThemeEmoji from "./ThemeEmoji";
import { DemoModeProvider, useDemoMode } from "./demoMode";
import { AchievementUnlockProvider } from "./features/achievements/AchievementUnlockHost";
import { HEADER_BRAND_EMOJI } from "./pageTheme";
import { ChromeTabLink } from "./ui";

/** Dev-only prototype pages — dead-code eliminated from production builds. */
const proto = import.meta.env.DEV
  ? {
      M1Hub: lazy(() => import("./prototype/m1/M1PrototypeHub")),
      MiscTask: lazy(() => import("./prototype/m1/MiscTaskPrototypePage")),
      AppTask: lazy(() => import("./prototype/m1/AppTaskPrototypePage")),
      Application: lazy(() => import("./prototype/m1/ApplicationPrototypePage")),
      M2Hub: lazy(() => import("./prototype/m2/M2PrototypeHub")),
      DetailReflections: lazy(() => import("./prototype/m2/DetailReflectionsPrototypePage")),
      ProgressCompose: lazy(() => import("./prototype/m2/ProgressComposePrototypePage")),
      StripLink: lazy(() => import("./prototype/m2/StripLinkPrototypePage")),
      M4Hub: lazy(() => import("./prototype/m4/M4PrototypeHub")),
      LedgerCompletions: lazy(() => import("./prototype/m4/LedgerCompletionsPrototypePage")),
      LedgerPoints: lazy(() => import("./prototype/m4/LedgerPointsPrototypePage")),
      ReflectionMinutes: lazy(() => import("./prototype/m4/ReflectionMinutesPrototypePage")),
      F08WeeklyHub: lazy(() => import("./prototype/f08-weekly/F08WeeklyHub")),
      F08LcStepper: lazy(() => import("./prototype/f08-weekly/LcStepperPrototypePage")),
      F08ProgressWeekly: lazy(() => import("./prototype/f08-weekly/ProgressWeeklyPrototypePage")),
      F08HomeTargets: lazy(() => import("./prototype/f08-weekly/HomeTargetsPrototypePage")),
      F08Congrats: lazy(() => import("./prototype/f08-weekly/CongratsBannerPrototypePage")),
      F08WeeklyRecord: lazy(() => import("./prototype/f08-weekly/WeeklyRecordPrototypePage")),
      F08VisualDirection: lazy(() => import("./prototype/f08-weekly/VisualDirectionPrototypePage")),
      F08StreaksHub: lazy(() => import("./prototype/f08-streaks/F08StreaksHub")),
      F08WeeklyStreak: lazy(() => import("./prototype/f08-streaks/WeeklyStreakPrototypePage")),
      F08TodayStripStreak: lazy(() => import("./prototype/f08-streaks/TodayStripStreakPrototypePage")),
      F08Achievements: lazy(() => import("./prototype/f08-streaks/AchievementsPrototypePage")),
      F08Flourish: lazy(() => import("./prototype/f08-streaks/FlourishPrototypePage")),
      F08ProgressHub: lazy(() => import("./prototype/f08-progress/F08ProgressHub")),
      F08ProgressThisWeek: lazy(() => import("./prototype/f08-progress/ThisWeekPrototypePage")),
      F08ProgressPastWork: lazy(() => import("./prototype/f08-progress/PastWorkPrototypePage")),
      F08ProgressLifetime: lazy(() => import("./prototype/f08-progress/LifetimePrototypePage")),
      F09Lab: lazy(() => import("./prototype/f09-design-system/F09LabPage")),
      F09Refinements: lazy(
        () => import("./prototype/f09-design-system/RefinementsPage"),
      ),
      F09Nesting: lazy(
        () => import("./prototype/f09-design-system/NestingPage"),
      ),
      F09Layout: lazy(
        () => import("./prototype/f09-design-system/LayoutPage"),
      ),
      F09Patterns: lazy(
        () => import("./prototype/f09-design-system/PatternsPage"),
      ),
      F11HabitsHub: lazy(
        () => import("./prototype/f11-habits-and-weekly-targets/F11HabitsHub"),
      ),
      F11HabitsStrip: lazy(
        () =>
          import("./prototype/f11-habits-and-weekly-targets/HabitsStripPrototypePage"),
      ),
    }
  : null;

function DemoBanner() {
  const demo = useDemoMode();
  if (!demo.enabled) return null;
  return (
    <div className="demo-banner" role="status">
      <strong>Demo mode</strong>
      {" — "}
      fictional portfolio sandbox (not real internship data).
      {demo.resetsDailyAt ? ` Resets daily at ${demo.resetsDailyAt}.` : ""}
      {" "}
      Live ranking and board refresh are disabled.
    </div>
  );
}

function ProtoPage({ page: Page }: { page: LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<p className="muted">Loading prototype…</p>}>
      <Page />
    </Suspense>
  );
}

export default function App() {
  return (
    <DemoModeProvider>
      <AchievementUnlockProvider>
      <div className="shell">
        <DemoBanner />
        <header className="top">
          <Link to="/" className="top-brand" aria-label="flora.exe home">
            <h1 className="top-brand-title">
              <span>flora.exe</span>
              <ThemeEmoji emoji={HEADER_BRAND_EMOJI} />
            </h1>
          </Link>
          <nav className="ui-chrome-tabs" aria-label="App">
            <ChromeTabLink to="/" end size="nav">Home</ChromeTabLink>
            <ChromeTabLink to="/jobs" size="nav">Jobs</ChromeTabLink>
            <ChromeTabLink to="/applications" size="nav">Applications</ChromeTabLink>
            <ChromeTabLink to="/tasks" size="nav">Tasks</ChromeTabLink>
            <ChromeTabLink to="/interviews" size="nav">Interviews</ChromeTabLink>
            <ChromeTabLink to="/progress" size="nav">Progress</ChromeTabLink>
            <ChromeTabLink to="/rewards" size="nav">Rewards</ChromeTabLink>
            <ChromeTabLink to="/status" size="nav">Status</ChromeTabLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/interviews/:threadId" element={<InterviewWorkspace />} />
            <Route path="/progress" element={<ProgressLayout />}>
              <Route index element={<ProgressIndexRedirect />} />
              <Route path="week" element={<ThisWeekPage />} />
              <Route path="past" element={<PastWorkPage />} />
              <Route path="lifetime" element={<LifetimePage />} />
            </Route>
            <Route path="/rewards" element={<RewardsLayout />}>
              <Route index element={<Navigate to="banner" replace />} />
              <Route path="banner" element={<BannerPage />} />
              <Route path="collection" element={<CollectionPage />} />
              <Route path="earnings" element={<EarningsPage />} />
              <Route path="history" element={<PullHistoryPage />} />
              <Route path="rules" element={<RulesPage />} />
            </Route>
            <Route path="/status" element={<Status />} />
            {proto ? (
              <>
                <Route path="/prototype/m1" element={<ProtoPage page={proto.M1Hub} />} />
                <Route path="/prototype/m1/misc-task" element={<ProtoPage page={proto.MiscTask} />} />
                <Route path="/prototype/m1/app-task" element={<ProtoPage page={proto.AppTask} />} />
                <Route
                  path="/prototype/m1/application"
                  element={<ProtoPage page={proto.Application} />}
                />
                <Route path="/prototype/m2" element={<ProtoPage page={proto.M2Hub} />} />
                <Route
                  path="/prototype/m2/detail-reflections"
                  element={<ProtoPage page={proto.DetailReflections} />}
                />
                <Route
                  path="/prototype/m2/progress-compose"
                  element={<ProtoPage page={proto.ProgressCompose} />}
                />
                <Route
                  path="/prototype/m2/strip-link"
                  element={<ProtoPage page={proto.StripLink} />}
                />
                <Route path="/prototype/m4" element={<ProtoPage page={proto.M4Hub} />} />
                <Route
                  path="/prototype/m4/ledger-completions"
                  element={<ProtoPage page={proto.LedgerCompletions} />}
                />
                <Route
                  path="/prototype/m4/ledger-points"
                  element={<ProtoPage page={proto.LedgerPoints} />}
                />
                <Route
                  path="/prototype/m4/reflection-minutes"
                  element={<ProtoPage page={proto.ReflectionMinutes} />}
                />
                <Route path="/prototype/f08/weekly" element={<ProtoPage page={proto.F08WeeklyHub} />} />
                <Route
                  path="/prototype/f08/weekly/lc-stepper"
                  element={<ProtoPage page={proto.F08LcStepper} />}
                />
                <Route
                  path="/prototype/f08/weekly/progress-block"
                  element={<ProtoPage page={proto.F08ProgressWeekly} />}
                />
                <Route
                  path="/prototype/f08/weekly/home-targets"
                  element={<ProtoPage page={proto.F08HomeTargets} />}
                />
                <Route
                  path="/prototype/f08/weekly/congrats"
                  element={<ProtoPage page={proto.F08Congrats} />}
                />
                <Route
                  path="/prototype/f08/weekly/weekly-record"
                  element={<ProtoPage page={proto.F08WeeklyRecord} />}
                />
                <Route
                  path="/prototype/f08/weekly/visual-direction"
                  element={<ProtoPage page={proto.F08VisualDirection} />}
                />
                <Route path="/prototype/f08/streaks" element={<ProtoPage page={proto.F08StreaksHub} />} />
                <Route
                  path="/prototype/f08/streaks/weekly-streak"
                  element={<ProtoPage page={proto.F08WeeklyStreak} />}
                />
                <Route
                  path="/prototype/f08/streaks/today-strip"
                  element={<ProtoPage page={proto.F08TodayStripStreak} />}
                />
                <Route
                  path="/prototype/f08/streaks/achievements"
                  element={<ProtoPage page={proto.F08Achievements} />}
                />
                <Route
                  path="/prototype/f08/streaks/flourish"
                  element={<ProtoPage page={proto.F08Flourish} />}
                />
                <Route
                  path="/prototype/f08/progress"
                  element={<ProtoPage page={proto.F08ProgressHub} />}
                />
                <Route
                  path="/prototype/f08/progress/this-week"
                  element={<ProtoPage page={proto.F08ProgressThisWeek} />}
                />
                <Route
                  path="/prototype/f08/progress/past-work"
                  element={<ProtoPage page={proto.F08ProgressPastWork} />}
                />
                <Route
                  path="/prototype/f08/progress/lifetime"
                  element={<ProtoPage page={proto.F08ProgressLifetime} />}
                />
                <Route path="/prototype/f09" element={<Navigate to="/prototype/f09/lab" replace />} />
                <Route path="/prototype/f09/lab" element={<ProtoPage page={proto.F09Lab} />} />
                <Route
                  path="/prototype/f09/refinements"
                  element={<ProtoPage page={proto.F09Refinements} />}
                />
                <Route
                  path="/prototype/f09/nesting"
                  element={<ProtoPage page={proto.F09Nesting} />}
                />
                <Route
                  path="/prototype/f09/layout"
                  element={<ProtoPage page={proto.F09Layout} />}
                />
                <Route
                  path="/prototype/f09/patterns"
                  element={<ProtoPage page={proto.F09Patterns} />}
                />
                <Route
                  path="/prototype/f11/habits"
                  element={<ProtoPage page={proto.F11HabitsHub} />}
                />
                <Route
                  path="/prototype/f11/habits/strip"
                  element={<ProtoPage page={proto.F11HabitsStrip} />}
                />
              </>
            ) : (
              <Route path="/prototype/*" element={<Navigate to="/" replace />} />
            )}
          </Routes>
        </main>
      </div>
      </AchievementUnlockProvider>
    </DemoModeProvider>
  );
}
