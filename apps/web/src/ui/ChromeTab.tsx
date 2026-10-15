import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";

export type ChromeTabSize = "nav" | "subnav" | "page";

export function chromeTabClass(
  size: ChromeTabSize,
  active: boolean,
  className = "",
): string {
  return [
    "ui-chrome-tab",
    `ui-chrome-tab-${size}`,
    active ? "is-active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type LinkProps = Omit<NavLinkProps, "className" | "children"> & {
  size?: ChromeTabSize;
  className?: string;
  children: ReactNode;
};

/** App nav / feature subnav link — active = underline ink (M1-15). */
export function ChromeTabLink({
  size = "subnav",
  className = "",
  children,
  ...rest
}: LinkProps) {
  return (
    <NavLink
      {...rest}
      className={({ isActive }) => chromeTabClass(size, isActive, className)}
    >
      {children}
    </NavLink>
  );
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  size?: ChromeTabSize;
  active?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * In-page tab button. Includes `.secondary` so the global blue `button` default
 * does not apply. Do not add these classes to the `:not(...)` opt-out chain.
 */
export function ChromeTab({
  size = "page",
  active = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`secondary ${chromeTabClass(size, active, className)}`}
      {...rest}
    >
      {children}
    </button>
  );
}
