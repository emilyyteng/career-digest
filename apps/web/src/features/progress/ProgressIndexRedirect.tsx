import { Navigate, useSearchParams } from "react-router-dom";

/**
 * `/progress` → nested surfaces. Cheap redirects for old `?tab=` / `?view=` URLs.
 * Ledger completions → Past work; Points stub → Rewards Earnings.
 */
export default function ProgressIndexRedirect() {
  const [params] = useSearchParams();
  const tab = params.get("tab");
  const view = params.get("view");

  if (tab === "ledger" && view === "points") {
    return <Navigate to="/rewards/earnings" replace />;
  }
  if (tab === "ledger" || tab === "history") {
    return <Navigate to="/progress/past" replace />;
  }
  if (tab === "achievements") {
    return <Navigate to="/progress/lifetime" replace />;
  }
  return <Navigate to="/progress/week" replace />;
}
