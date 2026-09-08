"use client";

import {
  EventType,
  type ClientMessage,
  type ServerMessage,
} from "@repo/game-core";
import { useCallback, useEffect, useRef, useState } from "react";
import { socketUrl } from "./env";

export type GameState = Extract<
  ServerMessage,
  { type: EventType.GAME_STATE }
>["data"];

export type ConnectionStatus =
  "idle" | "connecting" | "open" | "reconnecting" | "closed";

/**
 * The server puts a dropped player on a fixed 60s abandonment clock
 * (`ABANDON_GRACE_MS`), so every retry has to land well inside it — a blip must
 * never cost the game. Jitter keeps both players off the same schedule when the
 * server itself is what restarted.
 */
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 8000;

function backoffMs(attempt: number) {
  const capped = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);

  return capped * (0.5 + Math.random() / 2);
}

/** The server closes a user's older socket with this when a newer one opens. */
const REPLACED_BY_NEW_CONNECTION = 4000;

export function useGameSocket({
  gameId,
  enabled = true,
  onSync,
}: {
  gameId: string;
  /**
   * The upgrade is authenticated, so a signed-out visitor would only retry
   * against a 401 forever. They read the server-rendered page instead.
   */
  enabled?: boolean;
  /**
   * Fired when something arrived that `game:state` alone cannot express —
   * a move (the SAN list lives in the database) or a seat changing hands
   * (state carries player ids, not their names). Refetch on the server.
   */
  onSync?: () => void;
}) {
  const [status, setStatus] = useState<ConnectionStatus>(
    enabled ? "connecting" : "idle",
  );
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  });

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let connectedBefore = false;
    let seats = "";

    function connect() {
      if (disposed) return;

      socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed) return;

        attempt = 0;
        setStatus("open");
        setError(null);

        // Only on a *re*-connect: the first render's data is already fresh,
        // but anything that happened while the socket was down is not.
        if (connectedBefore) onSyncRef.current?.();
        connectedBefore = true;

        socket?.send(
          JSON.stringify({
            type: EventType.GAME_JOIN,
            gameId,
          } satisfies ClientMessage),
        );
      };

      socket.onmessage = (event) => {
        if (disposed) return;

        let message: ServerMessage;

        try {
          message = JSON.parse(String(event.data)) as ServerMessage;
        } catch {
          return;
        }

        switch (message.type) {
          case EventType.GAME_STATE: {
            setState(message.data);

            // Seats arrive as ids, and the page renders names — so a seat
            // changing hands (an opponent taking it over REST) has to refetch
            // even though the position itself is already up to date.
            const next = `${message.data.whiteId ?? ""}:${message.data.blackId ?? ""}`;

            if (seats && seats !== next) onSyncRef.current?.();
            seats = next;
            break;
          }

          // A move also broadcasts `game:state`, which carries the new
          // position; this is only the cue to re-read the SAN list.
          case EventType.GAME_MOVE:
          case EventType.GAME_JOIN:
          case EventType.GAME_LEAVE:
            onSyncRef.current?.();
            break;

          case EventType.GAME_ERROR:
            setError(message.data.message);
            break;

          default:
            break;
        }
      };

      socket.onclose = (event) => {
        socketRef.current = null;

        if (disposed) return;

        // Another tab took over this user's connection. Retrying would just
        // take it back, and the two tabs would trade it indefinitely.
        if (event.code === REPLACED_BY_NEW_CONNECTION) {
          setStatus("closed");
          setError("This game was opened in another tab.");
          return;
        }

        setStatus("reconnecting");
        retry = setTimeout(connect, backoffMs(attempt++));
      };
    }

    setStatus("connecting");
    connect();

    return () => {
      disposed = true;

      if (retry) clearTimeout(retry);

      // 1000 keeps this out of the reconnect path on the way out.
      socket?.close(1000);
      socketRef.current = null;
    };
  }, [gameId, enabled]);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;

    if (socket?.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify(message));
    return true;
  }, []);

  return { state, status, error, send };
}
