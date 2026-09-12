"use client";

import type { Turn } from "@repo/game-core";
import { useEffect, useState } from "react";

/**
 * A minute-scale display: 100ms is under a frame's worth of error at the
 * tenths the last ten seconds show, and a hundredth of the render budget of
 * ticking on every frame.
 */
const TICK_MS = 100;

const TENTHS_BELOW_MS = 10_000;
const URGENT_BELOW_MS = 30_000;

/**
 * The clocks as of `anchor`, plus which side is spending time from there. Every
 * `game:state` replaces one of these wholesale, so local ticking is only ever
 * an interpolation between two authoritative readings and can never accumulate
 * drift across them.
 */
export type ClockBaseline = {
  whiteTimeMs: number;
  blackTimeMs: number;
  turn: Turn;
  running: boolean;
  anchor: number;
};

export function clockAt(baseline: ClockBaseline, at: number) {
  const elapsed = baseline.running ? Math.max(0, at - baseline.anchor) : 0;

  return {
    whiteTimeMs:
      baseline.turn === "white"
        ? Math.max(0, baseline.whiteTimeMs - elapsed)
        : baseline.whiteTimeMs,
    blackTimeMs:
      baseline.turn === "black"
        ? Math.max(0, baseline.blackTimeMs - elapsed)
        : baseline.blackTimeMs,
  };
}

/**
 * Interpolates `baseline` forward until the next one arrives. Reaching zero
 * only stops the display: the flag fall is the server's call (`clock-expiry`),
 * and until it says so the game is still running.
 */
export function useClock(baseline: ClockBaseline) {
  const [at, setAt] = useState(baseline.anchor);

  useEffect(() => {
    setAt(Date.now());

    if (!baseline.running) return;

    const id = setInterval(() => {
      const now = Date.now();

      setAt(now);

      const left =
        (baseline.turn === "white"
          ? baseline.whiteTimeMs
          : baseline.blackTimeMs) -
        (now - baseline.anchor);

      // Clamped at 0:00; there is nothing left to count.
      if (left <= 0) clearInterval(id);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [baseline]);

  return clockAt(baseline, at);
}

/** `m:ss`, and `m:ss.t` inside the last ten seconds. */
export function formatClock(ms: number) {
  const clamped = Math.max(0, ms);
  const seconds = Math.floor(clamped / 1000);
  const base = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  if (clamped >= TENTHS_BELOW_MS) return base;

  return `${base}.${Math.floor((clamped % 1000) / 100)}`;
}

export function clockUrgency(ms: number): "urgent" | "low" | "normal" {
  if (ms < TENTHS_BELOW_MS) return "urgent";
  if (ms < URGENT_BELOW_MS) return "low";

  return "normal";
}
