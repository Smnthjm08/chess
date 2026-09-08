"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Board } from "@/components/game/board";
import { GameSeat } from "@/components/game/game-seat";
import { StatusBadge } from "@/components/game/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  playerLabel,
  type GameDetail,
  type GameResult,
  type GameStatus,
  type Move,
} from "@/lib/api";
import { useGameSocket, type ConnectionStatus } from "@/lib/game-socket";

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Pairs the flat move list into numbered white/black rows. */
function toRows(moves: Move[]) {
  const rows: { number: number; white?: string; black?: string }[] = [];

  for (const move of moves) {
    const index = Math.floor((move.moveNumber - 1) / 2);
    const row = (rows[index] ??= { number: index + 1 });

    if (move.moveNumber % 2 === 1) row.white = move.san;
    else row.black = move.san;
  }

  return rows;
}

const RESULT_TEXT: Record<GameResult, string> = {
  CHECKMATE: "Checkmate",
  RESIGNATION: "Resignation",
  TIMEOUT: "Out of time",
  STALEMATE: "Stalemate",
  THREEFOLD_REPETITION: "Threefold repetition",
  INSUFFICIENT_MATERIAL: "Insufficient material",
  FIFTY_MOVE_RULE: "Fifty-move rule",
  DRAW_AGREED: "Draw agreed",
  ABANDONED: "Abandoned",
};

function ConnectionNote({ status }: { status: ConnectionStatus }) {
  if (status === "open" || status === "idle") return null;

  return (
    <p className="text-muted-foreground text-xs">
      {status === "closed"
        ? "This game is open in another tab — moves will not appear here."
        : "Reconnecting…"}
    </p>
  );
}

function PlayerRow({
  label,
  name,
  clock,
  onMove,
}: {
  label: string;
  name: string;
  clock: number;
  onMove: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-muted-foreground text-xs tracking-wider uppercase">
          {label}
        </p>
        <p className="text-sm font-medium">{name}</p>
      </div>
      <span
        className={
          onMove
            ? "font-mono text-lg tabular-nums"
            : "text-muted-foreground font-mono text-lg tabular-nums"
        }
      >
        {formatClock(clock)}
      </span>
    </div>
  );
}

export function LiveGame({
  initialGame,
  viewerId,
}: {
  initialGame: GameDetail;
  viewerId: string | null;
}) {
  const router = useRouter();

  const onSync = useCallback(() => router.refresh(), [router]);

  const { state, status } = useGameSocket({
    gameId: initialGame.id,
    // The upgrade needs a session; a signed-out visitor reads the static page.
    enabled: Boolean(viewerId),
    onSync,
  });

  // `game:state` is authoritative for everything it carries. Player names are
  // not among them, so those stay on the server-rendered game until a refresh.
  const game = state
    ? {
        ...initialGame,
        fen: state.fen,
        status: state.status as GameStatus,
        result: state.result as GameResult | null,
        whiteId: state.whiteId,
        blackId: state.blackId,
        whiteTimeMs: state.whiteTimeMs,
        blackTimeMs: state.blackTimeMs,
      }
    : initialGame;

  const orientation = state?.role === "black" ? "black" : "white";
  const turn = state?.turn ?? null;
  const live = game.status === "ACTIVE";
  const rows = toRows(initialGame.moves);

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Board fen={game.fen} orientation={orientation} />

      <aside className="space-y-4">
        <GameSeat game={game} viewerId={viewerId} />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Players</CardTitle>
            <StatusBadge status={game.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerRow
              label="Black"
              name={playerLabel(game.black)}
              clock={game.blackTimeMs}
              onMove={live && turn === "black"}
            />
            <Separator />
            <PlayerRow
              label="White"
              name={playerLabel(game.white)}
              clock={game.whiteTimeMs}
              onMove={live && turn === "white"}
            />

            {game.result && (
              <p className="text-muted-foreground text-sm">
                {RESULT_TEXT[game.result]}
              </p>
            )}

            <ConnectionNote status={status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moves</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No moves played yet.
              </p>
            ) : (
              <ScrollArea className="h-64">
                <ol className="space-y-1 font-mono text-sm">
                  {rows.map((row) => (
                    <li key={row.number} className="flex gap-3">
                      <span className="text-muted-foreground w-6 text-right">
                        {row.number}.
                      </span>
                      <span className="w-16">{row.white}</span>
                      <span className="w-16">{row.black}</span>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
