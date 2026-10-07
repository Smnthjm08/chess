import { describe, expect, test } from "bun:test";
import { moveSound, type Sound } from "../sound";

describe("moveSound", () => {
  test.each<[string, Sound]>([
    ["e4", "move"],
    ["O-O", "move"],
    ["e8=Q", "move"],
    ["Nxe5", "capture"],
    ["exd8=Q", "capture"],
    ["Bb5+", "check"],
    ["Qxf7#", "check"],
  ])("%s → %s", (san, sound) => {
    expect(moveSound(san)).toBe(sound);
  });
});
