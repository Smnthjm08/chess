import Link from "next/link";
import { LOBBY_FILTERS, lobbyHref, type LobbyFilter } from "@/lib/lobby";
import { cn } from "@/lib/utils";

export function LobbyFilters({ active }: { active: LobbyFilter }) {
  return (
    <nav
      aria-label="Filter games"
      className="border-hairline flex gap-1 border-b"
    >
      {LOBBY_FILTERS.map(({ key, label }) => {
        const current = key === active;

        return (
          <Link
            key={key}
            href={lobbyHref(key)}
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
