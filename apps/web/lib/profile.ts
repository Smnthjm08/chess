import type { GameResultFilter } from "./api";

/** The profile games list's tabs. "ALL" applies no result filter. */
export type ProfileFilter = "ALL" | GameResultFilter;

export const DEFAULT_PROFILE_FILTER: ProfileFilter = "ALL";

export const PROFILE_FILTERS: { key: ProfileFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "drawn", label: "Drawn" },
];

export function resultFilter(
  filter: ProfileFilter,
): GameResultFilter | undefined {
  return filter === "ALL" ? undefined : filter;
}

export function parseProfileFilter(value: string | undefined): ProfileFilter {
  return value && PROFILE_FILTERS.some((f) => f.key === value)
    ? (value as ProfileFilter)
    : DEFAULT_PROFILE_FILTER;
}

/** Page numbers come from the URL, so anything unusable reads as page 1. */
export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "", 10);

  return Number.isFinite(page) && page > 1 ? page : 1;
}

/** The default filter and the first page are left implicit in the URL. */
export function profileGamesHref(
  handle: string,
  filter: ProfileFilter,
  page = 1,
): string {
  const query = new URLSearchParams();

  if (filter !== DEFAULT_PROFILE_FILTER) query.set("result", filter);
  if (page > 1) query.set("page", String(page));

  const base = `/u/${encodeURIComponent(handle)}`;

  return query.size > 0 ? `${base}?${query}` : base;
}
