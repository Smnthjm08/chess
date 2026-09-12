/** Board geometry and FEN reading — no React, so it can be reasoned about alone. */

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export type Orientation = "white" | "black";

/** Expands the FEN placement field into 64 squares, rank 8 first. */
export function toSquares(fen: string): (string | null)[] {
  const placement = fen.split(" ")[0] ?? "";

  return placement
    .split("/")
    .flatMap((rank) =>
      [...rank].flatMap((char) =>
        /\d/.test(char) ? Array<null>(Number(char)).fill(null) : [char],
      ),
    );
}

export function colourOf(piece: string): Orientation {
  return piece === piece.toUpperCase() ? "white" : "black";
}

/** Board-order index (0 = top-left as drawn) to algebraic name. */
export function squareName(index: number, orientation: Orientation): string {
  const rank = Math.floor(index / 8);
  const file = index % 8;

  return orientation === "black"
    ? `${FILES[7 - file]}${rank + 1}`
    : `${FILES[file]}${8 - rank}`;
}

/** The inverse of `squareName`, for placing an overlay on a named square. */
export function squareIndex(square: string, orientation: Orientation): number {
  const file = FILES.indexOf(square.slice(0, 1));
  const rank = Number(square.slice(1));

  return orientation === "black"
    ? (rank - 1) * 8 + (7 - file)
    : (8 - rank) * 8 + file;
}
