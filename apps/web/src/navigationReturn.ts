import type { Location } from "react-router-dom";

export type ListReturnState = {
  from?: Pick<Location, "pathname" | "search">;
};

export function listReturnTo(
  location: Location,
  listPath: "/jobs" | "/applications",
): string {
  const from = (location.state as ListReturnState | null)?.from;
  if (from?.pathname === listPath) {
    return `${from.pathname}${from.search ?? ""}`;
  }
  return listPath;
}

export function listLinkState(location: Location): ListReturnState {
  return {
    from: {
      pathname: location.pathname,
      search: location.search,
    },
  };
}
