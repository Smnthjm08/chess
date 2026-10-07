import { expect, test } from "bun:test";
import { ChatRateLimit } from "../chat-rate-limit";

test("five per ten seconds, per user, and the window slides", () => {
  const limit = new ChatRateLimit();

  for (let i = 0; i < 5; i++) expect(limit.allow("a", i * 1000)).toBe(true);

  expect(limit.allow("a", 5000)).toBe(false);
  expect(limit.allow("b", 5000)).toBe(true);

  // The first send has aged out; the refused one was never recorded.
  expect(limit.allow("a", 10_000)).toBe(true);
  expect(limit.allow("a", 10_001)).toBe(false);

  limit.clear("a");
  expect(limit.allow("a", 10_002)).toBe(true);
});
