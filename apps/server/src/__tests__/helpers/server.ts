import { prisma } from "@repo/db";

export type TestServer = {
  baseUrl: string;
  wsUrl: string;
  stop: () => Promise<void>;
};

/** A port nothing else on the machine is listening on. */
async function freePort(): Promise<number> {
  const probe = Bun.listen({
    hostname: "127.0.0.1",
    port: 0,
    socket: { data() {} },
  });
  const port = probe.port;

  probe.stop(true);

  return port;
}

/**
 * Boots the real server as a child process against the test database, so the
 * suites talk to it exactly as a browser would — over HTTP and a real
 * WebSocket upgrade — rather than calling handlers directly.
 */
export async function startTestServer(
  env: Record<string, string> = {},
): Promise<TestServer> {
  const port = await freePort();
  const entry = new URL("../../index.ts", import.meta.url).pathname;

  const child = Bun.spawn(["bun", entry], {
    env: {
      ...process.env,
      BACKEND_PORT: String(port),
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: "test",
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const stderr = await new Response(child.stderr).text();
      throw new Error(`test server exited early:\n${stderr}`);
    }

    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        return {
          baseUrl,
          wsUrl: `ws://127.0.0.1:${port}`,
          stop: async () => {
            child.kill();
            await child.exited;
          },
        };
      }
    } catch {
      // Not listening yet.
    }

    await Bun.sleep(50);
  }

  child.kill();
  throw new Error("test server did not become healthy in time");
}

/**
 * Empties every table. The preload refuses any database not named `*_test`,
 * so this cannot reach the development data.
 */
export async function resetDatabase(): Promise<void> {
  // Identifiers are quoted because Prisma preserves the models' casing.
  const tables = ["Move", "Game", "Session", "Account", "Verification", "User"]
    .map((table) => `"${table}"`)
    .join(", ");

  // TRUNCATE takes an exclusive lock and waits forever by default, so a second
  // copy of this suite — or a stray server still holding a connection — turns
  // into a silent hang rather than a failure. Fail fast and say so instead.
  await prisma.$executeRawUnsafe("SET lock_timeout = '10s'");

  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
    );
  } catch (error) {
    throw new Error(
      `Could not clear the test database — something else is holding a lock on it. Is another copy of the suite running, or a stray test server still up?\n${String(error)}`,
    );
  }
}
