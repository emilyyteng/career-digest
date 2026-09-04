import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getOpsStatus } from "./api";

export type DemoModeInfo = {
  enabled: boolean;
  resetsDailyAt: string;
};

const DEFAULT: DemoModeInfo = { enabled: false, resetsDailyAt: "" };

const DemoModeContext = createContext<DemoModeInfo>(DEFAULT);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<DemoModeInfo>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    void getOpsStatus()
      .then((ops) => {
        if (cancelled || !ops.demo) return;
        setDemo({
          enabled: Boolean(ops.demo.enabled),
          resetsDailyAt: String(ops.demo.resetsDailyAt ?? ""),
        });
      })
      .catch(() => {
        /* non-demo / offline: leave defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => demo, [demo]);
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeInfo {
  return useContext(DemoModeContext);
}

/** Tooltip copy for gated Rank / Rerank / board refresh controls. */
export function demoGatedTitle(demo: DemoModeInfo): string | undefined {
  if (!demo.enabled) return undefined;
  const when = demo.resetsDailyAt ? ` Resets daily at ${demo.resetsDailyAt}.` : "";
  return `Unavailable in Demo mode — live ranking and board refresh are gated.${when}`;
}
