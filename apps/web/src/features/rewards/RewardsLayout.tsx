import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { getPointsSummary } from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";
import "./catCake.css";

const SUBNAV = [
  { to: "/rewards/banner", label: "Banner" },
  { to: "/rewards/collection", label: "Collection" },
  { to: "/rewards/earnings", label: "Earnings" },
  { to: "/rewards/history", label: "Pull history" },
  { to: "/rewards/rules", label: "Rules" },
] as const;

export type RewardsOutletContext = {
  balance: number | null;
  lifetimeEarned: number | null;
  refreshSeeds: () => Promise<void>;
};

export default function RewardsLayout() {
  const [balance, setBalance] = useState<number | null>(null);
  const [lifetimeEarned, setLifetimeEarned] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const refreshSeeds = useCallback(async () => {
    try {
      const summary = await getPointsSummary();
      setBalance(summary.balance);
      setLifetimeEarned(summary.lifetimeEarned);
      setBalanceError(null);
    } catch (err) {
      setBalance(null);
      setLifetimeEarned(null);
      setBalanceError(
        err instanceof Error ? err.message : "Failed to load balance",
      );
    }
  }, []);

  useEffect(() => {
    void refreshSeeds();
  }, [refreshSeeds]);

  return (
    <section className="rewards-page">
      <header className="rewards-chrome">
        <div className="ledger-balance-hero rewards-balance">
          <div>
            {balanceError ? (
              <span className="error">{balanceError}</span>
            ) : balance == null || lifetimeEarned == null ? (
              <span className="muted">Loading…</span>
            ) : (
              <>
                <span className="ledger-balance-value">{balance}</span>
                <span className="ledger-balance-label">
                  {CURRENCY_DISPLAY.plural}
                </span>
                <span className="rewards-lifetime muted">
                  ({lifetimeEarned} lifetime)
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
        <Outlet context={{ balance, lifetimeEarned, refreshSeeds } satisfies RewardsOutletContext} />
      </div>
    </section>
  );
}
