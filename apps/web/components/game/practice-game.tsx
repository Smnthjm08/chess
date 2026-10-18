"use client";

import {
  createEngine,
  getActiveTurn,
  getOutcome,
  START_FEN,
  tryMove,
} from "@repo/game-core";
import { ArrowUpDown, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Board, type MoveIntent } from "@/components/game/board";
import { Material } from "@/components/game/material";
import { MoveTable } from "@/components/game/move-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Move } from "@/lib/api";
import type { Orientation } from "@/lib/board";
import { materialOf } from "@/lib/material";
import { RESULT_TEXT } from "@/lib/result";
import { positionAt, toRows } from "@/lib/review";
import { moveSound, playSound } from "@/lib/sound";

const SIDE: Record<Orientation, string> = { white: "White", black: "Black" };

/** Both sides on one board, nothing sent anywhere. */
export function PracticeGame() {
  const [moves, setMoves] = useState<Move[]>([]);
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("white");

  const fen = moves.at(-1)?.fen ?? START_FEN;
  const turn = getActiveTurn(fen);

  // Replayed rather than loaded from `fen`, so repetition is counted.
  const outcome = useMemo(() => {
    const engine = createEngine();

    for (const move of moves) {
      engine.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? undefined,
      });
    }

    return getOutcome(engine);
  }, [moves]);

  const reviewing = reviewPly !== null && reviewPly < moves.length;
  const shown = reviewing
    ? positionAt(moves, reviewPly)
    : positionAt(moves, moves.length);
  const material = materialOf(shown.fen);
  const rows = useMemo(() => toRows(moves), [moves]);

  useEffect(() => {
    if (outcome.isGameOver) playSound("end");
  }, [outcome.isGameOver]);

  function handleMove(intent: MoveIntent) {
    const result = tryMove(createEngine(fen), intent);

    if (!result) return;

    playSound(moveSound(result.san));
    setMoves((list) => [
      ...list,
      {
        id: String(list.length + 1),
        moveNumber: list.length + 1,
        san: result.san,
        fen: result.fen,
        from: result.from,
        to: result.to,
        promotion: result.promotion ?? null,
        clockMs: null,
      },
    ]);
  }

  const status = outcome.isGameOver
    ? `${outcome.result ? RESULT_TEXT[outcome.result] : "Game over"} — ${
        outcome.winner ? `${SIDE[outcome.winner]} wins` : "draw"
      }`
    : `${SIDE[turn]} to move`;

  const playerRow = (side: Orientation) => (
    <p className="flex items-center gap-2 px-1 text-sm font-medium">
      {SIDE[side]}
      <Material material={material[side]} />
    </p>
  );

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:py-12">
      <div className="mx-auto w-full max-w-[max(18rem,calc(100svh-15rem))] space-y-3 lg:max-w-none">
        {playerRow(orientation === "white" ? "black" : "white")}
        <Board
          fen={shown.fen}
          orientation={orientation}
          side={turn}
          selectable={!reviewing && !outcome.isGameOver}
          lastMove={shown.lastMove}
          onMove={handleMove}
        />
        {playerRow(orientation)}
      </div>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm" aria-live="polite">
              {status}
            </p>
            <p className="text-muted-foreground text-xs">
              You play both sides. Nothing is saved.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={moves.length === 0}
                onClick={() => {
                  setMoves((list) => list.slice(0, -1));
                  setReviewPly(null);
                }}
              >
                <Undo2 /> Undo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setOrientation((side) =>
                    side === "white" ? "black" : "white",
                  )
                }
              >
                <ArrowUpDown /> Flip
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={moves.length === 0}
                onClick={() => {
                  setMoves([]);
                  setReviewPly(null);
                }}
              >
                <RotateCcw /> New game
              </Button>
            </div>
            {reviewing && (
              <button
                type="button"
                className="text-muted-foreground cursor-pointer text-xs underline underline-offset-2"
                onClick={() => setReviewPly(null)}
              >
                Back to the current position
              </button>
            )}
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
                <MoveTable
                  rows={rows}
                  current={reviewing ? reviewPly : moves.length}
                  onSelect={(ply) =>
                    setReviewPly(ply >= moves.length ? null : ply)
                  }
                />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
