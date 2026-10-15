import { Outlet } from "react-router-dom";
import { ChromeTabLink } from "../../ui";

const SUBNAV = [
  { to: "/progress/week", label: "This week" },
  { to: "/progress/past", label: "Past work" },
  { to: "/progress/lifetime", label: "Lifetime" },
] as const;

export default function ProgressLayout() {
  return (
    <section className="progress-shell">
      <header className="progress-chrome">
        <div className="ui-chrome-tabs" role="navigation" aria-label="Progress">
          {SUBNAV.map((item) => (
            <ChromeTabLink key={item.to} to={item.to} size="subnav">
              {item.label}
            </ChromeTabLink>
          ))}
        </div>
      </header>
      <div className="progress-outlet">
        <Outlet />
      </div>
    </section>
  );
}
