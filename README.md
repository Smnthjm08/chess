# Chess

Real-time multiplayer chess. Two players, one invite link, server-authoritative
clocks and rules.

- **Play** — click or drag, legal-move hints, promotion picker, check indicator,
  keyboard navigation.
- **Clocks** — bullet through rapid (1+0, 3+2, 5+0, 10+0) with Fischer
  increment, ticking locally and reconciled against the server on every move.
- **Agreements** — resign, offer or decline a draw, pause and resume, rematch
  with the colours swapped.
- **Guests** — no sign-up needed to play; a guest session is created on demand
  and can be upgraded to a real account later.

Every rule is enforced on the server. The client shares the same engine so it
can grey out illegal moves, but it is never the authority: an optimistic move
is rolled back if the server refuses it.

## Layout

| Path                                                   | What it is                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| `apps/web`                                             | Next.js 16 client — board, lobby, profiles                           |
| `apps/server`                                          | Express + `ws` server — REST API, WebSocket game protocol, clocks    |
| `packages/game-core`                                   | Chess rules over `chess.js`, the socket message types, time controls |
| `packages/db`                                          | Prisma schema, migrations, generated client                          |
| `packages/auth`                                        | Better Auth setup (guest, username/password)                         |
| `packages/eslint-config`, `packages/typescript-config` | Shared config                                                        |

`packages/game-core` is deliberately shared: the server validates moves with it
and the client offers moves with it, so the two cannot disagree about legality.

## Running it

Requires [Bun](https://bun.sh) and a PostgreSQL instance.

```bash
bun install

cp .env.example .env          # then edit it — see the comments in the file
createdb chess

cd packages/db && bun run db:deploy && cd -   # apply migrations

bun run dev                   # web on :3000, server on :8001
```

`bun run dev` starts both apps through Turborepo. The web app talks to the
server over `NEXT_PUBLIC_SERVER_URL`, and derives the WebSocket URL from it.

### Environment

All of it lives in a single `.env` at the repo root. [`.env.example`](.env.example)
documents each variable; the ones every deployment must set are `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_ORIGIN` and
`NEXT_PUBLIC_SERVER_URL`.

## Commands

| Command               |                                                 |
| --------------------- | ----------------------------------------------- |
| `bun run dev`         | Both apps, watch mode                           |
| `bun run build`       | Build everything                                |
| `bun run test`        | Every test suite (see [TESTING.md](TESTING.md)) |
| `bun run lint`        | ESLint, zero warnings tolerated                 |
| `bun run check-types` | `tsc --noEmit` across the workspace             |
| `bun run format`      | Prettier                                        |

Database commands run from `packages/db`: `db:migrate` (create and apply),
`db:deploy` (apply), `db:studio` (browse).

## Notes

- **The server is single-instance.** Rooms, socket sessions, the engine cache
  and the clock timers are all in memory, so running two copies behind a load
  balancer would split the state. Scaling out needs Redis pub/sub or sticky
  routing by game id.
- **Testing** — 152 tests over the engine, the clock maths, the game lock and
  the socket protocol, including its race conditions. There are no browser
  tests by choice; [TESTING.md](TESTING.md) has the manual checklist that
  covers the React layer instead.
- **What's left** — [TODO.md](TODO.md).
