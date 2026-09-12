import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { prisma } from "@repo/db";
import {
  api,
  createGame,
  joinGame,
  seatedGame,
  signInAsGuest,
  TestClient,
} from "./helpers/client";
import {
  resetDatabase,
  startTestServer,
  type TestServer,
} from "./helpers/server";

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await resetDatabase();
});

describe("joining", () => {
  test("a seated player is told their colour and the position", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:join", gameId });
    b.send({ type: "game:join", gameId });

    const white = await w.next("game:state");
    const black = await b.next("game:state");

    expect(white.data?.role).toBe("white");
    expect(black.data?.role).toBe("black");
    expect(white.data?.fen).toBe(black.data?.fen);
    expect(white.data?.status).toBe("ACTIVE");

    [w, b].forEach((client) => client.close());
  });

  test("a third party joins as a spectator", async () => {
    const { gameId, w, b } = await seatedGame(server);
    const watcher = await signInAsGuest(server);
    const s = await TestClient.connect(server, watcher);

    s.send({ type: "game:join", gameId });
    const state = await s.next("game:state");

    expect(state.data?.role).toBe("spectator");

    [w, b, s].forEach((client) => client.close());
  });

  test("an unauthenticated upgrade is refused", async () => {
    const socket = new WebSocket(server.wsUrl);
    const code = await new Promise<number>((resolve) => {
      socket.addEventListener("close", (event) => resolve(event.code));
      socket.addEventListener("error", () => resolve(-1));
    });

    // Either a 401 handshake (no open socket) or an immediate close.
    expect(code).not.toBe(1000);
  });
});

describe("moving", () => {
  test("a legal move reaches both sides and persists", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });

    const mover = await w.next("game:state");
    const opponent = await b.next("game:state");

    expect(mover.data?.fen).toBe(opponent.data?.fen);
    expect(mover.data?.turn).toBe("black");
    expect(String(mover.data?.fen)).toContain("4P3");

    const stored = await prisma.move.findMany({ where: { gameId } });

    expect(stored).toHaveLength(1);
    expect(stored[0]?.san).toBe("e4");
    expect(stored[0]?.moveNumber).toBe(1);

    [w, b].forEach((client) => client.close());
  });

  test("an illegal move is rejected and changes nothing", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e5" } });

    const error = await w.next("game:error");

    expect(error.data?.message).toBe("Illegal move");
    await b.never("game:state");
    expect(await prisma.move.count({ where: { gameId } })).toBe(0);

    [w, b].forEach((client) => client.close());
  });

  test("a move out of turn is rejected", async () => {
    const { gameId, w, b } = await seatedGame(server);

    b.send({ type: "game:move", gameId, data: { from: "e7", to: "e5" } });

    const error = await b.next("game:error");

    expect(error.data?.message).toBe("Not your turn");
    expect(await prisma.move.count({ where: { gameId } })).toBe(0);

    [w, b].forEach((client) => client.close());
  });

  test("a spectator cannot move", async () => {
    const { gameId, w, b } = await seatedGame(server);
    const watcher = await signInAsGuest(server);
    const s = await TestClient.connect(server, watcher);

    s.send({ type: "game:join", gameId });
    await s.next("game:state");
    s.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });

    const error = await s.next("game:error");

    expect(error.data?.message).toBe("Spectators cannot make moves");

    [w, b, s].forEach((client) => client.close());
  });

  test("checkmate finishes the game and persists the result", async () => {
    const { gameId, white, black, w, b } = await seatedGame(server);

    const line: [TestClient, { from: string; to: string }][] = [
      [w, { from: "f2", to: "f3" }],
      [b, { from: "e7", to: "e5" }],
      [w, { from: "g2", to: "g4" }],
      [b, { from: "d8", to: "h4" }],
    ];

    for (const [client, move] of line) {
      client.send({ type: "game:move", gameId, data: move });
      await w.next("game:state");
      await b.next("game:state");
      w.drain();
      b.drain();
    }

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(game.status).toBe("FINISHED");
    expect(game.result).toBe("CHECKMATE");
    expect(game.winnerId).toBe(black.id);
    expect(white.id).not.toBe(game.winnerId);

    const moves = await prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: "asc" },
    });

    expect(moves.map((move) => move.san)).toEqual(["f3", "e5", "g4", "Qh4#"]);

    [w, b].forEach((client) => client.close());
  });

  test("a move after the game is over is rejected", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:resign", gameId });
    await w.next("game:state");

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    const error = await w.next("game:error");

    expect(error.data?.message).toBe("Game is not active");

    [w, b].forEach((client) => client.close());
  });
});

describe("validation", () => {
  test("a malformed frame is answered, not ignored", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:move", gameId, data: { from: "e2" } });
    const error = await w.next("game:error");

    expect(String(error.data?.message)).toContain("Invalid message");

    [w, b].forEach((client) => client.close());
  });

  test("an unknown game id is answered", async () => {
    const guest = await signInAsGuest(server);
    const client = await TestClient.connect(server, guest);

    client.send({ type: "game:join", gameId: "does-not-exist" });
    const error = await client.next("game:error");

    expect(error.data?.message).toBe("Game not found");

    client.close();
  });
});

describe("seats", () => {
  test("a second player cannot take an occupied seat", async () => {
    const white = await signInAsGuest(server);
    const black = await signInAsGuest(server);
    const late = await signInAsGuest(server);
    const gameId = await createGame(server, white);

    await joinGame(server, black, gameId);
    const res = await joinGame(server, late, gameId);

    expect(res.ok).toBe(false);

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect([game.whiteId, game.blackId].sort()).toEqual(
      [white.id, black.id].sort(),
    );
  });

  test("re-joining returns the seat you already hold", async () => {
    const white = await signInAsGuest(server);
    const gameId = await createGame(server, white);

    // The invite-link page calls join on open, so the creator opening their
    // own link must be a no-op rather than an error.
    const res = await joinGame(server, white, gameId);

    expect(res.ok).toBe(true);

    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

    expect(game.blackId).toBeNull();
    expect(game.status).toBe("WAITING");
  });

  test("a player cannot hold two active games at once", async () => {
    const white = await signInAsGuest(server);
    const black = await signInAsGuest(server);
    const gameId = await createGame(server, white);

    await joinGame(server, black, gameId);

    const second = await api(server, white)("/api/v1/games", {
      method: "POST",
      body: "{}",
    });

    expect(second.ok).toBe(false);
  });
});
