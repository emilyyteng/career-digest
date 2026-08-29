import { Link, NavLink, Route, Routes } from "react-router-dom";
import ApplicationDetail from "./pages/ApplicationDetail";
import Applications from "./pages/Applications";
import Home from "./pages/Home";
import InterviewWorkspace from "./pages/InterviewWorkspace";
import Interviews from "./pages/Interviews";
import JobDetail from "./pages/JobDetail";
import Jobs from "./pages/Jobs";
import Status from "./pages/Status";
import Tasks from "./pages/Tasks";
import ThemeEmoji from "./ThemeEmoji";
import { HEADER_BRAND_EMOJI } from "./pageTheme";

export default function App() {
  return (
    <div className="shell">
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
          <Route path="/status" element={<Status />} />
        </Routes>
      </main>
    </div>
  );
}
