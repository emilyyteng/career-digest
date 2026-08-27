import { NavLink, Route, Routes } from "react-router-dom";
import ApplicationDetail from "./pages/ApplicationDetail";
import Applications from "./pages/Applications";
import JobDetail from "./pages/JobDetail";
import Jobs from "./pages/Jobs";

export default function App() {
  return (
    <div className="shell">
      <header className="top">
        <h1>career-digest</h1>
        <nav>
          <NavLink to="/" end>
            Jobs
          </NavLink>
          <NavLink to="/applications">Applications</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
        </Routes>
      </main>
    </div>
  );
}
