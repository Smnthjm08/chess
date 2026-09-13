import type { GameStatus } from "./api";

/**
 * The lobby's tabs. These are not raw statuses: "in progress" covers a paused
 * game as well as an active one, and "all" applies no filter.
 */
export type LobbyFilter = "WAITING" | "IN_PROGRESS" | "FINISHED" | "ALL";

/** Waiting first, because an opponent is the thing a visitor is looking for. */
export const DEFAULT_FILTER: LobbyFilter = "WAITING";

export const LOBBY_FILTERS: { key: LobbyFilter; label: string }[] = [
  { key: "WAITING", label: "Waiting" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "FINISHED", label: "Finished" },
  { key: "ALL", label: "All" },
];

const FILTER_STATUSES: Record<LobbyFilter, GameStatus[]> = {
  WAITING: ["WAITING"],
  IN_PROGRESS: ["ACTIVE", "PAUSED"],
  FINISHED: ["FINISHED"],
  ALL: [],
};

/** The statuses a tab asks the API for; empty means "no filter". */
export function filterStatuses(filter: LobbyFilter): GameStatus[] {
  return FILTER_STATUSES[filter];
}

export function parseFilter(value: string | undefined): LobbyFilter {
  // `hasOwn` rather than `in`, which would accept "toString" as a filter.
  return value && Object.hasOwn(FILTER_STATUSES, value)
    ? (value as LobbyFilter)
    : DEFAULT_FILTER;
}

/** Page numbers come from the URL, so anything unusable reads as page 1. */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);

  return Number.isFinite(page) && page > 1 ? page : 1;
}

/** The default filter and the first page are left implicit in the URL. */
export function lobbyHref(filter: LobbyFilter, page = 1): string {
  const query = new URLSearchParams();

  if (filter !== DEFAULT_FILTER) query.set("filter", filter);
  if (page > 1) query.set("page", String(page));

  return query.size > 0 ? `/lobby?${query}` : "/lobby";
}
