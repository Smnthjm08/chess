"use client";

import {
  type ClientMessage,
  createEngine,
  EventType,
  formatTimeControl,
  getActiveTurn,
  getOutcome,
  tryMove,
} from "@repo/game-core";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Board, type MoveIntent } from "@/components/game/board";
import { CopyFen } from "@/components/game/copy-fen";
import { ForkGame } from "@/components/game/fork-game";
import { ExportPgn } from "@/components/game/export-pgn";
import { GameControls, type GameAction } from "@/components/game/game-controls";
import { GameResultDialog } from "@/components/game/game-result";
import { GameSeat } from "@/components/game/game-seat";
import { Material } from "@/components/game/material";
import { Button } from "@/components/ui/button";
import {
  MoveStrip,
  MoveTable,
  ReviewControls,
} from "@/components/game/move-list";
import { StatusBadge } from "@/components/game/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  playerLabel,
  type GameDetail,
  type GameResult,
  type GameStatus,
} from "@/lib/api";
import {
  clockAt,
  clockUrgency,
  formatClock,
  useClock,
  type ClockBaseline,
} from "@/lib/clock";
import { useGameSocket, type ConnectionStatus } from "@/lib/game-socket";
import { materialOf, type SideMaterial } from "@/lib/material";
import { resultSummary } from "@/lib/result";
import {
  plyLabel,
  positionAt,
  REVIEW_KEYS,
  stepPly,
  timeSpent,
  toRows,
  type ReviewKey,
} from "@/lib/review";
import { cn } from "@/lib/utils";

function actionMessage(action: GameAction, gameId: string): ClientMessage {
  switch (action) {
    case "resign":
      return { type: EventType.GAME_RESIGN, gameId };
    case "draw:offer":
      return { type: EventType.GAME_DRAW_OFFER, gameId };
    case "draw:accept":
      return { type: EventType.GAME_DRAW_ACCEPT, gameId };
    case "draw:decline":
      return { type: EventType.GAME_DRAW_DECLINE, gameId };
    case "pause":
      return { type: EventType.GAME_PAUSE, gameId };
    case "resume":
      return { type: EventType.GAME_RESUME, gameId };
    case "rematch:offer":
      return { type: EventType.GAME_REMATCH_OFFER, gameId };
    case "rematch:accept":
      return { type: EventType.GAME_REMATCH_ACCEPT, gameId };
    case "rematch:decline":
      return { type: EventType.GAME_REMATCH_DECLINE, gameId };
  }
}

function ConnectionNote({ status }: { status: ConnectionStatus }) {
  if (status === "open") return null;

  return (
    <p className="text-muted-foreground text-xs">
      {status === "closed"
        ? "This game is open in another tab — moves will not appear here."
        : "Reconnecting…"}
    </p>
  );
}

const URGENCY_CLASS = {
  urgent: "text-destructive",
  low: "text-warning",
  normal: "",
} as const;

function PlayerRow({
  label,
  name,
  clock,
  onMove,
  live,
  material,
}: {
  label: string;
  name: string;
  clock: number;
  onMove: boolean;
  live: boolean;
  material: SideMaterial;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs tracking-wider uppercase">
          {label}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
          {name}
          <Material material={material} />
        </p>
      </div>
      <span
        className={cn(
          "font-mono text-lg tabular-nums",
          onMove ? "" : "text-muted-foreground",
          live && URGENCY_CLASS[clockUrgency(clock)],
        )}
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

  const {
    state,
    status,
    error,
    notice,
    drawOffer,
    rematchOffer,
    rematchGameId,
    lastMove: playedMove,
    send,
  } = useGameSocket({
    gameId: initialGame.id,
    viewerId,
    onSync,
  });

  const role = state?.role ?? "spectator";
  const playing = role === "white" || role === "black";

  const [optimistic, setOptimistic] = useState<{
    fen: string;
    from: string;
    to: string;
    whiteTimeMs: number;
    blackTimeMs: number;
    anchor: number;
  } | null>(null);

  // Every `game:state` is authoritative — the local position only ever stands
  // in for the round trip, so any state that lands supersedes it.
  useEffect(() => {
    setOptimistic(null);
  }, [state]);

  // A rejected move never happened; give the board back the last position the
  // server confirmed.
  useEffect(() => {
    if (!error) return;

    setOptimistic(null);
    toast.error(error.message);
  }, [error]);

  // A resignation or an accepted draw ends the game before the `game:state`
  // carrying FINISHED lands, and the board must not stay playable in between.
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!notice) return;

    // These are broadcast to the whole room, spectators included, and every
    // second-person phrasing below is a lie to anyone who is not playing.
    const mine = notice.userId === viewerId;

    switch (notice.event) {
      case EventType.GAME_RESIGN:
        setEnded(true);
        toast(
          !playing
            ? "The game ended by resignation."
            : mine
              ? "You resigned."
              : "Your opponent resigned.",
        );
        break;

      case EventType.GAME_DRAW_ACCEPT:
        setEnded(true);
        toast(
          !playing
            ? "The players agreed a draw."
            : mine
              ? "You accepted the draw."
              : "Your draw offer was accepted.",
        );
        break;

      // A declined offer is between the two players; a spectator has no
      // standing offer of their own to hear about.
      case EventType.GAME_DRAW_DECLINE:
        if (!playing) break;

        toast(
          mine
            ? "You declined the draw offer."
            : "Your draw offer was declined.",
        );
        break;

      case EventType.GAME_REMATCH_DECLINE:
        if (!playing) break;

        toast(
          mine
            ? "You declined the rematch."
            : "Your rematch offer was declined.",
        );
        break;
    }
  }, [notice, viewerId, playing]);

  // An accepted rematch is a different game. Only the two players are taken to
  // it — a spectator stays with the board they were watching.
  useEffect(() => {
    if (!rematchGameId || !playing) return;

    router.push(`/game/${rematchGameId}`);
  }, [rematchGameId, playing, router]);

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
        winnerId: state.winnerId,
      }
    : initialGame;

  const moves = initialGame.moves;
  const startFen = initialGame.startFen;
  // Null follows the game as it is played; a number pins the board to that ply.
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const reviewing = reviewPly !== null && reviewPly < moves.length;
  const currentPly = reviewing ? reviewPly : moves.length;
  const reviewed = reviewing ? positionAt(moves, reviewPly, startFen) : null;

  const [flipped, setFlipped] = useState(false);

  const selectPly = useCallback(
    (ply: number) => setReviewPly(ply >= moves.length ? null : ply),
    [moves.length],
  );

  const step = useCallback(
    (key: ReviewKey) => selectPly(stepPly(key, currentPly, moves.length)),
    [selectPly, currentPly, moves.length],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = REVIEW_KEYS[event.key];
      const flip = event.key === "f";
      const target = event.target as HTMLElement | null;

      // The board claims arrows for its own square cursor.
      if ((!key && !flip) || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;

      event.preventDefault();
      if (key) step(key);
      else setFlipped((value) => !value);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  const fen = optimistic?.fen ?? game.fen;
  const seat = state?.role === "black" ? "black" : "white";
  const orientation = flipped ? (seat === "white" ? "black" : "white") : seat;
  // Read off the displayed position rather than `state.turn`, so an optimistic
  // move hands the move over immediately and the board locks behind it.
  const turn = getActiveTurn(fen);
  const shownFen = reviewed?.fen ?? fen;
  const live = game.status === "ACTIVE" && !ended;
  const rows = useMemo(
    () =>
      toRows(
        moves,
        timeSpent(
          moves,
          initialGame.initialTimeMs,
          initialGame.incrementMs,
          startFen,
        ),
        startFen,
      ),
    [moves, initialGame.initialTimeMs, initialGame.incrementMs, startFen],
  );

  const finished = game.status === "FINISHED";
  const material = useMemo(() => materialOf(shownFen), [shownFen]);
  // There is nothing to play on from a mate or a stalemate.
  const forkable = useMemo(
    () => !getOutcome(createEngine(shownFen)).isGameOver,
    [shownFen],
  );

  // Only announce a result the viewer watched arrive. Opening a game that was
  // already over is a review, and a modal over it is just in the way.
  const finishedOnArrival = useRef(initialGame.status === "FINISHED");
  const [resultSeen, setResultSeen] = useState(false);

  // `playedMove` arrives with the broadcast; the move list is refetched, so
  // falling back to it only matters before the first socket move lands.
  const persisted = moves.at(-1);
  const lastMove =
    optimistic ??
    playedMove ??
    (persisted ? { from: persisted.from, to: persisted.to } : null);

  // Anchored on the values themselves rather than the message, so a state that
  // repeats the clock keeps counting from its first reading instead of quietly
  // handing back the milliseconds already spent.
  const authoritative = useMemo<ClockBaseline>(
    () => ({
      whiteTimeMs: game.whiteTimeMs,
      blackTimeMs: game.blackTimeMs,
      turn: getActiveTurn(game.fen),
      running: game.status === "ACTIVE",
      anchor: Date.now(),
    }),
    [game.whiteTimeMs, game.blackTimeMs, game.fen, game.status],
  );

  // An optimistic move presses the clock locally too — otherwise the mover's
  // display jumps back up to its last authoritative reading for the length of
  // the round trip.
  const baseline = useMemo<ClockBaseline>(
    () =>
      optimistic
        ? {
            whiteTimeMs: optimistic.whiteTimeMs,
            blackTimeMs: optimistic.blackTimeMs,
            turn: getActiveTurn(optimistic.fen),
            running: authoritative.running,
            anchor: optimistic.anchor,
          }
        : authoritative,
    [optimistic, authoritative],
  );

  const clock = useClock(baseline);

  const handleMove = useCallback(
    (move: MoveIntent) => {
      const result = tryMove(createEngine(fen), move);

      // The board only offers legal moves; a miss means the position moved
      // under it, and the server would reject it anyway.
      if (!result) return;

      const sent = send({
        type: EventType.GAME_MOVE,
        gameId: initialGame.id,
        data: move,
      });

      if (!sent) {
        toast.error("Not connected — your move was not sent.");
        return;
      }

      const at = Date.now();

      setOptimistic({
        fen: result.fen,
        from: result.from,
        to: result.to,
        ...clockAt(baseline, at),
        anchor: at,
      });
    },
    [fen, send, initialGame.id, baseline],
  );

  const handleAction = useCallback(
    (action: GameAction) => {
      if (!send(actionMessage(action, initialGame.id))) {
        toast.error("Not connected — try again in a moment.");
      }
    },
    [send, initialGame.id],
  );

  const playerRow = (side: "white" | "black") => (
    <PlayerRow
      label={side === "white" ? "White" : "Black"}
      name={playerLabel(side === "white" ? game.white : game.black)}
      clock={side === "white" ? clock.whiteTimeMs : clock.blackTimeMs}
      onMove={live && turn === side}
      live={live}
      material={material[side]}
    />
  );

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:py-12">
      {/* Below lg the clocks sit on the board's edges, and the board is capped
          by the viewport height so both stay on screen. */}
      <div className="mx-auto w-full max-w-[max(18rem,calc(100svh-15rem))] space-y-3 lg:max-w-none lg:space-y-0">
        <div className="space-y-1 px-1 lg:hidden">
          <ConnectionNote status={status} />
          {playerRow(orientation === "white" ? "black" : "white")}
        </div>

        <Board
          fen={shownFen}
          orientation={orientation}
          side={seat}
          selectable={
            !reviewing &&
            state?.role === turn &&
            live &&
            status === "open" &&
            !optimistic
          }
          lastMove={reviewed ? reviewed.lastMove : lastMove}
          onMove={handleMove}
        />

        <div className="flex min-h-8 items-center justify-between gap-2 px-1 lg:mt-3">
          <p className="text-muted-foreground truncate text-xs">
            {reviewing && (
              <>
                Viewing {plyLabel(moves, reviewPly, startFen)}
                {live && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="text-foreground cursor-pointer underline underline-offset-2"
                      onClick={() => setReviewPly(null)}
                    >
                      back to live
                    </button>
                  </>
                )}
              </>
            )}
            {!reviewing && initialGame.forkedFromId && (
              <Link
                href={`/game/${initialGame.forkedFromId}`}
                className="hover:text-foreground underline underline-offset-2"
              >
                Forked from an earlier game
              </Link>
            )}
          </p>
          <div className="flex items-center gap-1">
            {finished && (
              <ForkGame
                gameId={initialGame.id}
                ply={currentPly}
                disabled={!forkable}
              />
            )}
            <CopyFen fen={shownFen} />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Flip board"
              aria-pressed={flipped}
              title="Flip board (F)"
              onClick={() => setFlipped((value) => !value)}
            >
              <ArrowUpDown />
            </Button>
            <ReviewControls
              current={currentPly}
              total={moves.length}
              onStep={step}
            />
          </div>
        </div>

        <div className="space-y-3 px-1 lg:hidden">
          {playerRow(orientation)}
          <MoveStrip rows={rows} current={currentPly} onSelect={selectPly} />
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <StatusBadge status={game.status} />
            <span className="font-mono">
              {formatTimeControl(game.initialTimeMs, game.incrementMs)}
            </span>
            {game.result && <span>{resultSummary(game)}</span>}
            <ExportPgn game={game} className="ml-auto" />
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <GameSeat game={game} viewerId={viewerId} />

        <Card className="max-lg:hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Players</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs">
                {formatTimeControl(game.initialTimeMs, game.incrementMs)}
              </span>
              <StatusBadge status={game.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {playerRow("black")}
            <Separator />
            {playerRow("white")}

            {game.result && (
              <p className="text-muted-foreground text-sm">
                {resultSummary(game)}
              </p>
            )}

            <ConnectionNote status={status} />
          </CardContent>
        </Card>

        <GameControls
          role={role}
          turn={turn}
          status={ended ? "FINISHED" : game.status}
          drawOffer={drawOffer}
          rematchOffer={rematchOffer}
          viewerId={viewerId}
          connected={status === "open"}
          onAction={handleAction}
          className="max-lg:order-first"
        />

        <Card className="max-lg:hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Moves</CardTitle>
            <ExportPgn game={game} />
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No moves played yet.
              </p>
            ) : (
              <ScrollArea className="h-64">
                <MoveTable
                  rows={rows}
                  current={currentPly}
                  onSelect={selectPly}
                />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </aside>

      <GameResultDialog
        game={game}
        viewerId={viewerId}
        open={finished && !finishedOnArrival.current && !resultSeen}
        onOpenChange={(next: boolean) => {
          if (!next) setResultSeen(true);
        }}
        onRematch={playing ? () => handleAction("rematch:offer") : undefined}
      />
    </main>
  );
}
