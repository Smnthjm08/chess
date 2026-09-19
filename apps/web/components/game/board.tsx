"use client";

import { getCheckedSquare, getLegalMoves, isPromotion } from "@repo/game-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { preload } from "react-dom";
import {
  colourOf,
  pieceAsset,
  squareIndex,
  squareName,
  toSquares,
  type Orientation,
} from "@/lib/board";
import { cn } from "@/lib/utils";

const PIECE_NAMES: Record<string, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const PROMOTION_CHOICES = ["q", "r", "b", "n"];

export type MoveIntent = { from: string; to: string; promotion?: string };

/** A background rather than an `<img>`, so dragging moves the square, not the picture. */
function Piece({ piece, className }: { piece: string; className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none relative bg-contain bg-center bg-no-repeat",
        className,
      )}
      style={{ backgroundImage: `url(${pieceAsset(piece)})` }}
    />
  );
}

function describe(square: string, piece: string | null): string {
  if (!piece) return `${square}, empty`;

  return `${square}, ${colourOf(piece)} ${PIECE_NAMES[piece.toLowerCase()]}`;
}

const ARROW_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -8,
  ArrowDown: 8,
};

export function Board({
  fen,
  orientation = "white",
  side = orientation,
  selectable = false,
  lastMove,
  onMove,
}: {
  fen: string;
  orientation?: Orientation;
  /** The colour whose pieces can be picked up; differs from `orientation` once flipped. */
  side?: Orientation;
  /** False for spectators, finished games, and while it is not your turn. */
  selectable?: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove?: (move: MoveIntent) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<MoveIntent | null>(null);
  const [cursor, setCursor] = useState(0);

  const dragFrom = useRef<string | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  // A new position — or losing the right to move — voids anything in flight.
  useEffect(() => {
    setSelected(null);
    setPending(null);
  }, [fen, selectable]);

  const squares = useMemo(() => toSquares(fen), [fen]);

  // Backgrounds are only fetched once styles apply; hoisting them into the
  // document head keeps the pieces from popping in after the board.
  for (const piece of new Set(squares)) {
    if (piece) preload(pieceAsset(piece), { as: "image" });
  }

  const checked = useMemo(() => getCheckedSquare(fen), [fen]);
  const targets = useMemo(
    () => new Set(selected ? getLegalMoves(fen, selected) : []),
    [fen, selected],
  );

  const ordered = orientation === "black" ? [...squares].reverse() : squares;

  function attempt(from: string, to: string) {
    // The picker sends the move; until a piece is chosen there is no move.
    if (isPromotion(fen, from, to)) {
      setSelected(from);
      setPending({ from, to });
      return;
    }

    setSelected(null);
    onMove?.({ from, to });
  }

  function handleSquare(square: string, piece: string | null) {
    if (!selectable || pending) return;

    const isOwn = piece !== null && colourOf(piece) === side;

    if (selected === null) {
      if (isOwn) setSelected(square);
      return;
    }

    if (targets.has(square)) {
      attempt(selected, square);
      return;
    }

    setSelected(isOwn ? square : null);
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const step = ARROW_STEPS[event.key];

    if (step === undefined) return;

    // Claimed as soon as it is recognised: an arrow at the edge must not fall
    // through and scroll the page instead.
    event.preventDefault();

    const next = index + step;
    const sameRank = Math.floor(next / 8) === Math.floor(index / 8);

    if (next < 0 || next > 63) return;
    if (Math.abs(step) === 1 && !sameRank) return;

    setCursor(next);
    cells.current[next]?.focus();
  }

  function handleDragStart(event: React.DragEvent, square: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", square);
    dragFrom.current = square;
    setSelected(square);
    setPending(null);
  }

  return (
    <div className="relative w-full">
      <div className="border-hairline grid aspect-square w-full grid-cols-8 overflow-hidden rounded-xl border">
        {ordered.map((piece, index) => {
          const rank = Math.floor(index / 8);
          const file = index % 8;
          const isLight = (rank + file) % 2 === 0;
          const name = squareName(index, orientation);

          const isOwn = piece !== null && colourOf(piece) === side;
          const isTarget = targets.has(name);
          const canDrag = selectable && isOwn && !pending;

          return (
            <button
              key={name}
              ref={(node) => {
                cells.current[index] = node;
              }}
              type="button"
              aria-label={describe(name, piece)}
              aria-disabled={!selectable}
              aria-pressed={selectable && isOwn ? selected === name : undefined}
              tabIndex={cursor === index ? 0 : -1}
              draggable={canDrag}
              className={cn(
                "relative flex items-center justify-center",
                "focus-visible:ring-ring focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
                isLight ? "bg-board-light" : "bg-board-dark",
                selectable && (isOwn || isTarget) && "cursor-pointer",
                selected === name && "ring-primary z-10 ring-3 ring-inset",
              )}
              onClick={() => handleSquare(name, piece)}
              onFocus={() => setCursor(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              onDragStart={(event) => handleDragStart(event, name)}
              onDragEnd={() => {
                dragFrom.current = null;
              }}
              onDragOver={(event) => {
                if (isTarget) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();

                const from = dragFrom.current;
                dragFrom.current = null;

                if (from && targets.has(name)) attempt(from, name);
              }}
            >
              {(lastMove?.from === name || lastMove?.to === name) && (
                <span className="bg-primary/20 pointer-events-none absolute inset-0" />
              )}

              {checked === name && (
                <span className="bg-destructive/40 pointer-events-none absolute inset-0" />
              )}

              {piece && <Piece piece={piece} className="size-full" />}

              {isTarget &&
                (piece ? (
                  <span className="border-board-hint pointer-events-none absolute inset-[7%] rounded-full border-4" />
                ) : (
                  <span className="bg-board-hint pointer-events-none absolute size-[28%] rounded-full" />
                ))}
            </button>
          );
        })}
      </div>

      {pending && (
        <PromotionPicker
          to={pending.to}
          orientation={orientation}
          side={side}
          onCancel={() => {
            setPending(null);
            setSelected(null);
          }}
          onChoose={(promotion) => {
            setPending(null);
            setSelected(null);
            onMove?.({ ...pending, promotion });
          }}
        />
      )}
    </div>
  );
}

/**
 * A column of four pieces hanging off the promotion square, folded back toward
 * the middle when the square is on the near half so the strip stays on board.
 */
function PromotionPicker({
  to,
  orientation,
  side,
  onChoose,
  onCancel,
}: {
  to: string;
  orientation: Orientation;
  side: Orientation;
  onChoose: (promotion: string) => void;
  onCancel: () => void;
}) {
  const index = squareIndex(to, orientation);
  const row = Math.floor(index / 8);
  const file = index % 8;
  const downward = row <= 3;
  const choices = downward
    ? PROMOTION_CHOICES
    : [...PROMOTION_CHOICES].reverse();

  return (
    <div className="absolute inset-0 z-30">
      <button
        type="button"
        aria-label="Cancel promotion"
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={onCancel}
      />

      <div
        className="border-hairline bg-popover absolute flex flex-col overflow-hidden rounded-lg border shadow-lg"
        style={{
          left: `${file * 12.5}%`,
          top: `${(downward ? row : row - 3) * 12.5}%`,
          width: "12.5%",
          height: "50%",
        }}
      >
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            aria-label={`Promote to ${PIECE_NAMES[choice]}`}
            className="hover:bg-accent flex flex-1 cursor-pointer items-center justify-center"
            onClick={() => onChoose(choice)}
          >
            <Piece
              piece={side === "white" ? choice.toUpperCase() : choice}
              className="size-[90%]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
