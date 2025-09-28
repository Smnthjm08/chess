"use client";

import ChessBoard, { BoardCell } from "@/components/chessboard";
import { Button } from "@/components/ui/button";
import { GAME_OVER, INIT_GAME, MOVE, useSocket } from "@/hooks/use-scoket";
import { Chess } from "chess.js";
import { useEffect, useState } from "react";

export default function Game() {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState<BoardCell[][] | null[][]>(chess.board());

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(message);
      switch (message.type) {
        case INIT_GAME:
          setChess(new Chess());
          setBoard(chess.board());
          console.log("game initialized");
          break;

        case MOVE:
          const move = message.payload.move;
          chess.move(move);
          setBoard(chess.board());
          console.log("move made");
          break;

        case GAME_OVER:
          console.log("game over");
          break;

        default:
          break;
      }
    };
  }, [socket]);

  if (!socket) {
    return (
      <div>
        <div>Connecting....</div>
      </div>
    );
  }

  return (
    <div className="">
      <ChessBoard board={board} socket={socket} />
      <div>Game Page</div>
      <Button
        onClick={() => {
          socket.send(
            JSON.stringify({
              type: INIT_GAME,
            })
          );
        }}
      >
        Join Game
      </Button>
    </div>
  );
}
