import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getPointsSummary } from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";

const SUBNAV = [
  { to: "/rewards/collection", label: "Collection" },
  { to: "/rewards/banner", label: "Banner" },
  { to: "/rewards/earnings", label: "Earnings" },
  { to: "/rewards/history", label: "Pull history" },
  { to: "/rewards/rules", label: "Rules" },
] as const;

export default function RewardsLayout() {
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPointsSummary()
      .then((summary) => {
        if (!cancelled) {
          setBalance(summary.balance);
          setBalanceError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setBalance(null);
          setBalanceError(
            err instanceof Error ? err.message : "Failed to load balance",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rewards-page">
      <header className="rewards-chrome">
        <div className="ledger-balance-hero rewards-balance">
          <div>
            {balanceError ? (
              <span className="error">{balanceError}</span>
            ) : balance == null ? (
              <span className="muted">Loading…</span>
            ) : (
              <>
                <span className="ledger-balance-value">{balance}</span>
                <span className="ledger-balance-label">
                  {CURRENCY_DISPLAY.plural}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="rewards-subnav" role="navigation" aria-label="Rewards">
          {SUBNAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? "rewards-subnav-link is-active"
                  : "rewards-subnav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>
      <div className="rewards-outlet">
        <Outlet />
      </div>
    </section>
  );
}
