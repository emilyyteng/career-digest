/**
 * Completion flourish + EarnFlash stacking (incl. weekly +100).
 */
import { useCallback, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EarnFlash from "../../features/completion/EarnFlash";
import type { PointsEarnInfo } from "../../api";
import PrototypeSwitcher from "../PrototypeSwitcher";
import {
  completeDemoTasks,
  routineEarn,
  weeklyHitEarn,
  type ProtoTaskCompleteDemo,
} from "./fixtures";
import "../m4/prototype-m4.css";
import "./prototype-m5.css";

const VARIANTS = [
  { key: "A", name: "Confetti at click + EarnFlash" },
  { key: "B", name: "Row vanish + weekly hero earn" },
  { key: "C", name: "Pulse + sparkles + stacked earns" },
] as const;

type Particle = { id: number; x: number; y: number; color: string; dx: number; dy: number };

const CONFETTI_COLORS = ["#7ecfb0", "#ffd86b", "#c4a8f0", "#f78da7", "#6ec1ff"];

function spawnConfetti(x: number, y: number, count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    x,
    y,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
    dx: (Math.random() - 0.5) * 180,
    dy: 80 + Math.random() * 160,
  }));
}

function spawnSparkles(x: number, y: number, count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i + 1000,
    x: x + (Math.random() - 0.5) * 40,
    y: y + (Math.random() - 0.5) * 24,
    color: "#ffd86b",
    dx: 0,
    dy: 0,
  }));
}

export default function CelebrationPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const [tasks, setTasks] = useState(completeDemoTasks);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const [weeklyHero, setWeeklyHero] = useState(false);
  const [vanishId, setVanishId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pulse, setPulse] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const clearFlourish = useCallback(() => {
    window.setTimeout(() => {
      setParticles([]);
      setPulse(null);
    }, 1200);
  }, []);

  function completeTask(task: ProtoTaskCompleteDemo, event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (variant === "A") {
      setParticles(spawnConfetti(x, y, 24));
      clearFlourish();
      setEarn({
        amount: routineEarn.amount,
        message: routineEarn.message,
        balanceAfter: routineEarn.balanceAfter,
      });
    } else if (variant === "B") {
      setVanishId(task.id);
      window.setTimeout(() => {
        setTasks((list) => list.filter((t) => t.id !== task.id));
        setVanishId(null);
      }, 380);
      if (task.id === "c3") {
        setWeeklyHero(true);
        setEarn(null);
      } else {
        setWeeklyHero(false);
        setEarn({
          amount: routineEarn.amount,
          message: routineEarn.message,
          balanceAfter: routineEarn.balanceAfter,
        });
      }
    } else {
      setPulse({ x, y });
      setParticles(spawnSparkles(x, y, 10));
      clearFlourish();
      setEarn({
        amount: routineEarn.amount,
        message: routineEarn.message,
        balanceAfter: routineEarn.balanceAfter,
      });
      if (task.id === "c3") {
        window.setTimeout(() => {
          setEarn({
            amount: weeklyHitEarn.amount,
            message: weeklyHitEarn.message,
            balanceAfter: weeklyHitEarn.balanceAfter,
          });
        }, 450);
      }
    }

    if (variant !== "B") {
      setTasks((list) => list.filter((t) => t.id !== task.id));
    }
  }

  function resetDemo() {
    setTasks(completeDemoTasks);
    setEarn(null);
    setWeeklyHero(false);
    setVanishId(null);
    setParticles([]);
    setPulse(null);
  }

  return (
    <section className="prototype-page">
      <p className="prototype-banner">
        <Link to="/prototype/m5">← M5 hub</Link>
        {" · "}
        Click Complete — variant B/C last row simulates weekly LC target (+100).
      </p>
      <h2>Completion flourish</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Keep mint EarnFlash for copy + balance; add motion at the action site. Affirmations
        skipped for now.
      </p>

      <div className="proto-m5-complete-stage" ref={stageRef}>
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`proto-m5-task-row${vanishId === task.id ? " is-vanishing" : ""}`}
            style={{ marginBottom: "0.5rem" }}
          >
            <div>
              <strong>{task.title}</strong>
              <div className="muted" style={{ fontSize: "0.85rem" }}>
                est {task.estimateMin}m
              </div>
            </div>
            <button
              type="button"
              className="proto-m5-complete-btn"
              onClick={(e) => completeTask(task, e)}
            >
              Complete
            </button>
          </div>
        ))}

        <div className="proto-m5-earn-stack">
          {weeklyHero && variant === "B" && (
            <p className="proto-m5-earn-hero" role="status">
              {weeklyHitEarn.message}
              <span className="earn-flash-balance">balance {weeklyHitEarn.balanceAfter}</span>
            </p>
          )}
          <EarnFlash earn={earn} onDismiss={() => setEarn(null)} durationMs={0} />
        </div>

        <button type="button" className="secondary" style={{ marginTop: "1rem" }} onClick={resetDemo}>
          Reset demo
        </button>
      </div>

      <div className="proto-m5-flourish-layer" aria-hidden>
        {pulse && <span className="proto-m5-pulse-ring" style={{ left: pulse.x, top: pulse.y }} />}
        {particles.map((p) =>
          p.dx === 0 && p.dy === 0 ? (
            <span
              key={p.id}
              className="proto-m5-sparkle"
              style={{ left: p.x, top: p.y, background: p.color }}
            />
          ) : (
            <span
              key={p.id}
              className="proto-m5-confetti"
              style={
                {
                  left: p.x,
                  top: p.y,
                  background: p.color,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                } as CSSProperties
              }
            />
          ),
        )}
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Celebration" />
    </section>
  );
}
