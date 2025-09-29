import { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";

export type BoardCell = {
  square: Square;
  type: PieceSymbol;
  color: Color;
} | null;

type Board = BoardCell[][];

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
          {row.map((square, j) => (
            <div
              key={`${i}-${j}`}
              onClick={() => {
                if (!from) {
                  setFrom(square?.square ?? null);
                } else {
                  const target = square?.square ?? null;
                  if (from && target && from !== target) {
                    socket.send(
                      JSON.stringify({
                        type: "move",
                        move: { from, to: target },
                      }),
                    );
                  }
                  setFrom(null);
                }
              }}
              className={`w-[72px] h-[72px] flex items-center justify-center text-black
                ${(i + j) % 2 === 0 ? "bg-emerald-700" : "bg-amber-100"}
                cursor-pointer`}
            >
              {square ? square.type : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ${from === square?.square ? "ring-4 ring-yellow-400" : ""}
