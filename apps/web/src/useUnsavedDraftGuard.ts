import { useEffect } from "react";

/** Warn before closing or refreshing the tab while a draft is unsaved. */
export function useBeforeUnloadDraftGuard(when: boolean) {
  useEffect(() => {
    if (!when) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);
}
