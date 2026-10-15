import { NavLink, Outlet } from "react-router-dom";

const SUBNAV = [
  { to: "/progress/week", label: "This week" },
  { to: "/progress/past", label: "Past work" },
  { to: "/progress/lifetime", label: "Lifetime" },
] as const;

export default function ProgressLayout() {
  return (
    <section className="progress-shell">
      <header className="progress-chrome">
        <div className="progress-subnav" role="navigation" aria-label="Progress">
          {SUBNAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "progress-subnav-link is-active"
                  : "progress-subnav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>
      <div className="progress-outlet">
        <Outlet />
      </div>
    </section>
  );
}
