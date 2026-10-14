import { useEffect, useState } from "react";
import { getRewardsRules, type RewardsRulesPayload } from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";

function pct(rate: number): string {
  return `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)}%`;
}

function AchievementFamilyList({
  rules,
  family,
  title,
}: {
  rules: RewardsRulesPayload;
  family: string;
  title: string;
}) {
  const rows = rules.earning.achievements.filter((a) => a.family === family);
  if (rows.length === 0) return null;
  return (
    <div className="rewards-rules-block">
      <h4>{title}</h4>
      <ul>
        {rows.map((a) => (
          <li key={a.id}>
            {a.label}: +{a.points} {CURRENCY_DISPLAY.plural}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RulesPage() {
  const [rules, setRules] = useState<RewardsRulesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getRewardsRules()
      .then((payload) => {
        if (!cancelled) setRules(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load rules");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rules) return <p className="muted">Loading rules…</p>;

  const p = rules.earning.points;
  const g = rules.spending.gacha;
  const unit = CURRENCY_DISPLAY.plural;
  const softRates = rules.spending.pityLadder.filter(
    (r) => r.pull >= g.softPityStart && r.pull <= g.hardPity,
  );

  return (
    <div className="rewards-rules">
      <p className="muted" style={{ marginTop: 0 }}>
        Numbers below are read from the same constants the app uses to award and
        spend {unit}, so this page cannot drift from the code.
      </p>

      <section className="rewards-rules-section">
        <h3>Earning {unit}</h3>
        <p>
          Every kind of work has a flat base; time adds{" "}
          <strong>1 {CURRENCY_DISPLAY.singular} per minute</strong> on top. Blank
          or missing time adds 0. A reflection is a note worth a flat{" "}
          <strong>+{p.reflectionBonus}</strong>, whether written with the work or
          on its own — it is not where time lives.
        </p>
        <ul>
          <li>
            Misc task base: <strong>+{p.miscTaskBase}</strong>
          </li>
          <li>
            Application base: <strong>+{p.applicationBase}</strong>
          </li>
          <li>
            LeetCode: easy {p.leetcodeByTier.easy} · medium {p.leetcodeByTier.medium}{" "}
            · hard {p.leetcodeByTier.hard} (untiered counts as medium,{" "}
            {p.leetcodePerUnit})
          </li>
          <li>
            Interview steps: assessment {p.interviewByKind.assessment}, phone{" "}
            {p.interviewByKind.phone}, technical {p.interviewByKind.technical},
            onsite {p.interviewByKind.onsite}, offer {p.interviewByKind.offer},
            custom {p.interviewByKind.custom}
          </li>
        </ul>

        <h4>Weekly goals</h4>
        <p>
          At week close, each completed unit toward a met or partial goal pays{" "}
          <strong>+{p.weeklyGoalPerUnit}</strong>, and a met goal adds a flat{" "}
          <strong>+{p.weeklyGoalBonus}</strong>. A 0/0 week earns nothing. The{" "}
          <strong>weekly-goal streak is display only</strong> — it never awards{" "}
          {unit}.
        </p>

        <h4>Daily streaks</h4>
        <p>
          Active daily streaks pay{" "}
          <strong>
            {p.streakDailyPerLength} × length
          </strong>{" "}
          each day, capped at {p.streakDailyCap}. Length milestones (
          {p.streakMilestones.join(", ")}) pay{" "}
          {p.streakMilestonePerLength} × length once each.
        </p>

        <h4>Achievements</h4>
        <p>
          Threshold achievements pay once when reached. Already-passed ones at
          launch unlock with no {unit}.
        </p>
        <AchievementFamilyList rules={rules} family="apps" title="Applications" />
        <AchievementFamilyList rules={rules} family="lc" title="LeetCode" />
        <AchievementFamilyList
          rules={rules}
          family="assessment"
          title="Assessments"
        />
        <AchievementFamilyList rules={rules} family="phone" title="Phone screens" />
        <AchievementFamilyList
          rules={rules}
          family="technical"
          title="Technicals"
        />
        <AchievementFamilyList rules={rules} family="onsite" title="Onsites" />
        <AchievementFamilyList rules={rules} family="offer" title="Offers" />
      </section>

      <section className="rewards-rules-section">
        <h3>Spending (Cat Cake gacha)</h3>
        <p>
          Each pull costs <strong>{g.costPerPull} {unit}</strong>; ×10 costs{" "}
          <strong>{(g.costPerPull * 10).toLocaleString()} {unit}</strong>. The
          banner has {rules.spending.flavorCount} classic flavors and matching
          Collector&apos;s Editions. Pulls are blocked when the balance is below
          the cost (including a negative balance).
        </p>

        <h4>Rates and pity</h4>
        <p>
          Base Collector&apos;s Edition chance is{" "}
          <strong>{pct(g.collectorBaseRate)}</strong>. Soft pity starts at pull{" "}
          <strong>{g.softPityStart}</strong> (+{pct(g.softPityStep)} per pull).
          Hard pity guarantees a CE at pull <strong>{g.hardPity}</strong>. Pity
          resets only on a CE hit. There is one CE pity pool (Day/Night are skins,
          not separate pool entries).
        </p>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Soft → hard ladder:{" "}
          {softRates.map((r) => `pull ${r.pull} ${pct(r.rate)}`).join(" · ")}
        </p>

        <h4>Friendship and refunds</h4>
        <p>
          The first copy plus up to {rules.spending.friendshipMax} extras raise
          friendship ({rules.spending.keptCopies} copies kept). Manual refunds
          are only offered for copies <strong>above {rules.spending.keptCopies}</strong>{" "}
          after friendship is maxed: classic{" "}
          <strong>+{g.refund.classic}</strong>, CE{" "}
          <strong>+{g.refund.collector}</strong>. Refunds never drop a cat below{" "}
          {rules.spending.keptCopies} copies.
        </p>

        <h4>Day / Night</h4>
        <p>
          Day and Night are skins of the same CE. The Night skin unlocks on the{" "}
          <strong>
            {rules.spending.nightUnlockAtCopies}nd owned CE copy
          </strong>
          ; toggling is free and does not spend friendship or {unit}.
        </p>
      </section>
    </div>
  );
}
