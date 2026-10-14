import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AchievementUnlock } from "../../api";
import AchievementUnlockModal from "./AchievementUnlockModal";

type Ctx = {
  pushUnlocks: (unlocks: AchievementUnlock[] | null | undefined) => void;
};

const AchievementUnlockContext = createContext<Ctx | null>(null);

export function AchievementUnlockProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<AchievementUnlock[]>([]);
  const pushUnlocks = useCallback((unlocks: AchievementUnlock[] | null | undefined) => {
    if (!unlocks?.length) return;
    setQueue((q) => [...q, ...unlocks]);
  }, []);
  const value = useMemo(() => ({ pushUnlocks }), [pushUnlocks]);
  const current = queue[0] ?? null;

  return (
    <AchievementUnlockContext.Provider value={value}>
      {children}
      {current && (
        <AchievementUnlockModal
          unlock={current}
          onDismiss={() => setQueue((q) => q.slice(1))}
        />
      )}
    </AchievementUnlockContext.Provider>
  );
}

export function useAchievementUnlocks(): Ctx {
  const ctx = useContext(AchievementUnlockContext);
  if (!ctx) {
    return { pushUnlocks: () => undefined };
  }
  return ctx;
}
