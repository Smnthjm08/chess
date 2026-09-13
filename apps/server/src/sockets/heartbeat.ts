import type WebSocket from "ws";
import type { WebSocketServer } from "ws";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * A half-open connection (laptop lid shut, wifi dropped) never fires `close`,
 * so without a ping the room would hold the dead socket forever and the
 * abandonment timer would never arm. A socket that misses one pong is
 * terminated, which does fire `close`.
 *
 * Browsers answer pings on their own; no client code is involved.
 */
export const HEARTBEAT_INTERVAL_MS =
  Number(process.env.HEARTBEAT_INTERVAL_MS) || DEFAULT_HEARTBEAT_INTERVAL_MS;

const awaitingPong = new WeakSet<WebSocket>();

export function trackHeartbeat(ws: WebSocket): void {
  ws.on("pong", () => awaitingPong.delete(ws));
}

export function startHeartbeat(wss: WebSocketServer): void {
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (awaitingPong.has(ws)) {
        ws.terminate();
        continue;
      }

      awaitingPong.add(ws);
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(interval));
}
