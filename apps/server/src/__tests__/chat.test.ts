import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { seatedGame, signInAsGuest, TestClient } from "./helpers/client";
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

describe("chat", () => {
  test("a message reaches both players, trimmed", async () => {
    const { gameId, white, w, b } = await seatedGame(server);

    w.send({ type: "game:chat", gameId, data: { text: "  good luck  " } });

    for (const client of [w, b]) {
      const frame = await client.next("game:chat");

      expect(frame.data?.userId).toBe(white.id);
      expect(frame.data?.text).toBe("good luck");
      expect(typeof frame.data?.at).toBe("number");
    }

    [w, b].forEach((client) => client.close());
  });

  test("still open once the game is over", async () => {
    const { gameId, w, b } = await seatedGame(server);

    w.send({ type: "game:resign", gameId });
    await b.next("game:state");

    b.send({ type: "game:chat", gameId, data: { text: "gg" } });

    expect((await w.next("game:chat")).data?.text).toBe("gg");

    [w, b].forEach((client) => client.close());
  });

  test("a spectator can neither send nor read it", async () => {
    const { gameId, w, b } = await seatedGame(server);
    const onlooker = await signInAsGuest(server);
    const s = await TestClient.connect(server, onlooker);

    s.send({ type: "game:join", gameId });
    await s.next("game:state");

    s.send({ type: "game:chat", gameId, data: { text: "hi" } });
    expect((await s.next("game:error")).data?.message).toBe(
      "Spectators cannot chat",
    );

    w.send({ type: "game:chat", gameId, data: { text: "private" } });
    await b.next("game:chat");
    await s.never("game:chat");

    [w, b, s].forEach((client) => client.close());
  });

  test("blank and over-length text is refused", async () => {
    const { gameId, w, b } = await seatedGame(server);

    for (const text of ["   ", "x".repeat(201)]) {
      w.send({ type: "game:chat", gameId, data: { text } });

      const error = await w.next("game:error");

      expect(String(error.data?.message)).toStartWith("Invalid message");
    }

    await b.never("game:chat");

    [w, b].forEach((client) => client.close());
  });

  test("the sixth message in ten seconds is refused", async () => {
    const { gameId, w, b } = await seatedGame(server);

    for (let i = 0; i < 6; i++) {
      w.send({ type: "game:chat", gameId, data: { text: `${i}` } });
    }

    for (let i = 0; i < 5; i++) await b.next("game:chat");

    expect((await w.next("game:error")).data?.message).toBe(
      "You are sending messages too quickly",
    );
    await b.never("game:chat");

    [w, b].forEach((client) => client.close());
  });
});
