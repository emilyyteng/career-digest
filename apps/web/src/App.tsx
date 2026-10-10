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
import ThemeEmoji from "./ThemeEmoji";
import { DemoModeProvider, useDemoMode } from "./demoMode";
import { HEADER_BRAND_EMOJI } from "./pageTheme";

/** Dev-only prototype pages — dead-code eliminated from production builds. */
const proto = import.meta.env.DEV
  ? {
      Hub: lazy(() => import("./prototype/m1/M1PrototypeHub")),
      MiscTask: lazy(() => import("./prototype/m1/MiscTaskPrototypePage")),
      AppTask: lazy(() => import("./prototype/m1/AppTaskPrototypePage")),
      Application: lazy(() => import("./prototype/m1/ApplicationPrototypePage")),
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
            <NavLink to="/status">Status</NavLink>
            {proto && <NavLink to="/prototype/m1">Prototype</NavLink>}
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
            <Route path="/status" element={<Status />} />
            {proto ? (
              <>
                <Route path="/prototype/m1" element={<ProtoPage page={proto.Hub} />} />
                <Route path="/prototype/m1/misc-task" element={<ProtoPage page={proto.MiscTask} />} />
                <Route path="/prototype/m1/app-task" element={<ProtoPage page={proto.AppTask} />} />
                <Route
                  path="/prototype/m1/application"
                  element={<ProtoPage page={proto.Application} />}
                />
              </>
            ) : (
              <Route path="/prototype/*" element={<Navigate to="/" replace />} />
            )}
          </Routes>
        </main>
      </div>
    </DemoModeProvider>
  );
}
