import Link from "next/link";
import {
  PROFILE_FILTERS,
  profileGamesHref,
  type ProfileFilter,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

export function ProfileFilters({
  handle,
  active,
}: {
  handle: string;
  active: ProfileFilter;
}) {
  return (
    <nav
      aria-label="Filter games"
      className="border-hairline flex gap-1 border-b"
    >
      {PROFILE_FILTERS.map(({ key, label }) => {
        const current = key === active;

        return (
          <Link
            key={key}
            href={profileGamesHref(handle, key)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              current
                ? "border-foreground text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
