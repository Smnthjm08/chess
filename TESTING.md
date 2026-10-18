# Testing

`bun test` under Turborepo. Three layers, fastest first.

```bash
bun run test                      # everything
bun test --filter game-core       # one package (from its directory: bun test)
```

## What runs where

| Package              | Suite                                             | Needs    |
| -------------------- | ------------------------------------------------- | -------- |
| `packages/game-core` | engine, legality, outcomes                        | nothing  |
| `apps/web` (`lib/`)  | clock maths, board geometry, result wording       | nothing  |
| `apps/server`        | clock reconciliation, the game lock               | env only |
| `apps/server`        | socket integration, races, flag fall, abandonment | Postgres |

## The test database

The server suites boot the real server as a child process and talk to it over
HTTP and a real WebSocket upgrade, so they need a database. They run against
`<your database>_test` — derived from `DATABASE_URL`, or set `TEST_DATABASE_URL`
to override.

```bash
createdb chess_test
DATABASE_URL="postgresql://…/chess_test" bunx --bun prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

`apps/server/test-setup.ts` (a Bun test preload) points `DATABASE_URL` at that
database and **refuses to run unless its name ends in `_test`** — the suites
truncate every table between tests, so this is the guard that keeps them off
development data.

## Notes

- `ABANDON_GRACE_MS` is overridable so the forfeit path can be exercised in
  under a second instead of the production minute. Deployments leave it alone.
- The integration suites spawn a server per file on an ephemeral port, so they
  can run alongside a development server on 8001.
- **Do not run two copies of the server suite at once.** Each test truncates
  every table, and TRUNCATE takes an exclusive lock — a second copy blocks
  rather than failing. `resetDatabase` sets a 10s `lock_timeout` so this
  surfaces as an error instead of an eleven-minute hang. Give CI its own
  database per job rather than sharding one.

## Browser testing (manual)

Nothing above renders React. The board, the clocks and the dialogs are checked
by hand — automated browser tests are not planned, so this checklist is the
only coverage the client layer has. Run it after anything that touches
`components/game/` or `lib/game-socket.ts`.

Two players: one normal window, one incognito (separate guest sessions).
Create a game in the first, open the invite link in the second.

**Board input**

- [ ] Click an own piece to select, a legal target to move; clicking empty space deselects; clicking another own piece re-selects.
- [ ] Legal-move hints appear — dot on empty squares, ring on captures.
- [ ] Clicking an illegal target does nothing (no message sent, selection kept or cleared, not a server error).
- [ ] Drag-and-drop moves work as the second input path.
- [ ] Last move's from/to stay highlighted.
- [ ] The king's square highlights when in check.
- [ ] Promotion: the picker opens over the target square and **nothing is sent until a piece is chosen** — cancelling sends no move.
- [ ] Keyboard: tab to a square, arrow keys move focus, Enter/Space selects.

**Clocks**

- [ ] The side on move ticks down; the idle side holds.
- [ ] Tenths show under 10s, the colour changes under 30s.
- [ ] A local clock clamps at 0:00 and waits — the server decides the flag fall, not the client.
- [ ] Clocks snap to each `game:state` rather than drifting (watch across several moves).

**Controls and result**

- [ ] Resign asks for confirmation, and the loser's screen updates.
- [ ] Offer draw is disabled while your own offer is pending.
- [ ] The opponent gets an Accept/Decline prompt; declining shows the offerer "your offer was declined".
- [ ] Pause only appears for the player on move; Resume only for the opponent. Neither should ever be offered when the server would refuse it.
- [ ] On checkmate the result dialog names the right outcome (won / lost / draw) and "Back to lobby" works.
- [ ] A finished game, a spectator's view, and "not your turn" all leave the board non-interactive.

**Lobby**

- [ ] The lobby opens on Waiting, not on every game ever played.
- [ ] Each tab shows only its own games; a paused game appears under "In progress", not just "All".
- [ ] Paging keeps the tab you are on, and Previous/Next disable at the ends.
- [ ] Each tab's empty state reads correctly for that tab.

**Profiles**

- [ ] Played / wins / losses / draws / win rate on a profile match the games
      listed under it; a player with no finished games shows a `—` win rate,
      not `0%` or `NaN%`.
- [ ] The white/black and per-time-control bars add up to the total played,
      and a category with no games in it does not appear.
- [ ] A streak note only shows once there are at least two games in a row the
      same way, and the best-win note only once there has been more than one
      win in a row at some point.
- [ ] The Won / Lost / Drawn tabs under a profile filter to that result only,
      and paging keeps the tab you are on.
- [ ] A game abandoned before a second player joined does not count anywhere
      on the profile — not played, not a loss.
- [ ] A guest's profile (addressed by id, no `@username`) shows the same stats.

**Time controls**

- [ ] "New game" offers 1+0, 3+2, 5+0, 10+0; picking one starts a game with those clocks.
- [ ] The control shows on the game page and on lobby rows.
- [ ] In a 3+2 game, your clock goes _up_ after you move; in 5+0 it only counts down.
- [ ] A 1+0 bullet game is playable — tenths appear for most of it and the display stays readable.

**PGN export**

- [ ] The Moves card header has a PGN button; on a narrow screen it sits in the
      status row under the board.
- [ ] It is disabled until the first move is played.
- [ ] Downloading mid-game gives a file ending `*`; downloading a finished game
      gives `1-0`, `0-1` or `1/2-1/2` matching the result on screen.
- [ ] The file name reads `<white>-vs-<black>-<date>.pgn`.
- [ ] Open the download in a real board (Lichess "import game" or similar) and
      confirm it replays to the same final position.

**Game review**

- [ ] Clicking a move in the Moves card (or the strip under the board on a
      narrow screen) shows that position, with its from/to squares highlighted.
- [ ] The ⏮ ◀ ▶ ⏭ buttons and ←/→/Home/End step through the game; the ends
      disable the matching buttons.
- [ ] Arrow keys while a board square is focused still move the square cursor,
      not the review.
- [ ] Reviewing mid-game locks the board; "back to live" (or ⏭) returns to the
      live position, and a move arriving while reviewing leaves you where you are.
- [ ] Loading a long game on a phone does not scroll the page down to the moves.
- [ ] The flip button (or F) turns the board; on a narrow screen the clocks
      above and below it swap with it.
- [ ] As a player with the board flipped, you can still pick up and move your
      own pieces, and promotion offers pieces in your colour.
- [ ] Copy FEN copies the position on the board — the reviewed one when stepping
      back — and pasting it into Lichess's board editor shows the same position.
- [ ] In the Moves card each move shows how long it took (`4.2s`, `34s`, `1:05`);
      White's first move reads `0.0s` because the clock only starts after it.
      Games played before the `move_clock` migration show no times.
- [ ] After a capture, the taker's row shows the piece (same pieces bunched)
      and a `+N` lead; an even trade shows both captures and no `+`.
- [ ] Stepping back through the review changes the captures to match the board.
- [ ] On a phone the captures sit beside the name without making the rows
      above and below the board taller.

**Fork**

- [ ] The fork button only shows on finished games, and is disabled on a
      checkmate or stalemate position.
- [ ] Forking from a position with White to move seats you as White; with Black
      to move, as Black, with the board turned your way and an invite link.
- [ ] A second player joining starts the game and its clock whichever seat they
      fill; the side to move plays first.
- [ ] The move list numbers from the fork (`12… Nf6` as the first entry when
      Black moves first); ⏮ returns to the forked position, not the standard start.
- [ ] "Forked from an earlier game" links back to the original.
- [ ] The PGN of a fork has `SetUp`/`FEN` tags and imports into Lichess at the
      right position.
- [ ] A rematch of a finished fork starts from the fork's position again.

**Rematch**

- [ ] After a finished game both players see a Rematch card; the result dialog also offers one.
- [ ] Offering shows "Rematch offered" and disables the button; the opponent sees the prompt.
- [ ] Declining tells the offerer, and they can offer again.
- [ ] Accepting sends **both** players to the new game, with the colours swapped, the same time control, and the clocks full.
- [ ] Reload while an offer stands — it is still there (`game:state` carries it).
- [ ] A spectator sees no rematch UI and is not navigated anywhere when the players rematch.

**Sounds and animation**

- [ ] Moves, captures and checks each sound different; a game ending plays the end sound once, and opening an already-finished game plays nothing.
- [ ] Your own clock dropping under 10s plays the low-time warning once.
- [ ] Pieces slide on every move, including the rook when castling; stepping back through the review slides them back.
- [ ] A dragged piece does not slide back from where it was picked up.
- [ ] With the OS "reduce motion" setting on, nothing slides.

**Chat**

Add a third window, signed in as a different guest, watching as a spectator.

- [ ] Messages go both ways: yours on the right, your opponent's on the left.
- [ ] The spectator has no chat card and never sees the messages.
- [ ] Six messages within ten seconds: the sixth shows the "too quickly" toast and stays in the box to resend.
- [ ] Typing `f` or arrow keys in the box neither flips the board nor steps the review.
- [ ] Hide collapses the card, and it stays hidden after a reload.
- [ ] Chat still works after a resignation.

**The two worth going out of your way for** — no protocol test can reach them:

- [ ] **Optimistic rollback.** Force a rejected move (two tabs as the same player, or move while the opponent's move is in flight) and confirm the board rolls back to the authoritative position and shows an error toast rather than sticking on the bad one.
- [ ] **Reconnect.** Close the laptop lid or drop wifi mid-game, come back, and confirm the socket reconnects and re-syncs. This is where the stale-WebSocket-ref bug lived.
