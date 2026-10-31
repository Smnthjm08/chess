"use client";

import { createEngine } from "@repo/game-core";
import { useEffect, useState } from "react";
import { Board } from "@/components/game/board";
import { cn } from "@/lib/utils";

// The Italian Game, played out once on load and left on 3...Bc5.
const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"];

const PLIES = (() => {
  const engine = createEngine();
  const plies = [
    {
      fen: engine.fen(),
      lastMove: null as null | { from: string; to: string },
    },
  ];
  for (const san of MOVES) {
    const { from, to } = engine.move(san);
    plies.push({ fen: engine.fen(), lastMove: { from, to } });
  }
  return plies;
})();

const STEP_MS = 650;

function Seat({
  side,
  clock,
  onMove,
}: {
  side: string;
  clock: string;
  onMove: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-body-sm text-muted-foreground">{side}</p>
      <span
        className={cn(
          "font-mono text-lg tabular-nums transition-colors",
          onMove ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {clock}
      </span>
    </div>
  );
}

export function BoardPreview() {
  // Server render and no-script show the finished position.
  const [ply, setPly] = useState(MOVES.length);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setPly(0);
    const timers = MOVES.map((_, i) =>
      setTimeout(() => setPly(i + 1), 700 + i * STEP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const { fen, lastMove } = PLIES[ply]!;
  const whiteToMove = ply % 2 === 0;

  return (
    <figure className="space-y-3">
      <Seat side="Black" clock="2:55" onMove={!whiteToMove} />
      {/* Decorative: the real board is keyboard- and screen-reader-navigable,
          which would drop 64 squares into the landing page's tab order. */}
      <div inert aria-hidden className="overflow-hidden rounded-lg">
        <Board fen={fen} lastMove={lastMove} />
      </div>
      <Seat side="White" clock="2:48" onMove={whiteToMove} />

      <figcaption className="border-hairline text-muted-foreground flex items-baseline justify-between gap-4 border-t pt-3 text-sm">
        <span className="font-mono">
          {MOVES.map((san, i) => (
            <span
              key={i}
              className={cn(
                "transition-opacity",
                i < ply ? "opacity-100" : "opacity-0",
              )}
            >
              {i % 2 === 0 && (
                <span className="text-muted-soft">{i / 2 + 1}. </span>
              )}
              <span className={i === ply - 1 ? "text-foreground" : ""}>
                {san}
              </span>{" "}
            </span>
          ))}
        </span>
        <span className="shrink-0">Blitz 3+2</span>
      </figcaption>
    </figure>
  );
}
