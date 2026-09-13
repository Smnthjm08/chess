/**
 * The time controls a game can be created with, keyed by the conventional
 * `minutes+increment` notation. Shared so the client can only offer what the
 * server will accept, and so both agree what "3+2" means.
 *
 * `incrementMs` is Fischer increment: it is added to a player's clock after
 * each of their moves.
 */
export const TIME_CONTROLS = {
  "1+0": { initialMs: 60_000, incrementMs: 0, category: "Bullet" },
  "3+2": { initialMs: 180_000, incrementMs: 2_000, category: "Blitz" },
  "5+0": { initialMs: 300_000, incrementMs: 0, category: "Blitz" },
  "10+0": { initialMs: 600_000, incrementMs: 0, category: "Rapid" },
} as const;

export type TimeControlKey = keyof typeof TIME_CONTROLS;

/** Matches the `Game` schema defaults, so an unspecified control changes nothing. */
export const DEFAULT_TIME_CONTROL: TimeControlKey = "5+0";

export const TIME_CONTROL_KEYS = Object.keys(TIME_CONTROLS) as TimeControlKey[];

export function isTimeControlKey(value: unknown): value is TimeControlKey {
  // `hasOwn` rather than `in`: `in` walks the prototype chain, so "toString"
  // would pass and then index to a function instead of a control.
  return typeof value === "string" && Object.hasOwn(TIME_CONTROLS, value);
}

/**
 * Renders a stored control back into its notation. Games store milliseconds
 * rather than a key, so a control that no longer appears in `TIME_CONTROLS`
 * still labels correctly.
 */
export function formatTimeControl(initialMs: number, incrementMs: number) {
  const minutes = initialMs / 60_000;
  const rounded = Number.isInteger(minutes) ? minutes : minutes.toFixed(1);

  return `${rounded}+${Math.round(incrementMs / 1000)}`;
}
