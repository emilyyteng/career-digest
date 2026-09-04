import { Link, NavLink, Route, Routes } from "react-router-dom";
import ApplicationDetail from "./features/applications/ApplicationDetailPage";
import Applications from "./features/applications/ApplicationsPage";
import Home from "./pages/Home";
import InterviewWorkspace from "./features/interviews/InterviewWorkspacePage";
import Interviews from "./features/interviews/InterviewsPage";
import JobDetail from "./features/jobs/JobDetailPage";
import Jobs from "./features/jobs/JobsPage";
import Status from "./pages/Status";
import Tasks from "./pages/Tasks";
import Progress from "./features/progress/ProgressPage";
import ThemeEmoji from "./ThemeEmoji";
import { DemoModeProvider, useDemoMode } from "./demoMode";
import { HEADER_BRAND_EMOJI } from "./pageTheme";

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
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/interviews/:threadId" element={<InterviewWorkspace />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/status" element={<Status />} />
          </Routes>
        </main>
      </div>
    </DemoModeProvider>
  );
}
