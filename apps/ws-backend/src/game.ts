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
      })
    );
    this.player2.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "black",
        },
      })
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
        })
      );
      return;
    }

    // 2. Attempt the move
    const result = this.board.move(move);
    if (!result) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid move",
        })
      );
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

      if (this.board.isDraw()) {
        winner = "draw";
      } else {
        // If game is over and turn() still returns the side *to move*,
        // the winner is the opposite of that side
        winner = currentTurn === "w" ? "white" : "black";
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
