import { TIME_CONTROL_KEYS } from "@repo/game-core";
import Link from "next/link";

import { CreateGameButton } from "@/components/game/create-game-button";
import { BoardPreview } from "@/components/landing/board-preview";
import { TimeControlGrid } from "@/components/landing/time-control-grid";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const STATS = [
  {
    value: String(TIME_CONTROL_KEYS.length),
    label: "time controls, bullet to rapid",
  },
  { value: "1", label: "link to invite an opponent" },
  { value: "0", label: "accounts needed to play" },
];

const FEATURES = [
  {
    title: "One link, one opponent",
    body: "Create a game and send the URL. The game starts the moment they take the empty seat — anyone else who opens it watches.",
  },
  {
    title: "Play first, sign up later",
    body: "You play as a guest with no form to fill in. Create an account whenever you like and every game you have played comes with you.",
  },
  {
    title: "A dropped connection is not a loss",
    body: "The board reconnects on its own. Your opponent only claims the game if you stay away past a grace period.",
  },
];

const EXCHANGE = [
  {
    from: "you",
    line: '{ "type": "game:move", "data": { "from": "g1", "to": "f3" } }',
  },
  {
    from: "server",
    line: '{ "type": "game:move", "data": { "san": "Nf3", "fen": "…" } }',
  },
  {
    from: "server",
    line: '{ "type": "game:state", "data": { "turn": "black", … } }',
  },
];

const PRIMARY_CTA = "h-10 px-5 text-sm font-semibold";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-caption-upper text-muted-foreground mb-4 uppercase">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:py-section">
          <div className="lg:col-span-7">
            <SectionLabel>Real-time multiplayer chess</SectionLabel>

            <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-1.5px] text-balance sm:text-display-lg lg:text-display-xl">
              Send a link.
              <br />
              Play a game.
            </h1>

            <p className="text-title-md text-body mt-6 max-w-xl font-normal">
              Pick a clock, share the invite, and play in the browser. Every
              move and every second is checked by the server, so the game on
              your screen is the game on theirs.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CreateGameButton
                label="Start a game"
                align="start"
                className={PRIMARY_CTA}
              />
              <Button
                variant="secondary"
                nativeButton={false}
                render={<Link href="/lobby" />}
                className={PRIMARY_CTA}
              >
                Browse open games
              </Button>
            </div>

            <dl className="border-hairline mt-12 grid grid-cols-3 gap-6 border-t pt-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse gap-2">
                  <dt className="text-body-sm text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="text-stat text-foreground dark:text-primary">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
            <BoardPreview />
          </div>
        </section>

        <section className="border-hairline bg-surface-soft border-y">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-section">
            <div className="mb-12 max-w-2xl">
              <SectionLabel>Time controls</SectionLabel>
              <h2 className="text-display-sm sm:text-display-lg">
                Pick a clock.
              </h2>
              <p className="text-body-md mt-4">
                Fischer increment where it says so. One click creates the game
                and hands you the invite link.
              </p>
            </div>

            <TimeControlGrid />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 lg:py-section">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionLabel>How it works</SectionLabel>
              <h2 className="text-display-sm sm:text-display-md">
                The server is the referee.
              </h2>
              <p className="text-body-md mt-4">
                Your board only offers legal moves, but it never decides. Each
                move goes to the server, which checks it against the rules and
                the clock before your opponent sees it. A move it refuses is
                taken back.
              </p>
            </div>

            <div className="border-hairline bg-card overflow-hidden rounded-xl border lg:col-span-7">
              <div className="border-hairline text-caption text-muted-foreground flex items-center justify-between border-b px-6 py-3">
                <span className="font-mono">WebSocket</span>
                <span>1. e4 e5 2. Nf3</span>
              </div>
              <div className="overflow-x-auto p-6">
                <ol className="min-w-max space-y-3 font-mono text-sm leading-[1.55]">
                  {EXCHANGE.map((row, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="text-muted-soft w-14 shrink-0 text-right">
                        {row.from === "you" ? "you →" : "← srv"}
                      </span>
                      <code
                        className={
                          row.from === "you" ? "text-foreground" : "text-body"
                        }
                      >
                        {row.line}
                      </code>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <ul className="mt-16 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="border-hairline bg-card rounded-xl border p-8"
              >
                <h3 className="text-title-md">{feature.title}</h3>
                <p className="text-body-sm text-muted-foreground mt-3">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16 lg:pb-section">
          <div className="bg-primary text-on-yellow flex flex-col items-start gap-8 rounded-xl p-8 sm:p-16 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-display-sm sm:text-display-md text-on-yellow">
                Your move.
              </h2>
              <p className="text-title-md mt-3 font-normal">
                No sign-up, no download. A board and a link.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <CreateGameButton
                label="Start a game"
                align="end"
                className={`${PRIMARY_CTA} bg-on-yellow hover:bg-on-yellow/85 text-white`}
              />
              <Link
                href="/lobby"
                className="text-sm font-semibold underline underline-offset-4"
              >
                or join a waiting game
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-hairline border-t">
        <div className="text-body-sm text-muted-foreground mx-auto flex max-w-6xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-title-sm text-foreground">Chess</p>
            <p>Real-time multiplayer chess.</p>
          </div>

          <nav className="flex gap-6">
            <Link
              href="/lobby"
              className="hover:text-foreground transition-colors"
            >
              Lobby
            </Link>
            <Link
              href="/login"
              className="hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="hover:text-foreground transition-colors"
            >
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
