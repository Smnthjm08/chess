// game.ts
import { Chess, Color } from "chess.js";
import { WebSocket } from "ws";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages";

export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  private board: Chess;
  private moves: string[];
  private startTime: Date;

  constructor(player1: WebSocket, player2: WebSocket) {
    this.player1 = player1;
    this.player2 = player2;
    this.board = new Chess();
    this.moves = [];
    this.startTime = new Date();
    this.player1.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "white",
        },
      }),
    );
    this.player2.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "black",
        },
      }),
    );
  }

  makeMove(socket: WebSocket, move: { from: string; to: string }) {
    const currentTurn = this.board.turn(); // "w" or "b"
    const isWhite = socket === this.player1;

    // 1. Enforce turn order
    if ((currentTurn === "w" && !isWhite) || (currentTurn === "b" && isWhite)) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Not your turn",
        }),
      );
      return;
    }

    // 2. Validate piece ownership (optional but recommended)
    // @ts-ignore
    const piece = this.board.get(move.from);
    if (!piece) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "No piece at source square",
        })
      );
      return;
    }

    if ((isWhite && piece.color !== "w") || (!isWhite && piece.color !== "b")) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Cannot move opponent's piece",
        })
      );
      return;
    }

    console.log(
      "=============move=============",
      move,
      "\nmoves\n",
      this.moves
    );

    // 3. Attempt the move
    const result = this.board.move(move);
    if (!result) {
      console.error(`Invalid move attempted: ${JSON.stringify(move)}`);
      socket.send(JSON.stringify({ type: "error", message: "Invalid move" }));
      return;
    }

    const payload = {
      type: MOVE,
      payload: {
        move,
        fen: this.board.fen(),
        history: this.board.history(),
      },
    };

    this.player1.send(JSON.stringify(payload));
    this.player2.send(JSON.stringify(payload));

    // 4. Check if the game is over
    if (this.board.isGameOver()) {
      let winner: "white" | "black" | "draw";

      if (this.board.isDraw() || this.board.isStalemate()) {
        winner = "draw";
      } else if (this.board.isCheckmate()) {
        // If checkmate, the player who just moved wins
        // currentTurn is now the OTHER player (who has no moves)
        winner = currentTurn === "w" ? "black" : "white";
      } else {
        winner = "draw"; // Fallback
      }

      const endPayload = {
        type: "game_over",
        payload: { winner },
      };

      this.player1.send(JSON.stringify(endPayload));
      this.player2.send(JSON.stringify(endPayload));
    }
  }
}
