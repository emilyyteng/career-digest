import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

/**
 * Ink desk button. Includes `.secondary` so legacy `button.secondary` / card sizing
 * rules still apply; product look comes from `.ui-button*` (F09 M1-04 removed the
 * global filled-blue default and `:not(...)` chain).
 */
export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: Props) {
  const classes = [
    "secondary",
    "ui-button",
    variant === "primary" ? "ui-button-primary" : "",
    variant === "ghost" ? "ui-button-ghost" : "",
    size === "sm" ? "ui-button-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
