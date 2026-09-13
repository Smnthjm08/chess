/**
 * Postgres `text` cannot hold a NUL byte, and a query that compares a column
 * against one is rejected outright rather than matching nothing. So an id or
 * handle containing it cannot name any row — checked before it reaches Prisma,
 * that is a plain "not found" instead of a database error.
 */
export function canMatchText(value: string): boolean {
  return !value.includes("\0");
}
