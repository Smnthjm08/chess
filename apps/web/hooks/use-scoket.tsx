import { useEffect, useState } from "react";

const WS_URL = "ws://localhost:8080";

export const INIT_GAME: string = "init_game";
export const MOVE: string = "move";
export const GAME_OVER: string = "game_over";

export const useSocket = () => {
  const [socket, setScoket] = useState<WebSocket | null>(null);
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setScoket(ws);
    };

    ws.onclose = () => {
      setScoket(null);
    };

    return () => {
      ws.close();
    };
  }, []);

  return socket;
};
