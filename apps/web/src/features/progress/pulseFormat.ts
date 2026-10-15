/** R8.10 pulse line: LC · apps · tasks · interviews · reflections. */
export function formatPulseLine(counts: {
  leetcode: number;
  apps: number;
  tasks: number;
  interview: number;
  reflections: number;
}): string {
  const unit = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  return [
    unit(counts.leetcode, "LC", "LC"),
    unit(counts.apps, "app", "apps"),
    unit(counts.tasks, "task", "tasks"),
    unit(counts.interview, "interview", "interviews"),
    unit(counts.reflections, "reflection", "reflections"),
  ].join(" · ");
}
