import { formatTimeControl } from "@repo/game-core";
import Link from "next/link";
import { StatusBadge } from "@/components/game/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { playerLabel, type Game } from "@/lib/api";
import { formatRelativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export function GameRow({
  game,
  trailing,
}: {
  game: Game;
  /** Right-hand slot; defaults to a status affordance (e.g. Join/Watch). A profile passes the outcome. */
  trailing?: React.ReactNode;
}) {
  const isWaiting = game.status === "WAITING";
  const isActive = game.status === "ACTIVE" || game.status === "PAUSED";
  const whiteOpen = !game.white;
  const blackOpen = !game.black;

  const defaultAction = isWaiting ? (
    <span
      className={cn(
        buttonVariants({ size: "sm", variant: "default" }),
        "font-semibold group-hover:bg-primary-active transition-colors",
      )}
    >
      Join
    </span>
  ) : isActive ? (
    <span
      className={cn(
        buttonVariants({ size: "sm", variant: "secondary" }),
        "font-medium group-hover:bg-accent transition-colors max-sm:hidden",
      )}
    >
      Watch
    </span>
  ) : (
    <span
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "text-muted-foreground group-hover:text-foreground font-medium transition-colors max-sm:hidden",
      )}
    >
      View
    </span>
  );

  return (
    <Link
      href={`/game/${game.id}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="transition-all group-hover:border-hairline-strong group-hover:bg-surface-elevated/30">
        <CardContent className="flex items-center gap-3 sm:gap-4">
          <div className="shrink-0">
            <StatusBadge status={game.status} />
          </div>

          <span className="flex min-w-0 flex-1 items-baseline gap-x-1.5 text-sm sm:gap-x-2 sm:flex-none">
            <span
              className={cn(
                "truncate max-w-[100px] sm:max-w-[160px] md:max-w-none",
                whiteOpen
                  ? "text-muted-foreground italic"
                  : "text-foreground font-medium",
              )}
            >
              {playerLabel(game.white)}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">vs</span>
            <span
              className={cn(
                "truncate max-w-[100px] sm:max-w-[160px] md:max-w-none",
                blackOpen
                  ? "text-muted-foreground italic"
                  : "text-foreground font-medium",
              )}
            >
              {playerLabel(game.black)}
            </span>
          </span>

          <span className="text-muted-foreground font-mono text-xs shrink-0">
            {formatTimeControl(game.initialTimeMs, game.incrementMs)}
          </span>

          <div className="ml-auto flex items-center gap-2.5 sm:gap-3 shrink-0">
            {game.createdAt && (
              <time
                dateTime={game.createdAt}
                title={new Date(game.createdAt).toLocaleString()}
                className="text-muted-foreground text-xs shrink-0"
              >
                {formatRelativeTime(game.createdAt)}
              </time>
            )}

            {trailing !== undefined ? trailing : defaultAction}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

