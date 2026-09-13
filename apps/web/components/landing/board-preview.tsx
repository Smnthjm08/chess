import { Board } from "@/components/game/board";
import { cn } from "@/lib/utils";

// The Italian Game after 3...Bc5, white to move.
const FEN =
  "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"];

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
      <p className="text-caption-upper text-muted-foreground uppercase">
        {side}
      </p>
      <span
        className={cn(
          "font-mono text-lg tabular-nums",
          onMove ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {clock}
      </span>
    </div>
  );
}

export function BoardPreview() {
  return (
    <figure className="border-hairline bg-card rounded-xl border p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="bg-surface-elevated text-caption rounded-4xl px-3 py-1">
          3+2 · Blitz
        </span>
        <span className="text-muted-foreground text-caption flex items-center gap-2">
          <span className="bg-success size-2 rounded-full" />
          Live
        </span>
      </div>

      <div className="space-y-3">
        <Seat side="Black" clock="2:55" onMove={false} />
        {/* Decorative: the real board is keyboard- and screen-reader-navigable,
            which would drop 64 squares into the landing page's tab order. */}
        <div inert aria-hidden>
          <Board fen={FEN} lastMove={{ from: "f8", to: "c5" }} />
        </div>
        <Seat side="White" clock="2:48" onMove />
      </div>

      <figcaption className="border-hairline text-muted-foreground mt-4 border-t pt-4 font-mono text-sm">
        {MOVES.map((san, i) => (
          <span key={i}>
            {i % 2 === 0 && (
              <span className="text-muted-soft">{i / 2 + 1}. </span>
            )}
            <span className={i === MOVES.length - 1 ? "text-foreground" : ""}>
              {san}
            </span>{" "}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
