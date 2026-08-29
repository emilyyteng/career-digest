type Props = {
  emoji: string;
  className?: string;
};

/** Inline emoji decoration — no background chip. */
export default function ThemeEmoji({ emoji, className = "theme-emoji" }: Props) {
  return (
    <span className={className} aria-hidden="true">
      {emoji}
    </span>
  );
}
