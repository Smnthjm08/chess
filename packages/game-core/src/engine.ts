import {
  Chess,
  DEFAULT_POSITION,
  type PieceSymbol,
  type Square,
} from "chess.js";

export type ChessEngine = Chess;

export type Turn = "white" | "black";

export const START_FEN = DEFAULT_POSITION;

export function createEngine(fen?: string): Chess {
  return new Chess(fen ?? START_FEN);
}

/**
 * The side to move, read straight from the FEN's active-colour field.
 *
 * Compared against the literal `"w"` rather than the `WHITE` constant because
 * `constants.ts` re-exports `START_FEN` from this module, and importing it back
 * would make the two files circular.
 */
export function getActiveTurn(fen: string): Turn {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/**
 * Squares are taken as plain strings because they arrive from the network and
 * from click handlers; chess.js throws on a malformed one, and every helper
 * below answers a question the UI asks constantly, so they fail closed instead.
 */
const SQUARE_PATTERN = /^[a-h][1-8]$/;

/**
 * Destination squares the piece on `from` can legally reach — the client's
 * source of truth for move hints, so it cannot disagree with the server, which
 * validates with `tryMove` out of this same module.
 */
export function getLegalMoves(fen: string, from: string): string[] {
  if (!SQUARE_PATTERN.test(from)) return [];

  try {
    const moves = createEngine(fen).moves({
      square: from as Square,
      verbose: true,
    });

    // A promotion is four moves onto one square; the picker chooses the piece.
    return [...new Set(moves.map((move) => move.to))];
  } catch {
    return [];
  }
}

/**
 * Whether `from`→`to` needs a piece chosen before it can be sent. Asked of the
 * move list rather than of the rank, so a pawn blocked from promoting — or any
 * other piece landing on the back rank — answers false.
 */
export function isPromotion(fen: string, from: string, to: string): boolean {
  if (!SQUARE_PATTERN.test(from) || !SQUARE_PATTERN.test(to)) return false;

  try {
    return createEngine(fen)
      .moves({ square: from as Square, verbose: true })
      .some((move) => move.to === to && move.promotion !== undefined);
  } catch {
    return false;
  }
}

/** The square of the king in check, for the board's check indicator. */
export function getCheckedSquare(fen: string): string | null {
  try {
    const engine = createEngine(fen);

    if (!engine.isCheck()) return null;

    // "k" rather than the KING constant, for the same circular-import reason
    // as `getActiveTurn` above.
    const [square] = engine.findPiece({
      type: "k" as PieceSymbol,
      color: engine.turn(),
    });

    return square ?? null;
  } catch {
    return null;
  }
}

export function tryMove(
  engine: Chess,
  move: { from: string; to: string; promotion?: string },
): {
  fen: string;
  san: string;
  from: string;
  to: string;
  promotion?: string;
} | null {
  try {
    const moveResult = engine.move(move);

    if (!moveResult) return null;

    return {
      fen: engine.fen(),
      san: moveResult.san,
      from: moveResult.from,
      to: moveResult.to,
      promotion: moveResult.promotion,
    };
  } catch {
    return null;
  }
}

export function getOutcome(engine: Chess): {
  isGameOver: boolean;
  result:
    | "CHECKMATE"
    | "STALEMATE"
    | "THREEFOLD_REPETITION"
    | "INSUFFICIENT_MATERIAL"
    | "FIFTY_MOVE_RULE"
    | null;
  winner: "white" | "black" | null;
} {
  if (!engine.isGameOver()) {
    return {
      isGameOver: false,
      result: null,
      winner: null,
    };
  }

  if (engine.isCheckmate()) {
    const winner = engine.turn() === "w" ? "black" : "white";

    return {
      isGameOver: true,
      result: "CHECKMATE",
      winner,
    };
  }

  if (engine.isStalemate()) {
    return {
      isGameOver: true,
      result: "STALEMATE",
      winner: null,
    };
  }

  if (engine.isThreefoldRepetition()) {
    return {
      isGameOver: true,
      result: "THREEFOLD_REPETITION",
      winner: null,
    };
  }

  if (engine.isInsufficientMaterial()) {
    return {
      isGameOver: true,
      result: "INSUFFICIENT_MATERIAL",
      winner: null,
    };
  }

  if (engine.isDrawByFiftyMoves()) {
    return {
      isGameOver: true,
      result: "FIFTY_MOVE_RULE",
      winner: null,
    };
  }

  return {
    isGameOver: true,
    result: null,
    winner: null,
  };
}
