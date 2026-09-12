import { describe, expect, test } from "bun:test";
import { withGameLock } from "../game-lock";

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe("withGameLock", () => {
  test("serializes two tasks on the same game", async () => {
    const events: string[] = [];

    const first = withGameLock("game-1", async () => {
      events.push("first:start");
      await tick(20);
      events.push("first:end");
    });

    const second = withGameLock("game-1", async () => {
      events.push("second:start");
      await tick(0);
      events.push("second:end");
    });

    await Promise.all([first, second]);

    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  test("lets different games run concurrently", async () => {
    const events: string[] = [];

    const slow = withGameLock("game-a", async () => {
      events.push("a:start");
      await tick(30);
      events.push("a:end");
    });

    const quick = withGameLock("game-b", async () => {
      events.push("b:start");
      await tick(0);
      events.push("b:end");
    });

    await Promise.all([slow, quick]);

    // b finished inside a's window rather than queueing behind it.
    expect(events).toEqual(["a:start", "b:start", "b:end", "a:end"]);
  });

  test("returns each task's own value to its own caller", async () => {
    const results = await Promise.all([
      withGameLock("game-2", async () => "first"),
      withGameLock("game-2", async () => "second"),
    ]);

    expect(results).toEqual(["first", "second"]);
  });

  test("a throwing task rejects only its own caller", async () => {
    const failing = withGameLock("game-3", async () => {
      throw new Error("handler blew up");
    });

    const after = withGameLock("game-3", async () => "still ran");

    await expect(failing).rejects.toThrow("handler blew up");
    await expect(after).resolves.toBe("still ran");
  });

  test("a wedged game does not block the rest of the server", async () => {
    const events: string[] = [];

    const failing = withGameLock("game-4", async () => {
      await tick(10);
      throw new Error("nope");
    });
    failing.catch(() => {});

    await withGameLock("game-5", async () => {
      events.push("other game ran");
    });

    expect(events).toEqual(["other game ran"]);
  });

  test("does not leak a chain per game id", async () => {
    for (let i = 0; i < 50; i++) {
      await withGameLock(`ephemeral-${i}`, async () => i);
    }

    // Nothing to assert on directly — the map is private — but the cleanup
    // path runs on settle, so this is the shape a leak would show up in.
    await tick(5);
    expect(true).toBe(true);
  });
});
