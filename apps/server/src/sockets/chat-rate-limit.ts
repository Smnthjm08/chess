const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 5;

/**
 * Chat send times per user, in memory like the offer stores: a restart only
 * hands a spammer a fresh window.
 */
export class ChatRateLimit {
  private readonly sent = new Map<string, number[]>();

  /** Records a send and says whether it is within the limit. */
  allow(userId: string, now = Date.now()): boolean {
    const recent = (this.sent.get(userId) ?? []).filter(
      (at) => now - at < WINDOW_MS,
    );

    if (recent.length >= MAX_PER_WINDOW) return false;

    this.sent.set(userId, [...recent, now]);
    return true;
  }

  clear(userId: string): void {
    this.sent.delete(userId);
  }
}

export const chatRateLimit = new ChatRateLimit();
