export type AppSection = "home" | "jobs" | "applications" | "interviews" | "status";

export type GreetingPeriod = "morning" | "afternoon" | "evening";

const HEADER_EMOJI: Record<AppSection, string> = {
  home: "🌸",
  jobs: "💼",
  applications: "📝",
  interviews: "🗓️",
  status: "⚙️",
};

const GREETING_EMOJI: Record<GreetingPeriod, string> = {
  morning: "🌤️",
  afternoon: "☀️",
  evening: "🌙",
};

const GREETING_LABEL: Record<GreetingPeriod, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

/** Map the current route to a nav section for header theming. */
export function sectionFromPathname(pathname: string): AppSection {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/applications")) return "applications";
  if (pathname.startsWith("/interviews")) return "interviews";
  if (pathname.startsWith("/status")) return "status";
  return "home";
}

export function headerEmojiForSection(section: AppSection): string {
  return HEADER_EMOJI[section];
}

export function greetingPeriodFromHour(hour: number): GreetingPeriod {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function greetingLabelForPeriod(period: GreetingPeriod): string {
  return GREETING_LABEL[period];
}

export function greetingEmojiForPeriod(period: GreetingPeriod): string {
  return GREETING_EMOJI[period];
}
