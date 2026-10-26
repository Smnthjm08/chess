# TODO — finishing this project

**The game is playable.** The board sends moves, clocks tick locally, resign / draw / pause all work, and 116 tests cover the engine, the clock maths, the game lock and the socket protocol.

Last verified 2026-09-22: `bun run test` 276 pass / 0 fail (58 game-core, 102 web, 116 server), `bun run lint` and `bun run check-types` clean across all 6 packages.

`docs/todo.md` is the historical backend plan; its "Done" section is the accurate record of what the server does. The detailed Phase 1/2 build checklist that used to live here is done — git history has it.

---

## Worth doing

Roughly in order. Each one is either a real bug or a few lines.

- [ ] **Finish the browser checklist in `TESTING.md`.** Core play (board, clocks, controls, lobby) is confirmed; what remains is profiles, PGN, review, fork, rematch, chat, reconnect and rollback.

## If the project keeps going

Real features, none of them urgent.

- [ ] **CI.** No `.github/`. A workflow running install / lint / check-types / test / build, with a Postgres service container for the integration suites.

### Play feel

- [ ] **Premoves.** Queue a move on the opponent's turn and send it the moment it is yours. Matters for bullet; the edge cases (illegal on arrival, cancel, promotion) are the work.

### Larger

- [ ] **Engine analysis in review.** Stockfish WASM in the browser: eval bar and best-move arrow, finished games only. No server work, but a heavy download.
- [ ] **Opening name.** Match the move sequence against an ECO table ("Sicilian Defence: Najdorf"). Simple lookup; the data file is the cost.

## Deliberately not doing

Written down so it stays decided instead of getting rediscovered.

- **Structured logging (pino), socket and route rate limiting** (chat has its own limit). Production hardening; revisit once it is deployed for other people to use.
- **Horizontal scaling.** The in-memory `rooms` / `userSockets` / `gameEngineCache` / timer maps make the server **single-instance only**. That is a real constraint worth knowing about, but Redis pub/sub or sticky routing by game id is a rewrite, not a task — one instance is fine here.
- **Ratings, spectator count, matchmaking queue, saved chat history.** Chess-site features this project does not need. (Profiles exist, with win/loss/draw stats — see `apps/server/src/utils/profile-stats.ts`.)
