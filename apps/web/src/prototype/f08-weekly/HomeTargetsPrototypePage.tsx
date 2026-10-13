/**
 * F08 M5-06 · design question 3: Home weekly target rows.
 * The target row treatment, and whether the hero's "This week" bars stay
 * once target rows exist.
 * Must satisfy R5.5 (label only on the LC row), R5.6 (Sunday, Targets only,
 * styled like interviews, not real tasks, gone once met), R5.7 (never
 * overdue) and R5.24 (no apps row when nothing is tagged).
 */
import { Link } from "react-router-dom";
import DeadlineUrgency from "../../DeadlineUrgency";
import F08Shell, { ParamToggle, useParam, useVariant } from "./F08Shell";
import { LC_LABEL_SAMPLE, SUNDAY_LABEL, THIS_SUNDAY_END_ISO } from "./fixtures";
import MockHome, { DEFAULT_WEEK, type WeekLine, type WeekSnapshot } from "./MockHome";
import { GoalBar, PaceText } from "./parts";

const VARIANTS = [
  { key: "A", name: "Interview mirror · hero bars stay" },
  { key: "B", name: "Row with mini bar · hero bars removed" },
  { key: "C", name: "Compact goal row · hero text line" },
] as const;

const WEEK_LINE: Record<string, WeekLine> = { A: "bars", B: "none", C: "text" };
const ROW_LINK = "/prototype/f08/weekly/progress-block";

type TargetRow = {
  id: "lc" | "apps";
  title: string;
  done: number;
  total: number;
  unit: string;
};

function buildRows(week: WeekSnapshot, label: string): TargetRow[] {
  const rows: TargetRow[] = [];
  if (week.lcDone < week.lcTarget) {
    rows.push({
      id: "lc",
      title: label ? `Weekly LC goal · ${label}` : "Weekly LC goal",
      done: week.lcDone,
      total: week.lcTarget,
      unit: "solved",
    });
  }
  if (week.appsTotal > 0 && week.appsDone < week.appsTotal) {
    rows.push({
      id: "apps",
      title: "Weekly apps goal",
      done: week.appsDone,
      total: week.appsTotal,
      unit: "applied",
    });
  }
  return rows;
}

function RowA({ row }: { row: TargetRow }) {
  return (
    <li className="home-job-row home-interview-row">
      <Link to={ROW_LINK} className="home-job-main">
        <span className="home-job-title home-upcoming-title task-title-line">
          <span className="task-title-text">{row.title}</span>
        </span>
        <span className="muted home-job-meta">
          {row.done}/{row.total} {row.unit} · {row.total - row.done} to go
        </span>
      </Link>
      <div className="home-interview-deadline">
        <div className="home-interview-deadline-date">{SUNDAY_LABEL}</div>
        <DeadlineUrgency
          dueAt={THIS_SUNDAY_END_ISO}
          className="deadline-urgency-prominent deadline-urgency-compact deadline-urgency-home"
        />
      </div>
    </li>
  );
}

function RowB({ row }: { row: TargetRow }) {
  return (
    <li className="home-job-row home-interview-row">
      <Link to={ROW_LINK} className="home-job-main">
        <span className="home-job-title home-upcoming-title task-title-line">
          <span className="task-title-text">{row.title}</span>
        </span>
        <span className="muted home-job-meta f08-target-meta">
          <span className="f08-mini-bar">
            <GoalBar done={row.done} total={row.total} />
          </span>
          <span>
            {row.done}/{row.total}
          </span>
          <PaceText done={row.done} total={row.total} />
        </span>
      </Link>
      <div className="home-interview-deadline">
        <div className="home-interview-deadline-date">{SUNDAY_LABEL}</div>
        <span className="muted f08-hint">resets Monday</span>
      </div>
    </li>
  );
}

function RowC({ row }: { row: TargetRow }) {
  return (
    <li className="home-job-row">
      <Link to={ROW_LINK} className="home-job-main">
        <span className="home-job-title home-upcoming-title task-title-line home-upcoming-title-oneline">
          <span className="ledger-kind">Goal</span>
          <span className="task-title-text">{row.title}</span>
        </span>
        <span className="muted home-job-meta">
          {row.total - row.done} more by Sunday · {row.done}/{row.total}
        </span>
      </Link>
    </li>
  );
}

export default function HomeTargetsPrototypePage() {
  const variant = useVariant(VARIANTS);
  const lc = useParam("lc", ["open", "met"] as const);
  const apps = useParam("apps", ["open", "met", "none"] as const);
  const label = useParam("label", ["sample", "empty"] as const);

  const week: WeekSnapshot = {
    ...DEFAULT_WEEK,
    lcDone: lc === "met" ? 11 : DEFAULT_WEEK.lcDone,
    appsDone: apps === "met" ? DEFAULT_WEEK.appsTotal : DEFAULT_WEEK.appsDone,
    appsTotal: apps === "none" ? 0 : DEFAULT_WEEK.appsTotal,
  };
  const rows = buildRows(week, label === "sample" ? LC_LABEL_SAMPLE : "");
  const Row = variant === "B" ? RowB : variant === "C" ? RowC : RowA;

  return (
    <F08Shell
      title="Home · Sunday weekly targets"
      question="Q3: target row treatment, and whether the hero's “This week” bars stay once target rows exist."
      variants={VARIANTS}
      surfaceLabel="Q3 Home targets"
      controls={
        <>
          <ParamToggle
            name="lc"
            label="LC"
            options={[
              { key: "open", label: "7/10" },
              { key: "met", label: "Met (11/10)" },
            ]}
          />
          <ParamToggle
            name="apps"
            label="Apps"
            options={[
              { key: "open", label: "2/5" },
              { key: "met", label: "Met (5/5)" },
              { key: "none", label: "0 tagged" },
            ]}
          />
          <ParamToggle
            name="label"
            label="LC label"
            options={[
              { key: "sample", label: "Sample" },
              { key: "empty", label: "Empty" },
            ]}
          />
        </>
      }
      notes={
        <p>
          Rows sit on this week&apos;s Sunday under Targets, never Deadlines. They aren&apos;t tasks, so
          there&apos;s no priority badge or checkbox. A row disappears once its target is met, and there&apos;s
          no apps row with 0 tagged. Sunday is always this week&apos;s, so a row can&apos;t show as overdue:
          the week closes and the row leaves (R5.7). Clicking a row opens Progress (Proposed).
        </p>
      }
    >
      <MockHome
        key={variant}
        week={week}
        weekLine={WEEK_LINE[variant]}
        sundayTargetRows={rows.map((r) => (
          <Row key={r.id} row={r} />
        ))}
      />
    </F08Shell>
  );
}
