import type { Server } from "http";
import type { WebSocketServer } from "ws";
import type WebSocket from "ws";
import { gameSocketManager } from "./game-socket";
import { handleMessage } from "./handle-message";
import { sendMessage } from "./send";
import { EventType } from "@repo/game-core";
import { getSessionUser, getTicketUser } from "../utils/session";
import { scheduleAbandonment } from "./abandonment";
import { startHeartbeat, trackHeartbeat } from "./heartbeat";

function reject(socket: NodeJS.WritableStream & { destroy(): void }) {
  socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  socket.destroy();
}

/**
 * Authenticates the HTTP upgrade before the socket is established.
 *
 * Browsers send the Better Auth session cookie with the handshake, so a
 * same-site client needs no auth plumbing at all. A `?ticket=` one-time token
 * covers the cases where the cookie can't ride along — a cross-site deployment,
 * or a non-browser client such as Postman.
 *
 * No session at all connects as a spectator, so an invite link opened before
 * signing in still shows the game live; every action on that socket is
 * refused. A ticket that fails to verify is an auth attempt, and gets a 401.
 */
function onConnection(ws: WebSocket, userId: string | null) {
  trackHeartbeat(ws);

  if (userId) gameSocketManager.setAuthenticatedUser(ws, userId);
  else gameSocketManager.setSpectator(ws);

  sendMessage(ws, { type: EventType.CONNECTED });

  ws.on("message", (rawMessage) => {
    handleMessage(ws, rawMessage).catch((error) => {
      console.error("Error handling message", error);
      sendMessage(ws, {
        type: EventType.GAME_ERROR,
        data: { message: "Internal error" },
      });
    });
  });

  ws.on("close", () => {
    console.log("Client disconnected");

    // Read before the session is cleared; a socket that dropped mid-game puts
    // its player on the abandonment clock.
    const session = gameSocketManager.getSession(ws);

    gameSocketManager.leaveAllRooms(ws);

    if (session?.gameId && session.userId) {
      scheduleAbandonment(session.gameId, session.userId);
    }
  });

  ws.on("error", console.error);
}

export function registerSocket(wss: WebSocketServer, server: Server) {
  startHeartbeat(wss);

  server.on("upgrade", (req, socket, head) => {
    void (async () => {
      const url = new URL(req.url ?? "", "http://localhost");
      const ticket = url.searchParams.get("ticket");

      const user = ticket
        ? await getTicketUser(ticket)
        : await getSessionUser(req.headers);

      if (ticket && !user) {
        reject(socket);
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) =>
        onConnection(ws, user?.id ?? null),
      );
    })().catch((error) => {
      console.error("Error authenticating socket upgrade", error);
      reject(socket);
    });
  });
}
