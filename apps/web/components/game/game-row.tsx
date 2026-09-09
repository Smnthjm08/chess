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
        <CardContent className="flex items-center gap-4">
          <StatusBadge status={game.status} />

          <span className="text-sm">
            {playerLabel(game.white)}
            <span className="text-muted-foreground px-2">vs</span>
            {playerLabel(game.black)}
          </span>

          <div className="ml-auto">
            {trailing ?? (
              <code className="text-muted-foreground font-mono text-xs">
                {game.id.slice(0, 8)}
              </code>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
