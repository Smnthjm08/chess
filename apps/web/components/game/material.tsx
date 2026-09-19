import { pieceAsset } from "@/lib/board";
import type { SideMaterial } from "@/lib/material";

const NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
};

function describe({ captured, advantage }: SideMaterial) {
  const counts = new Map<string, number>();
  for (const piece of captured) {
    const name = NAMES[piece.toLowerCase()]!;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const taken = [...counts]
    .map(([name, count]) => (count > 1 ? `${count} ${name}s` : `a ${name}`))
    .join(", ");

  return [taken && `Captured ${taken}`, advantage > 0 && `up ${advantage}`]
    .filter(Boolean)
    .join(", ");
}

/** Captured pieces, like pieces bunched together, then the point lead. */
export function Material({ material }: { material: SideMaterial }) {
  const { captured, advantage } = material;
  if (captured.length === 0 && advantage === 0) return null;

  return (
    <span
      role="img"
      aria-label={describe(material)}
      className="text-muted-foreground inline-flex items-center gap-1 text-xs font-normal tabular-nums"
    >
      <span className="inline-flex items-center" aria-hidden>
        {captured.map((piece, index) => (
          <span
            key={index}
            className={
              index > 0 && captured[index - 1] === piece
                ? "-ml-2 size-4"
                : "size-4"
            }
            style={{
              backgroundImage: `url(${pieceAsset(piece)})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
            }}
          />
        ))}
      </span>
      {advantage > 0 && <span aria-hidden>+{advantage}</span>}
    </span>
  );
}
