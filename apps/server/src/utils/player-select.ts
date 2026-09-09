/**
 * The only user fields that may appear in a public response. Guests have no
 * `username` — the anonymous plugin puts their handle in `name`. Email and the
 * verification flags are deliberately absent.
 */
export const playerSelect = {
  id: true,
  name: true,
  username: true,
  displayUsername: true,
} as const;

export const profileSelect = {
  ...playerSelect,
  image: true,
  isAnonymous: true,
  createdAt: true,
} as const;
