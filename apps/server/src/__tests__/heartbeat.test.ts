import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { connect, type Socket } from "node:net";
import { prisma } from "@repo/db";
import {
  createGame,
  joinGame,
  seatedGame,
  signInAsGuest,
  TestClient,
  type Guest,
} from "./helpers/client";
import {
  resetDatabase,
  startTestServer,
  type TestServer,
} from "./helpers/server";

const HEARTBEAT_MS = 200;
const GRACE_MS = 500;

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer({
    HEARTBEAT_INTERVAL_MS: String(HEARTBEAT_MS),
    ABANDON_GRACE_MS: String(GRACE_MS),
  });
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await resetDatabase();
});

function maskedTextFrame(text: string): Buffer {
  const payload = Buffer.from(text);
  const mask = Buffer.from([1, 2, 3, 4]);
  const header =
    payload.length < 126
      ? Buffer.from([0x81, 0x80 | payload.length])
      : Buffer.from([
          0x81,
          0x80 | 126,
          payload.length >> 8,
          payload.length & 0xff,
        ]);

  return Buffer.concat([
    header,
    mask,
    payload.map((byte, i) => byte ^ mask[i % 4]!),
  ]);
}

/**
 * A socket that completes the upgrade and then never answers a ping — what
 * the server sees of a laptop that went to sleep. Bun's WebSocket client
 * answers pings itself, so it can't play this part.
 */
async function silentClient(
  guest: Guest,
): Promise<{ socket: Socket; closed: Promise<void> }> {
  const { port } = new URL(server.wsUrl);
  const socket = connect(Number(port), "127.0.0.1");
  const closed = new Promise<void>((resolve) => socket.on("close", resolve));

  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.once("data", (chunk) => {
      if (chunk.toString().startsWith("HTTP/1.1 101")) resolve();
      else reject(new Error(`upgrade refused: ${chunk.toString()}`));
    });
    socket.write(
      [
        "GET / HTTP/1.1",
        `Host: 127.0.0.1:${port}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Version: 13",
        "Origin: http://localhost:3000",
        `Cookie: ${guest.cookie}`,
        "",
        "",
      ].join("\r\n"),
    );
  });

  return { socket, closed };
}

describe("heartbeat", () => {
  test("a socket that stops answering pings is dropped and forfeits", async () => {
    const white = await signInAsGuest(server);
    const black = await signInAsGuest(server);
    const gameId = await createGame(server, white);

    await joinGame(server, black, gameId);

    const w = await TestClient.connect(server, white);
    w.send({ type: "game:join", gameId });
    await w.next("game:state");

    const b = await silentClient(black);
    b.socket.write(
      maskedTextFrame(JSON.stringify({ type: "game:join", gameId })),
    );
    await w.next("game:state");

    await w.next("game:leave", HEARTBEAT_MS * 2 + 1_000);
    await b.closed;

    await Bun.sleep(GRACE_MS + 600);

    const stored = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    expect(stored.status).toBe("FINISHED");
    expect(stored.result).toBe("ABANDONED");
    expect(stored.winnerId).toBe(white.id);

    w.close();
  });

  test("a socket that answers pings is left alone", async () => {
    const { gameId, w, b } = await seatedGame(server);

    await w.never("game:leave", HEARTBEAT_MS * 5);

    w.send({ type: "game:move", gameId, data: { from: "e2", to: "e4" } });
    await b.next("game:state");

    [w, b].forEach((client) => client.close());
  });
});
