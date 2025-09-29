import { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";

export type BoardCell = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

type Board = BoardCell[][];

const pieceSymbols: Record<string, string> = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
};

export default function ChessBoard({
  board,
  socket,
}: {
  board: Board;
  socket: WebSocket;
}) {
  const [from, setFrom] = useState<Square | null>(null);

  return (
    <div>
      {board.map((row, i) => (
        <div key={i} className="flex">
          {row.map((square, j) => {
            // Calculate the actual square coordinate from indices
            // Assuming board[0] is rank 8 (top) and board[7] is rank 1 (bottom)
            // and columns a-h go left to right (j: 0-7)
            const file = String.fromCharCode(97 + j); // 97 is 'a'
            const rank = 8 - i; // Reverse rank (top row is 8)
            const squareName = `${file}${rank}` as Square;
            
            const isSelected = from === squareName;

            return (
              <div
                key={`${i}-${j}`}
                onClick={() => {
                  if (!from) {
                    // Only set 'from' if there's actually a piece
                    if (square) {
                      setFrom(squareName);
                    }
                  } else {
                    console.log("target", squareName, "from", from);
                    
                    if (from !== squareName) {
                      socket.send(
                        JSON.stringify({
                          type: "move",
                          move: { from, to: squareName },
                        })
                      );
                    }
                    setFrom(null);
                  }
                }}
                className={`w-[72px] h-[72px] flex items-center justify-center text-5xl
                  ${(i + j) % 2 === 0 ? "bg-emerald-700" : "bg-amber-100"}
                  ${isSelected ? "ring-4 ring-yellow-400" : ""}
                  cursor-pointer hover:opacity-80 transition-opacity text-black`}
              >
                {square &&
                  pieceSymbols[
                    square.color === "w"
                      ? square.type.toUpperCase()
                      : square.type.toLowerCase()
                  ]}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ${from === square?.square ? "ring-4 ring-yellow-400" : ""}
