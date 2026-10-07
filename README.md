# Chess

Real-time multiplayer chess: two players, one invite link, server-authoritative
rules and clocks.

- **Play**: click or drag, legal-move hints, promotion picker, move sounds and
  animation, keyboard navigation.
- **Clocks**: 1+0 to 10+0 with Fischer increment, reconciled with the server on
  every move.
- **Between players**: resign, draw offers, pause, rematch, and a private chat.
- **Review**: step through finished games, export PGN, fork from any position.
- **Guests**: play without signing up, and upgrade to an account later.

The server enforces every rule. The client runs the same engine
(`packages/game-core`) to offer legal moves, and rolls back any move the server
refuses.

## Layout

| Path                 |                                                            |
| -------------------- | ---------------------------------------------------------- |
| `apps/web`           | Next.js client                                             |
| `apps/server`        | Express + `ws`: REST API, game protocol, clocks            |
| `packages/game-core` | Rules over `chess.js`, socket message types, time controls |
| `packages/db`        | Prisma schema and migrations                               |
| `packages/auth`      | Better Auth (guest, username/password)                     |

## Running it

Needs [Bun](https://bun.sh) and PostgreSQL.

```bash
bun install
cp .env.example .env    # fill it in; each variable is documented there
createdb chess
cd packages/db && bun run db:deploy && cd -
bun run dev             # web on :3000, server on :8001
```

From the root: `build`, `test`, `lint`, `check-types` and `format`. Database
commands (`db:migrate`, `db:deploy`, `db:studio`) run from `packages/db`. Test
setup and the manual browser checklist are in [TESTING.md](TESTING.md).

## Notes

- **Single instance only.** Rooms, sessions, clocks and chat limits live in
  memory, so two copies behind a load balancer would split the state.
- What's left: [TODO.md](TODO.md).
