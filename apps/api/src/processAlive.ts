/** True if a process with this pid exists (or we lack permission to signal it). */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    // EPERM: process exists but we can't signal it.
    return code === "EPERM";
  }
}
