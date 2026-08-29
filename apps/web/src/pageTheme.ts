export type GreetingPeriod = "morning" | "afternoon" | "evening";

/** Brand mark beside the career-digest header — fixed on every page. */
export const HEADER_BRAND_EMOJI = "🌸";

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
