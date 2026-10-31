import Link from "next/link";

import { CreateGameButton } from "@/components/game/create-game-button";
import { BoardPreview } from "@/components/landing/board-preview";
import { FooterNav } from "@/components/landing/footer-nav";
import { TimeControlGrid } from "@/components/landing/time-control-grid";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "One link, one opponent",
    body: "Create a game and send the URL. The game starts the moment they take the empty seat. Anyone else who opens it watches.",
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

const PRIMARY_CTA = "h-11 px-5 text-sm font-semibold";

export default function Home() {
  return (
    <div className="min-h-svh">
      <SiteHeader />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[32rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          <div className="rise mx-auto w-full max-w-md min-w-0 [--i:3] max-lg:order-2 lg:max-w-none">
            <BoardPreview />
          </div>

          <div className="min-w-0">
            <h1 className="text-display-md sm:text-display-lg lg:text-display-xl rise min-w-0 break-words">
              Send a link.
              <br />
              Play a game.
            </h1>

            <p className="text-title-md text-body rise mt-6 max-w-sm font-normal [--i:1]">
              Pick a clock, share the invite, and play in the browser.
            </p>

            <div className="rise mt-10 flex flex-wrap items-center gap-3 [--i:2]">
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
          </div>
        </section>

        <section className="border-hairline bg-surface-soft border-y">
          <div className="mx-auto max-w-6xl px-6 py-section">
            <h2 className="text-display-md sm:text-display-xl reveal max-w-4xl">
              The server is the referee.
            </h2>

            <div className="mt-16 grid gap-12 lg:grid-cols-12">
              <p className="text-body-md max-w-sm lg:col-span-4">
                Your board only offers legal moves, but it never decides. Each
                move goes to the server, which checks it against the rules and
                the clock before your opponent sees it. A move it refuses is
                taken back.
              </p>

              <figure className="reveal border-hairline bg-card min-w-0 overflow-hidden rounded-xl border lg:col-span-8">
                <figcaption className="border-hairline text-caption text-muted-foreground flex items-center justify-between border-b px-6 py-3">
                  <span>WebSocket</span>
                  <span>1. e4 e5 2. Nf3</span>
                </figcaption>
                <div className="overflow-x-auto p-6">
                  <ol className="min-w-max space-y-3 font-mono text-sm leading-[1.55]">
                    {EXCHANGE.map((row, i) => (
                      <li key={i} className="flex gap-4">
                        <span className="text-muted-foreground w-12 shrink-0">
                          {row.from}
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
              </figure>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-section">
          <div className="mb-12 grid gap-4 lg:grid-cols-12 lg:items-end">
            <h2 className="text-display-sm sm:text-display-lg lg:col-span-6">
              Pick a clock.
            </h2>
            <p className="text-body-md max-w-sm lg:col-span-4 lg:col-start-9">
              Fischer increment where it says so. One click creates the game and
              hands you the invite link.
            </p>
          </div>

          <div className="reveal">
            <TimeControlGrid />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-section">
          <ul className="reveal grid gap-10 md:grid-cols-3 md:gap-0">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="border-hairline md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
              >
                <h3 className="text-title-lg">{feature.title}</h3>
                <p className="text-body-md text-muted-foreground mt-4">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-primary text-on-yellow">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-section md:grid-cols-12 md:items-end">
            <h2 className="text-on-yellow reveal text-[clamp(4rem,11vw,9rem)] leading-[0.95] font-bold tracking-[-0.04em] md:col-span-7">
              Your move.
            </h2>

            <div className="space-y-6 md:col-span-5 md:pb-3">
              <p className="text-title-md font-normal">
                No sign-up, no download. A board and a link.
              </p>
              <div className="flex flex-wrap items-center gap-5">
                <CreateGameButton
                  label="Start a game"
                  align="end"
                  className={`${PRIMARY_CTA} bg-on-yellow text-primary hover:bg-on-yellow/85 focus-visible:ring-on-yellow focus-visible:ring-offset-primary focus-visible:ring-offset-2`}
                />
                <Link
                  href="/lobby"
                  className="focus-visible:outline-on-yellow text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  or join a waiting game
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="text-body-sm text-muted-foreground mx-auto max-w-6xl px-6 py-16">
          <p className="text-foreground text-display-lg sm:text-display-xl">
            Chess
          </p>
          <div className="border-hairline mt-10 flex flex-col gap-6 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p>Real-time multiplayer chess.</p>
            <FooterNav />
          </div>
        </div>
      </footer>
    </div>
  );
}
