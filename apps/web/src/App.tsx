import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
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
import Progress from "./features/progress/ProgressPage";
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
      RewardsHub: lazy(() => import("./prototype/rewards/RewardsPrototypeHub")),
      RewardsLab: lazy(() => import("./prototype/rewards/CatCakeLabPage")),
      RewardsPull: lazy(() => import("./prototype/rewards/PullPrototypePage")),
      RewardsCollection: lazy(() => import("./prototype/rewards/CollectionPrototypePage")),
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
          <Link to="/" className="top-brand" aria-label="career-digest home">
            <h1 className="top-brand-title">
              <span>career-digest</span>
              <ThemeEmoji emoji={HEADER_BRAND_EMOJI} />
            </h1>
          </Link>
          <nav>
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/jobs">Jobs</NavLink>
            <NavLink to="/applications">Applications</NavLink>
            <NavLink to="/tasks">Tasks</NavLink>
            <NavLink to="/interviews">Interviews</NavLink>
            <NavLink to="/progress">Progress</NavLink>
            <NavLink to="/rewards">Rewards</NavLink>
            <NavLink to="/status">Status</NavLink>
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
            <Route path="/progress" element={<Progress />} />
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
                <Route path="/prototype/rewards" element={<ProtoPage page={proto.RewardsHub} />} />
                <Route path="/prototype/rewards/lab" element={<ProtoPage page={proto.RewardsLab} />} />
                <Route path="/prototype/rewards/pull" element={<ProtoPage page={proto.RewardsPull} />} />
                <Route
                  path="/prototype/rewards/collection"
                  element={<ProtoPage page={proto.RewardsCollection} />}
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
