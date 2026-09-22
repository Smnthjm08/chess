import type { Server } from "http";
import type { WebSocketServer } from "ws";
import { prisma } from "@repo/db";
import { drainGameLocks } from "./sockets/game-lock";

const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * "Service restart"; the client treats it like any drop and reconnects. Not
 * 1001 "going away": Bun's `ws` rewrites that one to 1000 on the wire.
 */
const SERVICE_RESTART = 1012;

/**
 * `server.close()`'s callback can't be the signal that requests are done: under
 * Bun it never fires once any connection has been upgraded to a WebSocket.
 */
function trackRequests(server: Server): () => Promise<void> {
  let inFlight = 0;
  let onIdle: (() => void) | null = null;

  server.on("request", (_req, res) => {
    inFlight++;
    res.on("close", () => {
      if (--inFlight === 0) onIdle?.();
    });
  });

  return () =>
    inFlight === 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => (onIdle = resolve));
}

/**
 * Nothing is lost by exiting: clocks are derived from `lastMoveAt` and
 * `sweepExpiredGames` re-arms them on boot. This is about ending cleanly —
 * a close frame instead of a reset, and no half-run transaction.
 */
export function registerShutdown(server: Server, wss: WebSocketServer): void {
  const requestsDone = trackRequests(server);
  let shuttingDown = false;

  const drain = async () => {
    server.close();
    server.closeIdleConnections();

    const socketsClosed = new Promise<void>((resolve) =>
      wss.close(() => resolve()),
    );

    for (const ws of wss.clients) {
      ws.close(SERVICE_RESTART, "Server shutting down");
    }

    await Promise.all([requestsDone(), socketsClosed]);

    // A move or flag-fall that started before the sockets went must commit
    // before the pool is closed under it.
    await drainGameLocks();
    await prisma.$disconnect();
  };

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      console.log(`${signal} received again, exiting now`);
      process.exit(1);
    }

    shuttingDown = true;
    console.log(`${signal} received, shutting down`);

    setTimeout(() => {
      console.error(`Shutdown did not finish in ${SHUTDOWN_TIMEOUT_MS}ms`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    drain().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error("Error during shutdown", error);
        process.exit(1);
      },
    );
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
