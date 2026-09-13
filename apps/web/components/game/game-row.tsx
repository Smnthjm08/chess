import { formatTimeControl } from "@repo/game-core";
import Link from "next/link";
import { StatusBadge } from "@/components/game/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { playerLabel, type Game } from "@/lib/api";

export function GameRow({
  game,
  trailing,
}: {
  game: Game;
  /** Right-hand slot; the lobby shows the id, a profile shows the outcome. */
  trailing?: React.ReactNode;
}) {
  return (
    <Link href={`/game/${game.id}`} className="block">
      <Card className="hover:border-hairline-strong transition-colors">
        <CardContent className="flex items-center gap-3 sm:gap-4">
          <StatusBadge status={game.status} />

          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm sm:flex-none">
            <span className="truncate">{playerLabel(game.white)}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="truncate">{playerLabel(game.black)}</span>
          </span>

          <span className="text-muted-foreground font-mono text-xs">
            {formatTimeControl(game.initialTimeMs, game.incrementMs)}
          </span>

          {trailing ? (
            <div className="sm:ml-auto">{trailing}</div>
          ) : (
            <code className="text-muted-foreground ml-auto font-mono text-xs max-sm:hidden">
              {game.id.slice(0, 8)}
            </code>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
