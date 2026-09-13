import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { api, signInAsGuest, TestClient } from "./helpers/client";
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

async function status(path: string) {
  return (await api(server)(path)).status;
}

describe("profile lookups", () => {
  test("an unknown handle is a 404", async () => {
    expect(await status("/api/v1/users/nobody")).toBe(404);
  });

  // Postgres `text` cannot hold a NUL byte and rejects a query comparing
  // against one, so this used to escape as a 500.
  test("a handle containing a NUL byte is a 404, not a 500", async () => {
    expect(await status("/api/v1/users/%00")).toBe(404);
    expect(await status("/api/v1/users/ab%00cd")).toBe(404);
  });
});

describe("game lookups", () => {
  test("an unknown game id is a 404", async () => {
    expect(
      await status("/api/v1/games/00000000-0000-0000-0000-000000000000"),
    ).toBe(404);
  });

  test("a game id containing a NUL byte is a 404, not a 500", async () => {
    expect(await status("/api/v1/games/%00")).toBe(404);
  });
});

describe("joining", () => {
  test("joining a game id containing a NUL byte is a 404, not a 500", async () => {
    const guest = await signInAsGuest(server);
    const res = await api(server, guest)("/api/v1/games/%00/join", {
      method: "POST",
      body: "{}",
    });

    expect(res.status).toBe(404);
  });

  // Every socket handler reads its game by id, so a NUL there reached Postgres
  // and came back as a generic "Internal error".
  test("a socket frame naming a NUL game id is refused, not an internal error", async () => {
    const guest = await signInAsGuest(server);
    const client = await TestClient.connect(server, guest);

    client.send({ type: "game:join", gameId: "\u0000" });
    const error = await client.next("game:error");

    expect(error.data?.message).not.toBe("Internal error");

    client.close();
  });
});
