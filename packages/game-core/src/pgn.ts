/**
 * PGN export. Built by hand from the stored SAN list rather than replayed
 * through chess.js — every SAN in the database was produced by a legal move on
 * the way in, so there is nothing left to validate.
 */

export type PgnResult = "1-0" | "0-1" | "1/2-1/2" | "*";

export type PgnTags = {
  event?: string;
  site?: string;
  /** Rendered in UTC so the same game exports identically everywhere. */
  date?: Date;
  round?: string;
  white: string;
  black: string;
  result: PgnResult;
  initialMs?: number;
  incrementMs?: number;
  termination?: string;
};

/** The export standard wraps movetext at 80 columns. */
const LINE_LIMIT = 80;

function tag(name: string, value: string) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `[${name} "${escaped}"]`;
}

function formatDate(date: Date | undefined) {
  if (!date || Number.isNaN(date.getTime())) return "????.??.??";

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${date.getUTCFullYear()}.${month}.${day}`;
}

/**
 * PGN counts the time control in seconds — `180+2`, not the `3+2` minutes
 * notation the interface shows.
 */
function formatPgnTimeControl(initialMs: number, incrementMs: number) {
  return `${Math.round(initialMs / 1000)}+${Math.round(incrementMs / 1000)}`;
}

function formatMovetext(sanMoves: string[], result: PgnResult) {
  // A move number and the move it introduces are one token, so wrapping can
  // never leave the number stranded at the end of a line.
  const tokens = sanMoves.map((san, index) =>
    index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san,
  );

  tokens.push(result);

  const lines: string[] = [];
  let line = "";

  for (const token of tokens) {
    if (line.length === 0) line = token;
    else if (line.length + 1 + token.length <= LINE_LIMIT) line += ` ${token}`;
    else {
      lines.push(line);
      line = token;
    }
  }

  lines.push(line);

  return lines.join("\n");
}

export function toPgn(tags: PgnTags, sanMoves: string[]): string {
  const headers = [
    tag("Event", tags.event ?? "Casual game"),
    tag("Site", tags.site ?? "?"),
    tag("Date", formatDate(tags.date)),
    tag("Round", tags.round ?? "-"),
    tag("White", tags.white),
    tag("Black", tags.black),
    tag("Result", tags.result),
  ];

  if (tags.initialMs !== undefined && tags.incrementMs !== undefined) {
    headers.push(
      tag("TimeControl", formatPgnTimeControl(tags.initialMs, tags.incrementMs)),
    );
  }

  if (tags.termination) headers.push(tag("Termination", tags.termination));

  return `${headers.join("\n")}\n\n${formatMovetext(sanMoves, tags.result)}\n`;
}
