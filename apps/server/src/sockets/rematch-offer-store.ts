/**
 * Pending rematch offers, keyed by the id of the *finished* game they were made
 * in, holding the id of the player who offered. In memory for the same reason
 * the draw offers next door are: losing one to a restart costs a click.
 *
 * At most one offer can stand per finished game. It is cleared when the rematch
 * is created and when it is declined — a finished game never moves again, so
 * nothing else can invalidate it.
 */
export class RematchOfferStore {
  private readonly offers = new Map<string, string>();

  /** The user id of the player with a pending offer, if any. */
  get(gameId: string): string | undefined {
    return this.offers.get(gameId);
  }

  set(gameId: string, userId: string): void {
    this.offers.set(gameId, userId);
  }

  clear(gameId: string): void {
    this.offers.delete(gameId);
  }
}

export const rematchOfferStore = new RematchOfferStore();
